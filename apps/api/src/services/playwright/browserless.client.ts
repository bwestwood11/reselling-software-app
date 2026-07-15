// Thin REST client for Browserless's /function API (https://docs.browserless.io/rest-apis/function).
// Replaces the self-hosted `browserManager` (apps/api/src/services/playwright/browser-manager.ts)
// for marketplaces that need Browserless's residential proxy / stealth / CAPTCHA-solving fleet
// instead of a datacenter-IP Chromium we run ourselves — see the memory note on Mercari's shipping
// endpoint 502ing from Cloudflare on Railway's datacenter IPs for why that matters here.

const REGION = process.env.BROWSERLESS_REGION || "production-sfo";
const BASE_URL = `https://${REGION}.browserless.io`;

export class BrowserlessError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "BrowserlessError";
  }
}

function apiKey(): string {
  const key = process.env.BROWSERLESS_API_KEY;
  if (!key) throw new BrowserlessError("BROWSERLESS_API_KEY is not set");
  return key;
}

export interface BrowserlessProxyOptions {
  /** Residential IPs are far more likely to clear Cloudflare/reCAPTCHA than datacenter IPs. */
  residential?: boolean;
  /** ISO 3166-1 alpha-2 country code, e.g. "us". */
  country?: string;
  /** Reuse the same proxy IP for the life of the request — keeps a login flow's IP consistent. */
  sticky?: boolean;
}

export interface BrowserlessFunctionOptions {
  /** Max time (ms) Browserless will let the function run before killing it. */
  timeout?: number;
  /** Routes the session through Browserless's anti-bot-detection Chrome fleet. */
  stealth?: boolean;
  proxy?: BrowserlessProxyOptions;
}

function applyProxyParams(params: URLSearchParams, proxy?: BrowserlessProxyOptions): void {
  if (!proxy?.residential) return;
  params.set("proxy", "residential");
  if (proxy.country) params.set("proxyCountry", proxy.country);
  if (proxy.sticky) params.set("proxySticky", "true");
}

function buildUrl(path: string, options: BrowserlessFunctionOptions): string {
  const params = new URLSearchParams({ token: apiKey() });
  if (options.timeout) params.set("timeout", String(options.timeout));
  if (options.stealth) params.set("stealth", "true");
  applyProxyParams(params, options.proxy);
  return `${BASE_URL}${path}?${params.toString()}`;
}

/**
 * Serializes a function into the `export default async function ({ page, context }) {...}`
 * source Browserless's /function endpoint expects. Same constraint as Playwright's own
 * `page.evaluate(fn)`: `fn` is re-stringified and run in a completely different process, so it
 * cannot close over anything from the caller's scope — pass every value it needs via `context`.
 */
function toFunctionSource<Context, Result>(
  fn: (args: { page: unknown; context: Context }) => Promise<{ data: Result; type?: string }>
): string {
  return `export default ${fn.toString()}`;
}

/**
 * Runs `fn` inside a real, remotely-hosted Chromium page via Browserless's /function REST API.
 * `context` is structured-cloned into the remote execution; `fn`'s return value is JSON round-
 * tripped back to us as `Result`.
 */
export async function runBrowserlessFunction<Result, Context = Record<string, unknown>>(
  fn: (args: { page: unknown; context: Context }) => Promise<{ data: Result; type?: string }>,
  context: Context,
  options: BrowserlessFunctionOptions = {}
): Promise<Result> {
  const res = await fetch(buildUrl("/function", options), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: toFunctionSource(fn), context }),
    signal: options.timeout ? AbortSignal.timeout(options.timeout + 10_000) : undefined,
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new BrowserlessError(`Browserless /function failed (${res.status}): ${raw}`, res.status);
  }

  try {
    return raw ? (JSON.parse(raw) as Result) : (undefined as Result);
  } catch {
    return raw as unknown as Result;
  }
}

export interface BrowserlessUnblockRequest {
  url: string;
  /** Return the rendered HTML in the response. */
  content?: boolean;
  /** Return the page's cookies in the response. */
  cookies?: boolean;
  screenshot?: boolean;
  /**
   * Return a WebSocket endpoint (`browserWSEndpoint`) for the still-open remote session so a
   * caller can `puppeteer.connect()` and keep driving the same, already-unblocked page — e.g. to
   * type credentials into a login form after `/unblock` alone has cleared the site's bot/CAPTCHA
   * gate. The session stays reconnectable for `ttl` ms.
   */
  browserWSEndpoint?: boolean;
  /** How long (ms) Browserless keeps the session alive for reconnection. */
  ttl?: number;
}

export interface BrowserlessUnblockResult {
  content: string | null;
  cookies: unknown[] | null;
  screenshot: string | null;
  browserWSEndpoint: string | null;
}

/**
 * Calls Browserless's `/unblock` REST API (https://docs.browserless.io/baas/rest-apis/unblock) —
 * a BrowserQL-backed endpoint purpose-built for clearing Cloudflare/Turnstile/DataDome-style
 * bot-detection gates before real page content is reachable. Verified against Mercari's login
 * page on a Browserless Free plan: it clears the Cloudflare "Just a moment..." interstitial that
 * `/function` (even with `stealth: true` and a residential proxy) does not, and unlike the
 * `Browserless.solveCaptcha` CDP command it isn't gated to the Scale/Enterprise plan.
 */
export async function runBrowserlessUnblock(
  request: BrowserlessUnblockRequest,
  options: { proxy?: BrowserlessProxyOptions } = {}
): Promise<BrowserlessUnblockResult> {
  const params = new URLSearchParams({ token: apiKey() });
  applyProxyParams(params, options.proxy);
  const url = `${BASE_URL}/unblock?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout((request.ttl ?? 30_000) + 20_000),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new BrowserlessError(`Browserless /unblock failed (${res.status}): ${raw}`, res.status);
  }

  const result: BrowserlessUnblockResult = raw
    ? (JSON.parse(raw) as BrowserlessUnblockResult)
    : { content: null, cookies: null, screenshot: null, browserWSEndpoint: null };

  // Unlike /function's wsEndpoint, /unblock returns a bare wss:// URL with no auth — connecting
  // without a token query param (same as every other Browserless call) gets a 401 at the WS
  // handshake. Confirmed against a live account: appending it here is what makes the endpoint
  // actually reconnectable.
  if (result.browserWSEndpoint) {
    const separator = result.browserWSEndpoint.includes("?") ? "&" : "?";
    result.browserWSEndpoint = `${result.browserWSEndpoint}${separator}token=${apiKey()}`;
  }

  return result;
}
