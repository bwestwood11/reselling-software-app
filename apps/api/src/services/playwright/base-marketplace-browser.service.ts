import type { BrowserContext, Page } from "playwright";
import type { MarketplaceConnection, MarketplaceType, PrismaClient } from "@repo/db";
import { browserManager } from "./browser-manager";
import { applyStealth, pickFingerprint } from "./stealth";
import { getPlaywrightProxy, proxyIgnoresTlsErrors } from "../proxy/residential-proxy";
import { recordProxyUsage } from "../proxy/proxy-usage.service";

/** Resource types never needed for an automated flow — skipping them saves proxy bandwidth. */
const BLOCKED_RESOURCE_TYPES = new Set(["image", "media", "font"]);
/** Analytics/ads/telemetry hosts — pure bandwidth cost, no functional value to automation. */
const BLOCKED_HOSTS =
  /(google-analytics|googletagmanager|doubleclick|googlesyndication|facebook\.net|connect\.facebook|hotjar|segment\.(io|com)|amplitude|branch\.io|braze|optimizely|datadoghq|browser-intake|sentry\.io|newrelic|nr-data|tiktok|pinterest|snapchat|bing\.com\/bat|criteo|taboola|outbrain|clarity\.ms|fullstory|mixpanel|intercom)/i;

export interface MarketplaceCredentials {
  email?: string;
  password?: string;
  [key: string]: unknown;
}

export interface BrowserFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

export interface BrowserFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  data: T;
}

/**
 * Thrown when the site shows a CAPTCHA/bot-challenge (reCAPTCHA, hCaptcha, Cloudflare
 * Turnstile, ...) that automation has no legitimate way to solve. Callers should catch
 * this specifically and fall back to a human-in-the-loop flow rather than retrying —
 * retrying a failed challenge just burns proxy bandwidth and account trust score.
 */
export class CaptchaChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaChallengeError";
  }
}

/**
 * Base class for driving a marketplace website through a real (headless) browser
 * instead of hitting its API directly. Every marketplace-specific adapter extends
 * this and only implements `performLogin` / `assertLoggedIn` plus whatever
 * marketplace actions it needs — session lifecycle, cookie persistence, proxying,
 * and bot-detection countermeasures all live here so they're not reimplemented
 * per marketplace.
 *
 * Subclass contract: `performLogin` must upsert the `MarketplaceConnection` row
 * for (userId, marketplace) — accessToken/accountId/accountName — before it
 * returns. Session cookies are persisted automatically once it does.
 */
export abstract class BaseMarketplaceBrowserService {
  protected abstract readonly marketplace: MarketplaceType;
  protected abstract readonly baseUrl: string;

  constructor(protected readonly db: PrismaClient) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Runs the marketplace's login flow in a real browser and persists the session. */
  async login(userId: string, credentials: MarketplaceCredentials): Promise<void> {
    await this.withSession(userId, async (page) => {
      await this.performLogin(page, credentials, userId);
      await this.assertLoggedIn(page);
    });
  }

  /**
   * Runs `fetch(...)` from inside the marketplace's own page context — same
   * cookies, same TLS/JS fingerprint, same origin, so it's indistinguishable
   * from a request the site's own frontend would make.
   */
  async fetchJson<T = unknown>(
    userId: string,
    path: string,
    options: BrowserFetchOptions = {}
  ): Promise<BrowserFetchResult<T>> {
    return this.withSession(userId, (page) => this.runFetch<T>(page, path, options));
  }

  /**
   * Runs arbitrary JS in the page and returns the (structured-clone-safe) result.
   * Mirrors Playwright's own `page.evaluate(fn, arg)` shape — pass one serializable
   * `arg` and destructure inside `fn` if you need more than one value.
   */
  async runScript<T, Arg = undefined>(
    userId: string,
    fn: (arg: Arg) => T | Promise<T>,
    arg?: Arg
  ): Promise<T> {
    // Playwright's PageFunction<Arg, T> type unifies badly with an unconstrained
    // generic Arg here — the runtime behavior (structured-clone the arg, call fn
    // in-page) is exactly page.evaluate's, so the cast is safe.
    return this.withSession(userId, (page) =>
      page.evaluate(fn as (arg: unknown) => T | Promise<T>, arg)
    );
  }

  /** Escape hatch for callers that need direct Playwright `page`/`context` access. */
  async withPage<T>(
    userId: string,
    fn: (page: Page, context: BrowserContext) => Promise<T>
  ): Promise<T> {
    return this.withSession(userId, fn);
  }

  // ── Session lifecycle ────────────────────────────────────────────────────

