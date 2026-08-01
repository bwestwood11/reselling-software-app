// Server-side Mercari publishing via ZenRows — fallback for when the Chrome extension
// (extension/background.js) is not available to process a MercariJob.
//
// Why ZenRows: www.mercari.com/v1/api is protected two ways —
//   • createListing is behind Cloudflare's *managed challenge* (unsolvable by a plain
//     Node fetch / curl-impersonate) AND is US-region-gated (ListingNotAllowedIpException).
//   • ZenRows (js_render + US premium proxy) runs a real browser server-side, solves the
//     Cloudflare challenge, and presents a US IP — so createListing succeeds.
// The photo upload (uploadTempListingPhotos) is NOT Cloudflare-protected, so it does not need
// js_render — but it IS US-region-gated (a datacenter IP now returns HTTP 403). We therefore
// route the multipart upload through ZenRows PROXY MODE (proxy.zenrows.com:8001, premium_proxy
// + proxy_country=us): undici's ProxyAgent opens a CONNECT tunnel to Mercari over a US
// residential IP, so TLS stays end-to-end and the multipart body is forwarded natively —
// something the scraper-API endpoint (used for createListing) cannot do.
//
// Auth is the Mercari Bearer access token (+ x-csrf-token) stored on the MarketplaceConnection.
// No session cookies are required.
//
// All request shapes confirmed against a live createListing capture (2026-07). See
// scripts/mercari-publish/ for the standalone equivalent.

// IMPORTANT — everything here uses undici's OWN fetch/FormData/ProxyAgent rather than the Node
// globals. A `dispatcher` may only be driven by the undici instance that created it, and Node's
// global fetch is backed by its *bundled* copy of undici (6.28.0 on node:22-slim, which this API
// deploys on), not the `undici` dependency that exports ProxyAgent (8.9.0). Mixing them throws
// `UND_ERR_INVALID_ARG: invalid onRequestStart method` — the bundled v6 fetch builds a v6-style
// handler (onConnect/onHeaders/onData) and v8's dispatch validator requires onRequestStart. It
// happens to work on Node 26 (bundled undici 8.x), so it only fails once deployed.
// FormData must come from undici too: undici's fetch does not recognise a global FormData as a
// multipart body and silently serialises it as a string, producing a 17-byte upload.
import type { PrismaClient } from "@repo/db";
import {
  ProxyAgent,
  fetch as undiciFetch,
  FormData as UndiciFormData,
  type RequestInit as UndiciRequestInit,
  type Response as UndiciResponse,
} from "undici";

const MERCARI_API = "https://www.mercari.com/v1/api";
const ZENROWS_API = "https://api.zenrows.com/v1/";

// Server-side publishing is OFF — Mercari listings are created only by the browser extension.
// The publish path below is retained as reference/dead code (see publish()); address fetching is
// unaffected and stays live. Do not flip this on without re-solving the multipart upload: ZenRows
// proxy mode returns HTTP 422 / RESP001 for it, and the endpoint is US-region-gated.
const ZENROWS_PUBLISH_ENABLED = false;
// ZenRows proxy-mode endpoint (used for the region-gated photo upload). The API key is the
// proxy username; params (premium_proxy, proxy_country) go in the password field, joined by "&".
const ZENROWS_PROXY_URI = "http://api.zenrows.com:8001";

// Apollo persisted-query hashes (confirmed live).
const UPLOAD_PHOTOS_HASH = "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10";
const CREATE_LISTING_HASH = "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0";
const DELIVERY_ADDRESSES_HASH =
  "60ae4e6793f7c6fcdd16b3aec263abd2ebef115ecabe86407b5c697fadef5f9c";

