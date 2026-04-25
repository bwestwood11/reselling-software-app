import type {
  EbayAuthConfig,
  EbayUserTokenResponse,
  EbayRefreshedTokenResponse,
  EbayOAuthError,
  CachedUserToken,
} from "../types";
import {
  OAUTH_TOKEN_ENDPOINTS,
  OAUTH_CONSENT_ENDPOINTS,
  TOKEN_EXPIRY_BUFFER_MS,
} from "./constants";

export class EbayAuthClient {
  private readonly config: EbayAuthConfig;
  private readonly tokenEndpoint: string;
  private readonly consentEndpoint: string;
  private cache = new Map<string, CachedUserToken>();

  constructor(config: EbayAuthConfig) {
    this.config = config;
    this.tokenEndpoint = OAUTH_TOKEN_ENDPOINTS[config.environment];
    this.consentEndpoint = OAUTH_CONSENT_ENDPOINTS[config.environment];
  }

  buildConsentUrl(state?: string, prompt?: "login"): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.ruName,
      response_type: "code",
      scope: this.config.scopes.join(" "),
    });

    if (state) params.set("state", state);
    if (prompt) params.set("prompt", prompt);

    return `${this.consentEndpoint}?${params.toString()}`;
  }

  async exchangeCodeForToken(authorizationCode: string): Promise<CachedUserToken> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: this.config.ruName,
    });

    const data = await this.post<EbayUserTokenResponse>(body);

    const cached: CachedUserToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      refreshToken: data.refresh_token,
      refreshTokenExpiresAt: Date.now() + data.refresh_token_expires_in * 1_000,
    };

    this.cache.set(data.refresh_token, cached);
    return cached;
  }

  async getAccessToken(refreshToken: string): Promise<string> {
    const cached = this.cache.get(refreshToken);

    if (cached && Date.now() < cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      return cached.accessToken;
    }

    return this.doRefresh(refreshToken, cached);
  }

  async forceRefresh(refreshToken: string): Promise<string> {
    this.cache.delete(refreshToken);
    return this.doRefresh(refreshToken, undefined);
  }

  private async doRefresh(
    refreshToken: string,
    existing: CachedUserToken | undefined,
  ): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: this.config.scopes.join(" "),
    });

    const data = await this.post<EbayRefreshedTokenResponse>(body);

    const updated: CachedUserToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1_000,
      refreshToken,
      refreshTokenExpiresAt: existing?.refreshTokenExpiresAt ?? Date.now(),
    };

    this.cache.set(refreshToken, updated);
    return data.access_token;
  }

  private async post<T>(body: URLSearchParams): Promise<T> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as Partial<EbayOAuthError>;
      throw new Error(
        `eBay OAuth error [${response.status}]: ${err.error ?? "unknown"} – ${err.error_description ?? response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
