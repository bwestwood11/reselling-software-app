// Server-side Mercari publishing over a residential proxy — the "no extension required" path.
//
// Cost-optimised hybrid (see the pricing plan):
//   1. Photos are downloaded from our own storage DIRECTLY, compressed to ~150 KB, then uploaded
//      to Mercari (uploadTempListingPhotos). That endpoint is US-region-gated but NOT behind
//      Cloudflare, so a plain HTTP request through the user's sticky US residential IP should
//      work. MERCARI_UPLOAD_DIRECT=true skips the proxy for uploads ("option B") — only turn it on
//      if scripts/proxy/mercari-upload-test.ts shows a direct upload from the server succeeds.
//   2. createListing / delist are GraphQL calls behind Cloudflare's managed challenge. We first
//      try plain HTTP through the same sticky IP, presenting the Cloudflare clearance cookies a
//      previous browser run earned (cf_clearance is bound to IP + User-Agent, which is why both
//      are kept stable per user). Only when Cloudflare challenges do we fall back to a real
//      headless browser on that same IP, which solves the challenge, makes the call from inside
//      the page, and saves the fresh clearance for next time. Images/fonts/trackers are blocked
//      in that browser to keep its bandwidth down.
//
// Auth is the user's Mercari Bearer token + CSRF token stored on the MarketplaceConnection by the
// extension's connect-token flow. (An in-app Mercari login that removes the extension from
// onboarding entirely is the next phase.)
//
// Enabled only when BOTH the Bright Data env vars and MERCARI_SERVER_PUBLISH=true are set.

import type { MarketplaceConnection, MarketplaceType, PrismaClient } from "@repo/db";
import type { Page as PlaywrightPage } from "playwright";
import {
  BaseMarketplaceBrowserService,
  CaptchaChallengeError,
  type MarketplaceCredentials,
} from "../playwright/base-marketplace-browser.service";
import { isResidentialProxyConfigured } from "../proxy/residential-proxy";
import {
  ProxyFormData,
  isCloudflareChallenge,
  proxiedFetch,
  type ProxiedFetchContext,
} from "../proxy/proxy-fetch";
import { recordProxyUsage } from "../proxy/proxy-usage.service";
import {
  ImageDownloadError,
  downloadAndPrepareImage,
  type PreparedImage,
} from "../images/marketplace-image";
import {
  MERCARI_API,
  MERCARI_ORIGIN,
  buildCreateListingBody,
  buildDelistBody,
  deliveryAddressesUrl,
  graphqlError,
  mercariHeaders,
  parseUploadId,
  uploadPhotoOperations,
  type MercariPublishPayload,
  type MercariSession,
} from "./mercari-graphql";

const MARKETPLACE: MarketplaceType = "MERCARI";

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

// ── Browser fallback (Cloudflare) ────────────────────────────────────────────────────────

/**
 * Headless browser on the user's sticky residential IP, used only when Cloudflare challenges a
 * plain request. Its cookies (notably cf_clearance) are stored in the connection's
 * `metadata.serverCookies` — NOT `sessionCookies`, which holds the user's own browser cookies
 * captured by the extension and must not be clobbered.
 */
class MercariCloudflareBrowser extends BaseMarketplaceBrowserService {
  protected readonly marketplace: MarketplaceType = MARKETPLACE;
  protected readonly baseUrl = MERCARI_ORIGIN;

  userAgentFor(userId: string): string {
    return this.fingerprintFor(userId).userAgent;
  }

  protected override loadCookies(connection: MarketplaceConnection | null): string | null {
    const cookies = parseMeta(connection?.metadata).serverCookies;
    return Array.isArray(cookies) ? JSON.stringify(cookies) : null;
  }