const CONDITION_IDS: Record<string, number> = {
  NEW_WITH_TAGS: 1,
  NEW_WITHOUT_TAGS: 2,
  VERY_GOOD: 3,
  GOOD: 4,
  SATISFACTORY: 5,
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Shape of the MercariJob.payload built in listing.service.ts.
export interface MercariZenRowsJobPayload {
  title: string;
  description?: string;
  price: number; // cents
  condition?: string;
  images?: string[];
  categoryId?: number | string | null;
  brandId?: number | string | null;
  sizeId?: number | string | null;
  shippingPayerId?: number;
  shippingCost?: number | null; // cents
  shippingClassId?: number | null;
  shippingPackageWeight?: number; // oz
  isShippingSoyo?: boolean;
  offerConfig?: unknown;
  zipCode?: string | null;
}

interface MercariSession {
  accessToken: string;
  csrfToken: string | null;
}

// undici's `fetch` rejects with a bare `TypeError: fetch failed` — the real reason (ENOTFOUND,
// ECONNRESET, UND_ERR_CONNECT_TIMEOUT, a TLS error…) is only reachable through `.cause`. Flatten
// the cause chain and prefix which request failed, so a worker log line is actually diagnosable.
function describeFetchError(label: string, err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  while (cur instanceof Error && parts.length < 4) {
    const code = (cur as { code?: unknown }).code;
    parts.push(typeof code === "string" ? `${cur.message} [${code}]` : cur.message);
    cur = (cur as { cause?: unknown }).cause;
  }
  return `${label} — ${parts.join(" ← ") || "unknown network error"}`;
}

/**
 * undici's `fetch` (never the global — see the note at the top of this file), with transport-level
 * failures rewritten into a labelled, cause-carrying Error.
 */
async function fetchLabeled(
  label: string,
  url: string,
  init?: UndiciRequestInit
): Promise<UndiciResponse> {
  try {
    return await undiciFetch(url, init);
  } catch (err) {
    throw new Error(describeFetchError(label, err), { cause: err });
  }
}

/**
 * Summarise a failed HTTP response for a log line: who answered (ZenRows or Mercari), plus a body
 * snippet. Inside the proxy tunnel ZenRows re-signs TLS, so an error may come from *either* side —
 * a bare status code can't distinguish them, and that is usually the only thing worth knowing.
 */
function httpErrorDetail(res: UndiciResponse, raw: string): string {
  const bits: string[] = [];
  const ct = res.headers.get("content-type");
  if (ct) bits.push(`content-type=${ct}`);
  // ZenRows tags its own responses (zr-*/x-zenrows-*); their presence means the proxy answered.
  for (const [k, v] of res.headers.entries()) {
    if (k.startsWith("zr-") || k.includes("zenrows") || k === "x-request-id") {
      bits.push(`${k}=${v}`);
    }
  }
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    /* not JSON — the snippet below is all we have */
  }
  const asObj = parsed as { code?: unknown; title?: unknown; detail?: unknown } | undefined;
  if (asObj?.code && !("data" in (asObj as object)) && !("errors" in (asObj as object))) {
    bits.push(`ZenRows ${String(asObj.code)}: ${String(asObj.title ?? asObj.detail ?? "")}`);
  }
  const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 300);
  if (snippet) bits.push(`body=${snippet}`);
  return bits.join(" | ") || "empty response body";
}

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

export class MercariZenRowsService {
  private proxyAgent: ProxyAgent | null = null;

  constructor(private readonly db: PrismaClient) {}

  /** Whether server-side ZenRows publishing is configured (ZENROWS_API_KEY present). */
  static isConfigured(): boolean {
    return Boolean(process.env.ZENROWS_API_KEY);
  }

  private get apiKey(): string {
    const key = process.env.ZENROWS_API_KEY;
    if (!key) throw new Error("ZENROWS_API_KEY is not set — cannot publish via ZenRows");
    return key;
  }

  /**
   * A ProxyAgent pointing at ZenRows proxy mode (US residential IP). Reuses ZENROWS_API_KEY.
   * The API key is the proxy username; `premium_proxy=true&proxy_country=<cc>` is the password.
   * We set Proxy-Authorization directly (via `token`) so the "&"/"=" in the password are not
   * mangled by URL parsing. ZenRows terminates and re-signs TLS (MITM), so we disable cert
   * verification for the upstream leg — scoped to THIS agent only, TLS elsewhere is untouched.
   */
  private getProxyAgent(): ProxyAgent {
    if (this.proxyAgent) return this.proxyAgent;
    const country = (process.env.ZENROWS_PROXY_COUNTRY ?? "us").toLowerCase();
    const creds = `${this.apiKey}:premium_proxy=true&proxy_country=${country}`;
    this.proxyAgent = new ProxyAgent({
      uri: ZENROWS_PROXY_URI,
      token: `Basic ${Buffer.from(creds).toString("base64")}`,
      requestTls: { rejectUnauthorized: false },
    });
    return this.proxyAgent;
  }

