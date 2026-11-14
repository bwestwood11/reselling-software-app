// Metered HTTP through a user's sticky residential IP.
//
// Uses undici's OWN fetch/FormData (never Node's globals): a ProxyAgent dispatcher can only be
// driven by the undici instance that created it — see the long note at the top of
// services/marketplace/mercari-zenrows.service.ts for the production failure that caused.
//
// Bytes are estimated as request line + headers + body, plus response headers + body, plus a
// small fixed allowance for the CONNECT/TLS handshake. Bodies are measured after decompression,
// so the figure errs slightly high — the safe direction for a cost meter.

import type { MarketplaceType, PrismaClient } from "@repo/db";
import {
  fetch as undiciFetch,
  FormData as UndiciFormData,
  type RequestInit as UndiciRequestInit,
} from "undici";
import { getProxyAgent } from "./residential-proxy";
import { recordProxyUsage } from "./proxy-usage.service";

/** Per-request allowance for CONNECT + TLS handshake bytes (amortised over a reused tunnel). */
const HANDSHAKE_ALLOWANCE = 1_500;

export { UndiciFormData as ProxyFormData };

export interface ProxiedResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  body: Buffer;
  /** Total bytes this request cost through the proxy (0 when it went direct). */
  meteredBytes: number;
  /** Whether the request actually went through the residential proxy. */
  proxied: boolean;
  text(): string;
  json<T = unknown>(): T | null;
}

export interface ProxiedFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer | InstanceType<typeof UndiciFormData>;
  /** Send directly from this server instead of through the residential IP (e.g. option B tests). */
  direct?: boolean;
  /** Skip writing to ProxyUsage (callers that aggregate and record once themselves). */
  skipRecord?: boolean;
  timeoutMs?: number;
}

export interface ProxiedFetchContext {
  db: PrismaClient;
  userId: string;
  marketplace: MarketplaceType;
}

function headersSize(headers: Record<string, string> | Headers): number {
  let n = 0;
  const add = (k: string, v: string) => {
    n += k.length + v.length + 4; // ": " + CRLF
  };
  if (headers instanceof Headers) headers.forEach((v, k) => add(k, v));
  else for (const [k, v] of Object.entries(headers)) add(k, v);
  return n;
}

function bodySize(body: ProxiedFetchOptions["body"]): number {
  if (body == null) return 0;
  if (typeof body === "string") return Buffer.byteLength(body);
  if (Buffer.isBuffer(body)) return body.length;
  // Multipart: sum the parts plus a per-part boundary/disposition allowance.
  let n = 0;
  for (const [name, value] of body.entries()) {
    n += 120 + name.length;
    n += typeof value === "string" ? Buffer.byteLength(value) : value.size;
  }
  return n;
}

/**
 * fetch() through the user's sticky residential IP, recording the bytes against their usage.
 * Throws when the proxy is required but not configured, so a misconfiguration fails loudly
 * instead of silently sending marketplace traffic from a datacenter IP.
 */
export async function proxiedFetch(
  ctx: ProxiedFetchContext,
  url: string,
  options: ProxiedFetchOptions = {}
): Promise<ProxiedResponse> {
  const dispatcher = options.direct
    ? undefined
    : getProxyAgent({ userId: ctx.userId, marketplace: ctx.marketplace });
  if (!options.direct && !dispatcher) {
    throw new Error("Residential proxy is not configured (set BRIGHTDATA_* env vars)");
  }

  const headers = options.headers ?? {};
  const init: UndiciRequestInit = {
    method: options.method ?? "GET",
    headers,
    body: options.body as UndiciRequestInit["body"],
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
    ...(dispatcher ? { dispatcher } : {}),
  };

  let res;
  try {
    res = await undiciFetch(url, init);
  } catch (err) {
    const parts: string[] = [];
    let cur: unknown = err;
    while (cur instanceof Error && parts.length < 4) {
      const code = (cur as { code?: unknown }).code;
      parts.push(typeof code === "string" ? `${cur.message} [${code}]` : cur.message);
      cur = (cur as { cause?: unknown }).cause;
    }
    throw new Error(
      `${dispatcher ? "Proxied" : "Direct"} ${init.method} ${new URL(url).host} failed — ${parts.join(" ← ")}`,
      { cause: err }
    );
  }

  const body = Buffer.from(await res.arrayBuffer());
  const responseHeaders = res.headers as unknown as Headers;

  const meteredBytes = dispatcher
    ? url.length +
      20 +
      headersSize(headers) +
      bodySize(options.body) +
      headersSize(responseHeaders) +
      body.length +
      HANDSHAKE_ALLOWANCE
    : 0;

  if (dispatcher && !options.skipRecord) {
    await recordProxyUsage(ctx.db, ctx.userId, ctx.marketplace, {
      bytes: meteredBytes,
      requests: 1,
    });
  }

  return {
    ok: res.ok,
    status: res.status,
    headers: responseHeaders,
    body,
    meteredBytes,
    proxied: Boolean(dispatcher),
    text: () => body.toString("utf8"),
    json: <T>() => {
      try {
        return JSON.parse(body.toString("utf8")) as T;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Whether a response is a Cloudflare bot challenge rather than the site's real answer. A
 * challenged request must be retried from a real browser (see mercari-server.service.ts).
 */
export function isCloudflareChallenge(res: { status: number; headers: Headers; text(): string }): boolean {
  if (res.headers.get("cf-mitigated") === "challenge") return true;
  if (res.status !== 403 && res.status !== 503 && res.status !== 429) return false;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return false;
  const html = res.text().slice(0, 4_000);
  return /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(html);
}
