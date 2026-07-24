// Server-side Mercari publishing via ZenRows — fallback for when the Chrome extension
// (extension/background.js) is not available to process a MercariJob.
//
// Why ZenRows: www.mercari.com/v1/api is protected two ways —
//   • createListing is behind Cloudflare's *managed challenge* (unsolvable by a plain
//     Node fetch / curl-impersonate) AND is US-region-gated (ListingNotAllowedIpException).
//   • ZenRows (js_render + US premium proxy) runs a real browser server-side, solves the
//     Cloudflare challenge, and presents a US IP — so createListing succeeds.
// The photo upload (uploadTempListingPhotos) is NOT Cloudflare-protected and has no region
// gate, so it is sent DIRECTLY (ZenRows cannot forward multipart bodies anyway).
//
// Auth is the Mercari Bearer access token (+ x-csrf-token) stored on the MarketplaceConnection.
// No session cookies are required.
//
// All request shapes confirmed against a live createListing capture (2026-07). See
// scripts/mercari-publish/ for the standalone equivalent.

import type { PrismaClient } from "@repo/db";

const MERCARI_API = "https://www.mercari.com/v1/api";
const ZENROWS_API = "https://api.zenrows.com/v1/";

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

  // ── Photo upload (DIRECT — not Cloudflare-protected, no region gate) ─────────────────

  private async uploadPhotos(imageUrls: string[], session: MercariSession): Promise<string[]> {
    const uploadIds: string[] = [];
    for (const url of imageUrls) {
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status}): ${url}`);
      const type = imgRes.headers.get("content-type") ?? "image/jpeg";
      const blob = new Blob([await imgRes.arrayBuffer()], { type });

      const form = new FormData();
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

      const res = await fetch(MERCARI_API, {
        method: "POST",
        headers: this.mercariHeaders(session, false),
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(`Photo upload HTTP ${res.status}`);
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
    const res = await fetch(`${ZENROWS_API}?${params}`, {
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
    const res = await fetch(`${ZENROWS_API}?${params}`, {
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

  /** Publish a listing from a MercariJob payload. Returns the Mercari item id. */
  async publish(payload: MercariZenRowsJobPayload, userId: string): Promise<string | null> {
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