  protected async withSession<T>(
    userId: string,
    fn: (page: Page, context: BrowserContext) => Promise<T>
  ): Promise<T> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: this.marketplace } },
    });

    const browser = await browserManager.getBrowser();
    const fingerprint = this.fingerprintFor(userId);
    // Same user + marketplace → same sticky residential IP on every run (see residential-proxy.ts).
    const proxy = getPlaywrightProxy({ userId, marketplace: this.marketplace });

    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezoneId,
      proxy,
      ...(proxy && proxyIgnoresTlsErrors() ? { ignoreHTTPSErrors: true } : {}),
    });

    await applyStealth(context, fingerprint);
    const meter = proxy ? await this.meterAndTrim(context) : null;
    await this.restoreSession(context, connection);

    try {
      const page = await context.newPage();
      return await fn(page, context);
    } finally {
      await this.persistSession(context, userId);
      await context.close();
      if (meter) {
        await recordProxyUsage(this.db, userId, this.marketplace, {
          bytes: meter.bytes,
          requests: meter.requests,
        });
      }
    }
  }

  /** The stable browser fingerprint for this user — exposed so direct HTTP can match its UA. */
  protected fingerprintFor(userId: string) {
    return pickFingerprint(`${userId}:${this.marketplace}`);
  }

  /**
   * Proxied contexts only: block images/fonts/media and tracker hosts (they are billed per byte
   * and an automated flow never needs them), and tally the bytes that do go through so they can
   * be recorded against the user. Set PROXY_BLOCK_ASSETS=false to disable blocking when debugging
   * a flow that misbehaves without them.
   */
  private async meterAndTrim(
    context: BrowserContext
  ): Promise<{ bytes: number; requests: number }> {
    const meter = { bytes: 0, requests: 0 };

    if (process.env.PROXY_BLOCK_ASSETS !== "false") {
      await context.route("**/*", (route) => {
        const req = route.request();
        if (BLOCKED_RESOURCE_TYPES.has(req.resourceType()) || BLOCKED_HOSTS.test(req.url())) {
          return route.abort();
        }
        return route.continue();
      });
    }

    context.on("requestfinished", (req) => {
      if (req.url().startsWith("data:")) return;
      void req
        .sizes()
        .then((s) => {
          meter.requests += 1;
          meter.bytes +=
            s.requestHeadersSize + s.requestBodySize + s.responseHeadersSize + s.responseBodySize;
        })
        .catch(() => {});
    });

    return meter;
  }

  /**
   * Where this marketplace's server-side browser cookies are kept. Default: the connection's
   * `sessionCookies` column. Override when that column already holds something else — e.g. the
   * extension stores the user's own browser cookies there for Mercari/Poshmark, which must never
   * be overwritten by the server browser's cookies.
   */
  protected loadCookies(connection: MarketplaceConnection | null): string | null {
    return connection?.sessionCookies ?? null;
  }

  protected async saveCookies(userId: string, cookiesJson: string): Promise<void> {
    // updateMany is a deliberate no-op when performLogin hasn't created the
    // connection row yet (first-ever login mid-flight) — nothing to attach cookies to.
    await this.db.marketplaceConnection.updateMany({
      where: { userId, marketplace: this.marketplace },
      data: { sessionCookies: cookiesJson },
    });
  }

  private async restoreSession(
    context: BrowserContext,
    connection: MarketplaceConnection | null
  ): Promise<void> {
    const raw = this.loadCookies(connection);
    if (!raw) return;

    try {
      const cookies = normalizeCookies(JSON.parse(raw));
      if (cookies.length) await context.addCookies(cookies);
    } catch {
      // Malformed cookie JSON — proceed without; assertLoggedIn will surface the failure.
    }
  }

  private async persistSession(context: BrowserContext, userId: string): Promise<void> {
    const cookies = await context.cookies();
    await this.saveCookies(userId, JSON.stringify(cookies));
  }

  // ── In-page fetch primitive ──────────────────────────────────────────────

  protected async runFetch<T = unknown>(
    page: Page,
    path: string,
    options: BrowserFetchOptions = {}
  ): Promise<BrowserFetchResult<T>> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;

    return page.evaluate<BrowserFetchResult<T>, { url: string; options: BrowserFetchOptions }>(
      async ({ url, options }) => {
        const res = await fetch(url, {
          method: options.method ?? "GET",
          headers: { "Content-Type": "application/json", ...options.headers },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          credentials: "include",
        });

        const headers: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const text = await res.text();
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        return { ok: res.ok, status: res.status, headers, data: data as T };
      },
      { url, options }
    );
  }

  // ── Human-like interaction helpers ───────────────────────────────────────

  protected async humanType(page: Page, selector: string, text: string): Promise<void> {
    const locator = page.locator(selector);
    await locator.click();
    await locator.pressSequentially(text, { delay: 40 + Math.random() * 90 });
  }

  protected async humanDelay(minMs = 200, maxMs = 800): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Hooks subclasses implement ───────────────────────────────────────────

  /**
   * Drives the marketplace's real login UI and upserts the `MarketplaceConnection`
   * row (accessToken/accountId/accountName) — cookies are persisted by the caller.
   */
  protected abstract performLogin(
    page: Page,
    credentials: MarketplaceCredentials,
    userId: string
  ): Promise<void>;

  /** Throws if `page` is not in an authenticated state. */
  protected abstract assertLoggedIn(page: Page): Promise<void>;
}

type PlaywrightCookie = Parameters<BrowserContext["addCookies"]>[0][number];

/**
 * Accept both Playwright cookies and Chrome-extension cookies (chrome.cookies.getAll shape:
 * `expirationDate`, `sameSite: "no_restriction" | "unspecified"`, extra fields) — Playwright's
 * addCookies rejects the whole batch if a single cookie has a field it doesn't recognise.
 */
function normalizeCookies(input: unknown): PlaywrightCookie[] {
  if (!Array.isArray(input)) return [];
  const out: PlaywrightCookie[] = [];
  for (const c of input as Array<Record<string, unknown>>) {
    if (typeof c?.name !== "string" || typeof c?.value !== "string") continue;
    if (typeof c.domain !== "string" || !c.domain) continue;

    const rawSameSite = String(c.sameSite ?? "").toLowerCase();
    const sameSite: PlaywrightCookie["sameSite"] =
      rawSameSite === "strict"
        ? "Strict"
        : rawSameSite === "lax"
          ? "Lax"
          : rawSameSite === "none" || rawSameSite === "no_restriction"
            ? "None"
            : undefined;
    const expires =
      typeof c.expires === "number"
        ? c.expires
        : typeof c.expirationDate === "number"
          ? c.expirationDate
          : undefined;

    out.push({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: typeof c.path === "string" ? c.path : "/",
      ...(expires && expires > 0 ? { expires } : {}),
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure) || sameSite === "None",
      ...(sameSite ? { sameSite } : {}),
    });
  }
  return out;
}