  protected override async saveCookies(userId: string, cookiesJson: string): Promise<void> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      select: { metadata: true },
    });
    if (!connection) return;
    const meta = parseMeta(connection.metadata);
    await this.db.marketplaceConnection.update({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      data: { metadata: { ...meta, serverCookies: JSON.parse(cookiesJson) } as any },
    });
  }

  /** Make one GraphQL call from inside a mercari.com page, after clearing Cloudflare. */
  async graphqlInPage(
    userId: string,
    session: MercariSession,
    request: { method: "GET" | "POST"; url: string; body?: unknown }
  ): Promise<{ status: number; data: unknown }> {
    return this.withPage(userId, async (page) => {
      // The page is only a same-origin vantage point for one fetch() — Mercari's own JS/CSS
      // bundles (most of its weight) are never needed, so skip them. Cloudflare's challenge
      // scripts (/cdn-cgi/, challenges.cloudflare.com) must still load or nothing clears.
      await page.route("**/*", (route) => {
        const req = route.request();
        const isPageAsset = req.resourceType() === "script" || req.resourceType() === "stylesheet";
        if (isPageAsset && !/\/cdn-cgi\/|challenges\.cloudflare\.com/.test(req.url())) {
          return route.abort();
        }
        return route.fallback();
      });

      await page.goto(`${MERCARI_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForCloudflare(page);

      // The browser supplies User-Agent/Origin/Referer itself (they're forbidden fetch headers).
      const headers = mercariHeaders(session, { json: true });
      delete headers["User-Agent"];
      delete headers.Origin;
      delete headers.Referer;

      const res = await this.runFetch(page, request.url, {
        method: request.method,
        headers,
        body: request.body,
      });
      return { status: res.status, data: res.data };
    });
  }

  protected async performLogin(
    _page: PlaywrightPage,
    _credentials: MarketplaceCredentials,
    _userId: string
  ): Promise<void> {
    throw new Error("Mercari server login is not implemented yet — connect via the extension");
  }

  protected async assertLoggedIn(_page: PlaywrightPage): Promise<void> {
    // Auth is the Bearer token, not cookies — nothing to assert on the page.
  }
}

async function waitForCloudflare(page: PlaywrightPage, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const title = await page.title().catch(() => "");
    const challenged =
      /Just a moment|Attention Required|Checking your browser/i.test(title) ||
      (await page.locator("#challenge-form, #challenge-stage, iframe[src*='challenges.cloudflare.com']").count()) > 0;
    if (!challenged) return;
    await page.waitForTimeout(1_000);
  }
  throw new CaptchaChallengeError(
    "Cloudflare challenge on mercari.com did not clear from the residential IP"
  );
}

/**
 * A failure that retrying cannot fix — bad input, an expired Mercari token, or Mercari explicitly
 * rejecting the request. The worker fails the job at once instead of retrying, because every
 * retry re-uploads the photos through the paid proxy.
 */
export class PermanentMercariError extends Error {}

// ── Cloudflare decision cache ────────────────────────────────────────────────────────────

// Users whose plain-HTTP GraphQL was challenged EVEN WITH a clearance cookie — the cookie isn't
// carrying over to plain HTTP for them, so retrying HTTP first only wastes a round trip until the
// entry expires. A challenge without a cookie isn't cached: the browser run earns one, and the
// next call should get the chance to use it over cheap HTTP. In-memory, so it assumes a single
// API instance (like the proxy agents in residential-proxy.ts).
const CF_CHALLENGE_TTL_MS = Number(process.env.MERCARI_CF_CHALLENGE_TTL_MS ?? 30 * 60_000);
const MAX_CF_ENTRIES = 5_000;
const cfChallengedUntil = new Map<string, number>();

function isCfChallengeCached(userId: string): boolean {
  const until = cfChallengedUntil.get(userId);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  cfChallengedUntil.delete(userId);
  return false;
}

function cacheCfChallenge(userId: string): void {
  if (CF_CHALLENGE_TTL_MS <= 0) return;
  if (cfChallengedUntil.size >= MAX_CF_ENTRIES) {
    const oldestKey = cfChallengedUntil.keys().next().value;
    if (oldestKey) cfChallengedUntil.delete(oldestKey);
  }
  cfChallengedUntil.set(userId, Date.now() + CF_CHALLENGE_TTL_MS);
}

// ── Service ──────────────────────────────────────────────────────────────────────────────

export interface MercariPublishResult {
  externalId: string;
  photoBytesOriginal: number;
  photoBytesUploaded: number;
  usedBrowser: boolean;
}

export class MercariServerService {
  private readonly browser: MercariCloudflareBrowser;

  constructor(private readonly db: PrismaClient) {
    this.browser = new MercariCloudflareBrowser(db);
  }

  /** Server-side publishing is on only when Bright Data is configured AND explicitly enabled. */
  static isEnabled(): boolean {
    return isResidentialProxyConfigured() && process.env.MERCARI_SERVER_PUBLISH === "true";
  }

  private ctx(userId: string): ProxiedFetchContext {
    return { db: this.db, userId, marketplace: MARKETPLACE };
  }

  async getSession(userId: string): Promise<MercariSession> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      select: { accessToken: true, metadata: true, isActive: true },
    });
    if (!connection?.isActive || !connection.accessToken) {
      throw new PermanentMercariError("Mercari account not connected");
    }
    const meta = parseMeta(connection.metadata);
    return {
      accessToken: connection.accessToken,
      csrfToken: typeof meta.csrfToken === "string" ? meta.csrfToken : null,
    };
  }

  /** Cookie header from the clearance cookies a previous browser run stored. */
  private async clearanceCookieHeader(userId: string): Promise<string | null> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      select: { metadata: true },
    });
    const cookies = parseMeta(connection?.metadata).serverCookies;
    if (!Array.isArray(cookies)) return null;
    const now = Date.now() / 1000;
    const pairs = (cookies as Array<{ name?: string; value?: string; domain?: string; expires?: number }>)
      .filter(
        (c) =>
          c?.name &&
          typeof c.value === "string" &&
          typeof c.domain === "string" &&
          c.domain.replace(/^\./, "").endsWith("mercari.com") &&
          (!c.expires || c.expires < 0 || c.expires > now)
      )
      .map((c) => `${c.name}=${c.value}`);
    return pairs.length ? pairs.join("; ") : null;
  }

  // ── Photos ────────────────────────────────────────────────────────────────────────────

  async uploadPhotos(
    userId: string,
    session: MercariSession,
    imageUrls: string[],
    opts: { direct?: boolean } = {}
  ): Promise<{ ids: string[]; originalBytes: number; uploadedBytes: number }> {
    // Download + compress every photo before uploading any: downloads are direct (free), so a
    // broken photo URL fails the job before a single byte has gone through the proxy.
    const images: PreparedImage[] = [];
    for (const url of imageUrls) {
      try {
        images.push(await downloadAndPrepareImage(url));
      } catch (err) {
        if (err instanceof ImageDownloadError && err.status >= 400 && err.status < 500) {
          throw new PermanentMercariError(err.message);
        }
        throw err;
      }
    }

    const ids: string[] = [];
    let originalBytes = 0;
    let uploadedBytes = 0;
    for (const image of images) {
      originalBytes += image.originalBytes;
      uploadedBytes += image.bytes;
      ids.push(await this.uploadPreparedPhoto(userId, session, image, opts));
    }

    return { ids, originalBytes, uploadedBytes };
  }

  /**
   * Upload one already-compressed photo; returns Mercari's temporary upload id. Uploading a temp
   * photo creates nothing visible on the account, which is why the diagnostics use it.
   */
  async uploadPreparedPhoto(
    userId: string,
    session: MercariSession,
    image: PreparedImage,
    opts: { direct?: boolean } = {}
  ): Promise<string> {
    const direct = opts.direct ?? process.env.MERCARI_UPLOAD_DIRECT === "true";
    const mode = direct ? "direct" : "proxied";

    const form = new ProxyFormData();
    form.append("operations", uploadPhotoOperations());
    form.append("map", JSON.stringify({ "1": ["variables.input.photos.0"] }));
    form.append("1", new Blob([new Uint8Array(image.buffer)], { type: image.contentType }), "photo.jpg");

    const res = await proxiedFetch(this.ctx(userId), MERCARI_API, {
      method: "POST",
      headers: mercariHeaders(session, { json: false, userAgent: this.browser.userAgentFor(userId) }),
      body: form,
      direct,
    });

    if (isCloudflareChallenge(res)) {
      throw new Error(`Mercari photo upload was Cloudflare-challenged (${mode})`);
    }
    const data = res.json();
    if (!res.ok) {
      // 401 = the stored Mercari token has expired; only reconnecting fixes it.
      const ErrorType = res.status === 401 ? PermanentMercariError : Error;
      throw new ErrorType(
        `Mercari photo upload HTTP ${res.status} (${mode}): ` +
          res.text().replace(/\s+/g, " ").slice(0, 200)
      );
    }
    const err = graphqlError(data);
    if (err) throw new PermanentMercariError(`Mercari photo upload error (${mode}): ${err}`);
    const id = parseUploadId(data);
    if (!id) throw new Error(`Mercari returned no upload id (${mode})`);
    return id;
  }

  // ── GraphQL (HTTP first, browser on Cloudflare challenge) ───────────────────────────

  async graphql(
    userId: string,
    session: MercariSession,
    request: { method: "GET" | "POST"; url: string; body?: unknown }
  ): Promise<{ data: unknown; usedBrowser: boolean }> {
    if (isCfChallengeCached(userId)) {
      console.log(`[mercari-server] Cloudflare challenge cached for ${userId} — using browser`);
    } else {
      const cookie = await this.clearanceCookieHeader(userId);
      const headers = mercariHeaders(session, {
        json: request.method === "POST",
        userAgent: this.browser.userAgentFor(userId),
      });
      if (cookie) headers.Cookie = cookie;

      const res = await proxiedFetch(this.ctx(userId), request.url, {
        method: request.method,
        headers,
        body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      });

      if (!isCloudflareChallenge(res)) {
        const data = res.json();
        if (data === null) {
          throw new Error(
            `Mercari returned non-JSON (HTTP ${res.status}): ${res.text().replace(/\s+/g, " ").slice(0, 200)}`
          );
        }
        return { data, usedBrowser: false };
      }

      if (cookie) cacheCfChallenge(userId);
      console.log(`[mercari-server] Cloudflare challenged HTTP for ${userId} — using browser`);
    }

    const viaBrowser = await this.browser.graphqlInPage(userId, session, request);
    if (viaBrowser.data === null || typeof viaBrowser.data === "string") {
      throw new Error(
        `Mercari (browser) returned non-JSON (HTTP ${viaBrowser.status}): ` +
          String(viaBrowser.data ?? "").replace(/\s+/g, " ").slice(0, 200)
      );
    }
    return { data: viaBrowser.data, usedBrowser: true };
  }

  // ── Public operations ─────────────────────────────────────────────────────────────────

  async publish(userId: string, payload: MercariPublishPayload): Promise<MercariPublishResult> {
    if (!payload.categoryId) {
      throw new PermanentMercariError("categoryId is required for Mercari listings");
    }
    const images = payload.images ?? [];
    if (images.length === 0) throw new PermanentMercariError("At least one photo is required");

    const session = await this.getSession(userId);
    const photos = await this.uploadPhotos(userId, session, images.slice(0, 12));

    const { data, usedBrowser } = await this.graphql(userId, session, {
      method: "POST",
      url: MERCARI_API,
      body: buildCreateListingBody(payload, photos.ids),
    });
    const err = graphqlError(data);
    if (err) throw new PermanentMercariError(`Mercari rejected createListing: ${err}`);

    const id = (data as { data?: { createListing?: { id?: unknown } } })?.data?.createListing?.id;
    if (id == null) throw new Error("Mercari createListing returned no listing id");

    await recordProxyUsage(this.db, userId, MARKETPLACE, { crossPosts: 1 });

    return {
      externalId: String(id),
      photoBytesOriginal: photos.originalBytes,
      photoBytesUploaded: photos.uploadedBytes,
      usedBrowser,
    };
  }

  /** Take a listing off sale. Idempotent on Mercari's side (re-cancelling still returns OK). */
  async delist(userId: string, externalId: string): Promise<void> {
    const session = await this.getSession(userId);
    const { data } = await this.graphql(userId, session, {
      method: "POST",
      url: MERCARI_API,
      body: buildDelistBody(externalId),
    });
    const err = graphqlError(data);
    if (err) throw new PermanentMercariError(`Mercari delist failed: ${err}`);
    const status = (data as { data?: { updateItemStatus?: { status?: string } } })?.data
      ?.updateItemStatus?.status;
    if (status !== "OK") throw new Error(`Mercari delist returned status ${status ?? "none"}`);
  }

  /** Harmless authenticated read — used by the test scripts to exercise the whole path. */
  async fetchDeliveryAddresses(userId: string): Promise<{ addresses: unknown[]; usedBrowser: boolean }> {
    const session = await this.getSession(userId);
    const { data, usedBrowser } = await this.graphql(userId, session, {
      method: "GET",
      url: deliveryAddressesUrl(),
    });
    const err = graphqlError(data);
    if (err) throw new Error(`Mercari DeliveryAddresses error: ${err}`);
    const addresses =
      (data as { data?: { deliveryAddresses?: unknown[] } })?.data?.deliveryAddresses ?? [];
    return { addresses, usedBrowser };
  }
}