  private async getSession(userId: string): Promise<MercariSession> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "MERCARI" } },
      select: { accessToken: true, metadata: true, isActive: true },
    });
    if (!connection?.isActive || !connection.accessToken) {
      throw new Error("Mercari account not connected");
    }
    const meta = parseMeta(connection.metadata);
    return {
      accessToken: connection.accessToken,
      csrfToken: typeof meta.csrfToken === "string" ? meta.csrfToken : null,
    };
  }

  private mercariHeaders(session: MercariSession, json: boolean): Record<string, string> {
    const h: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      "apollo-require-preflight": "true",
      "x-platform": "web",
      "x-app-version": "1",
      "x-double-web": "1",
      authorization: `Bearer ${session.accessToken}`,
    };
    if (json) h["Content-Type"] = "application/json";
    if (session.csrfToken) h["x-csrf-token"] = session.csrfToken;
    return h;
  }

  // ── Photo upload (via ZenRows proxy mode — US-region-gated, but not Cloudflare-protected) ─

  private async uploadPhotos(imageUrls: string[], session: MercariSession): Promise<string[]> {
    const uploadIds: string[] = [];
    for (const url of imageUrls) {
      // The image lives in our own storage (S3/CDN) — download it directly, no proxy needed.
      const imgRes = await fetchLabeled(`Image download failed (${url})`, url);
      if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status}): ${url}`);
      const type = imgRes.headers.get("content-type") ?? "image/jpeg";
      const blob = new Blob([await imgRes.arrayBuffer()], { type });

      const form = new UndiciFormData();
      form.append(
        "operations",
        JSON.stringify({
          operationName: "uploadTempListingPhotos",
          variables: { input: { photos: [null] } },
          extensions: { persistedQuery: { version: 1, sha256Hash: UPLOAD_PHOTOS_HASH } },
        })
      );
      form.append("map", JSON.stringify({ "1": ["variables.input.photos.0"] }));
      form.append("1", blob, "blob");

      // POST to Mercari through ZenRows proxy mode so it originates from a US residential IP.
      const res = await fetchLabeled(
        "Mercari photo upload via ZenRows proxy mode failed",
        MERCARI_API,
        {
          method: "POST",
          headers: this.mercariHeaders(session, false),
          body: form,
          dispatcher: this.getProxyAgent(),
        }
      );
      // Read as text first: a proxy-level failure is often HTML or plain text, and `res.json()`
      // would discard exactly the detail that identifies it.
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        /* handled below — non-JSON bodies are surfaced by httpErrorDetail */
      }
      if (!res.ok) {
        throw new Error(`Photo upload HTTP ${res.status} — ${httpErrorDetail(res, raw)}`);
      }
      if (data?.errors?.length) throw new Error(`Photo upload error: ${data.errors[0].message}`);

      const id =
        data?.data?.uploadTempListingPhotos?.uploadIds?.[0] ??
        data?.data?.uploadTempListingPhotos?.photos?.[0]?.id ??
        null;
      if (!id) throw new Error(`No uploadId returned for image: ${url}`);
      uploadIds.push(String(id));
    }
    return uploadIds;
  }

  // ── createListing (via ZenRows: solves Cloudflare + provides US IP) ──────────────────

  private buildCreateListingBody(payload: MercariZenRowsJobPayload, photoIds: string[]) {
    const price = payload.price;
    const conditionId = CONDITION_IDS[payload.condition ?? "GOOD"] ?? 4;
    const isSoyo = Boolean(payload.isShippingSoyo);
    const classId = payload.shippingClassId ?? null;
    const shippingClassIds = isSoyo ? [0] : classId != null ? [classId] : [];
    const payerId = isSoyo ? 2 : (payload.shippingPayerId ?? 1);

    // Fee = 10% of (price + shipping) when the buyer pays shipping, else 10% of price.
    // Confirmed: capture showed floor((2000 + 797) * 0.10) = 279.
    const salesFee =
      payerId === 1 && payload.shippingCost != null
        ? Math.floor((price + payload.shippingCost) * 0.1)
        : Math.floor(price * 0.1);
    // Confirmed from capture: minPriceForAutoPriceDrop = price * 0.80 (not 0.85).
    const minPriceForAutoPriceDrop = Math.round(price * 0.8);

    const toInt = (v: unknown) => Number.parseInt(String(v), 10);

    return {
      operationName: "createListing",
      variables: {
        input: {
          photoIds,
          name: payload.title,
          price,
          description: payload.description ?? "",
          categoryId: toInt(payload.categoryId),
          conditionId,
          shippingPayerId: payerId,
          shippingClassIds,
          suggestedShippingClassIds: shippingClassIds,
          shippingPackageWeight: payload.shippingPackageWeight ?? 8,
          minPriceForAutoPriceDrop,
          salesFee,
          ...(payload.brandId ? { brandId: toInt(payload.brandId) } : {}),
          ...(payload.sizeId ? { sizeId: toInt(payload.sizeId) } : {}),
          ...(payload.zipCode ? { zipCode: String(payload.zipCode) } : {}),
          ...(payload.offerConfig ? { offerConfig: payload.offerConfig } : {}),
          ...(isSoyo ? { isShippingSoyo: true } : {}),
        },
      },
      extensions: { persistedQuery: { version: 1, sha256Hash: CREATE_LISTING_HASH } },
    };
  }

  /** POST a Mercari GraphQL request through ZenRows (js_render + US premium proxy). */
  private async zenrowsPost(session: MercariSession, body: unknown): Promise<any> {
    const params = new URLSearchParams({
      apikey: this.apiKey,
      url: MERCARI_API,
      js_render: "true",
      premium_proxy: "true",
      proxy_country: "us",
      custom_headers: "true",
      original_status: "true",
    });
    const op = (body as { operationName?: string })?.operationName ?? "request";
    const res = await fetchLabeled(`ZenRows POST (${op}) failed`, `${ZENROWS_API}?${params}`, {
      method: "POST",
      headers: this.mercariHeaders(session, true),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`ZenRows returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    // ZenRows-level error (e.g. RESP001) rather than a Mercari GraphQL response.
    if (data?.code && data?.status && !("data" in data) && !("errors" in data)) {
      throw new Error(`ZenRows error ${data.code}: ${data.title ?? "request failed"}`);
    }
    return data;
  }

  /** GET a Mercari GraphQL persisted query through ZenRows. */
  private async zenrowsGet(session: MercariSession, url: string): Promise<any> {
    const params = new URLSearchParams({
      apikey: this.apiKey,
      url,
      js_render: "true",
      premium_proxy: "true",
      proxy_country: "us",
      custom_headers: "true",
      original_status: "true",
    });
    const res = await fetchLabeled("ZenRows GET failed", `${ZENROWS_API}?${params}`, {
      method: "GET",
      headers: this.mercariHeaders(session, true),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`ZenRows returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────────────

  /**
   * DISABLED — kept as dead code for reference only. Mercari publishing is extension-only.
   *
   * Server-side publishing could not be made to work: the photo upload is US-region-gated and
   * ZenRows proxy mode refuses to forward the multipart POST (HTTP 422 / RESP001), while
   * createListing additionally needs Cloudflare clearance. The extension publishes from the user's
   * own browser, which has both a residential IP and a real Cloudflare session.
   * No caller reaches this — jobs/mercari-zenrows.worker.ts rejects publish jobs.
   */
  async publish(payload: MercariZenRowsJobPayload, userId: string): Promise<string | null> {
    if (!ZENROWS_PUBLISH_ENABLED) {
      throw new Error(
        "ZenRows Mercari publishing is disabled — listings are published by the browser extension"
      );
    }
    if (!payload.categoryId) throw new Error("categoryId is required for Mercari listings");
    const session = await this.getSession(userId);

    const images = payload.images ?? [];
    if (images.length === 0) throw new Error("At least one photo is required");

    const photoIds = await this.uploadPhotos(images, session);
    const body = this.buildCreateListingBody(payload, photoIds);
    const data = await this.zenrowsPost(session, body);

    if (data?.errors?.length) {
      const e = data.errors[0];
      const code = e?.extensions?.exception?.code;
      throw new Error(`Mercari rejected createListing: ${e.message}${code ? ` [${code}]` : ""}`);
    }
    return data?.data?.createListing?.id ?? null;
  }

  /** Fetch the seller's delivery addresses via ZenRows. */
  async fetchDeliveryAddresses(userId: string): Promise<unknown[]> {
    const session = await this.getSession(userId);
    const url =
      `${MERCARI_API}?operationName=DeliveryAddresses&variables=%7B%7D` +
      `&extensions=${encodeURIComponent(
        JSON.stringify({ persistedQuery: { version: 1, sha256Hash: DELIVERY_ADDRESSES_HASH } })
      )}`;
    const data = await this.zenrowsGet(session, url);
    if (data?.errors?.length) {
      throw new Error(`Mercari DeliveryAddresses error: ${data.errors[0].message}`);
    }
    return data?.data?.deliveryAddresses ?? [];
  }
}
