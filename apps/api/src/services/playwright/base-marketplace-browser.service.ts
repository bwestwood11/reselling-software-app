import type { BrowserContext, Page } from "playwright";
import type { MarketplaceConnection, MarketplaceType, PrismaClient } from "@repo/db";
import { browserManager } from "./browser-manager";
import { applyStealth, pickFingerprint } from "./stealth";

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

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
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
    const fingerprint = pickFingerprint(`${userId}:${this.marketplace}`);

    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezoneId,
      proxy: this.getProxyConfig(),
    });

    await applyStealth(context, fingerprint);
    await this.restoreSession(context, connection);

    try {
      const page = await context.newPage();
      return await fn(page, context);
    } finally {
      await this.persistSession(context, userId);
      await context.close();
    }
  }

  private getProxyConfig(): ProxyConfig | undefined {
    const server = process.env[`${this.marketplace}_PROXY_SERVER`];
    if (!server) return undefined;

    return {
      server,
      username: process.env[`${this.marketplace}_PROXY_USERNAME`] || undefined,
      password: process.env[`${this.marketplace}_PROXY_PASSWORD`] || undefined,
    };
  }

  private async restoreSession(
    context: BrowserContext,
    connection: MarketplaceConnection | null
  ): Promise<void> {
    if (!connection?.sessionCookies) return;

    try {
      const cookies = JSON.parse(connection.sessionCookies) as Parameters<
        BrowserContext["addCookies"]
      >[0];
      await context.addCookies(cookies);
    } catch {
      // Malformed cookie JSON — proceed without; assertLoggedIn will surface the failure.
    }
  }

  private async persistSession(context: BrowserContext, userId: string): Promise<void> {
    const cookies = await context.cookies();

    // updateMany is a deliberate no-op when performLogin hasn't created the
    // connection row yet (first-ever login mid-flight) — nothing to attach cookies to.
    await this.db.marketplaceConnection.updateMany({
      where: { userId, marketplace: this.marketplace },
      data: { sessionCookies: JSON.stringify(cookies) },
    });
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
