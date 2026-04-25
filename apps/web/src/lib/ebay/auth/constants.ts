import type { EbayEnvironment } from "../types";

export const OAUTH_TOKEN_ENDPOINTS: Record<EbayEnvironment, string> = {
  sandbox: "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
  production: "https://api.ebay.com/identity/v1/oauth2/token",
};

export const OAUTH_CONSENT_ENDPOINTS: Record<EbayEnvironment, string> = {
  sandbox: "https://auth.sandbox.ebay.com/oauth2/authorize",
  production: "https://auth.ebay.com/oauth2/authorize",
};

export const TRADING_API_ENDPOINTS: Record<EbayEnvironment, string> = {
  sandbox: "https://api.sandbox.ebay.com/ws/api.dll",
  production: "https://api.ebay.com/ws/api.dll",
};

export const TRADING_API_COMPATIBILITY_LEVEL = "1227";
export const TRADING_API_SITE_ID = "0";

export const TRADING_API_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
] as const;

/** Refresh the access token this many ms before its stated expiry */
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1_000;
