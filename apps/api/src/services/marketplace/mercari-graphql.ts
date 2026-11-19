// Mercari web GraphQL — request shapes shared by every server-side Mercari transport
// (mercari-server.service.ts over the residential proxy, mercari-zenrows.service.ts over ZenRows).
//
// All hashes and body shapes were confirmed against live captures; see the notes beside each.
// Mercari's gateway only runs REGISTERED persisted queries — an unknown hash answers
// PersistedQueryNotFound — so new operations must be captured, never guessed
// (scripts/proxy/capture-mercari-graphql.ts).

export const MERCARI_ORIGIN = "https://www.mercari.com";
export const MERCARI_API = `${MERCARI_ORIGIN}/v1/api`;

/** Apollo persisted-query hashes. */
export const MERCARI_HASHES = {
  /** Confirmed live 2026-07 — multipart photo upload, returns uploadIds. */
  uploadTempListingPhotos: "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10",
  /** Confirmed live 2026-07 — create a listing from uploaded photo ids. */
  createListing: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0",
  /** Confirmed live — the seller's saved delivery addresses (a harmless read; used by tests). */
  deliveryAddresses: "60ae4e6793f7c6fcdd16b3aec263abd2ebef115ecabe86407b5c697fadef5f9c",
  /** Confirmed live 2026-08-22 — `{ input: { id, status: "cancel" } }` delists; idempotent. */
  updateItemStatus: "55bd4e7d2bc2936638e1451da3231e484993635d7603431d1a2978e3d59656f8",
} as const;

export const MERCARI_CONDITION_IDS: Record<string, number> = {
  NEW_WITH_TAGS: 1,
  NEW_WITHOUT_TAGS: 2,
  VERY_GOOD: 3,
  GOOD: 4,
  SATISFACTORY: 5,
};

export const MERCARI_DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Shape of MercariJob.payload for a publish, as built in listing.service.ts. */
export interface MercariPublishPayload {
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

/** Bearer auth captured from the user's Mercari session (connect-token flow). */
export interface MercariSession {
  accessToken: string;
  csrfToken: string | null;
}

export function mercariHeaders(
  session: MercariSession,
  opts: { json: boolean; userAgent?: string }
): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": opts.userAgent ?? MERCARI_DEFAULT_USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: MERCARI_ORIGIN,
    Referer: `${MERCARI_ORIGIN}/sell/`,
    "apollo-require-preflight": "true",
    "x-platform": "web",
    "x-app-version": "1",
    "x-double-web": "1",
    authorization: `Bearer ${session.accessToken}`,
  };
  if (opts.json) h["Content-Type"] = "application/json";
  if (session.csrfToken) h["x-csrf-token"] = session.csrfToken;
  return h;
}

function persisted(hash: string) {
  return { persistedQuery: { version: 1, sha256Hash: hash } };
}

/** The `operations` field of the multipart uploadTempListingPhotos request (one photo). */
export function uploadPhotoOperations(): string {
  return JSON.stringify({
    operationName: "uploadTempListingPhotos",
    variables: { input: { photos: [null] } },
    extensions: persisted(MERCARI_HASHES.uploadTempListingPhotos),
  });
}

export function parseUploadId(data: unknown): string | null {
  const d = data as {
    data?: {
      uploadTempListingPhotos?: { uploadIds?: unknown[]; photos?: Array<{ id?: unknown }> };
    };
  };
  const id =
    d?.data?.uploadTempListingPhotos?.uploadIds?.[0] ??
    d?.data?.uploadTempListingPhotos?.photos?.[0]?.id ??
    null;
  return id == null ? null : String(id);
}

export function buildCreateListingBody(payload: MercariPublishPayload, photoIds: string[]) {
  const price = payload.price;
  const conditionId = MERCARI_CONDITION_IDS[payload.condition ?? "GOOD"] ?? 4;
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
    extensions: persisted(MERCARI_HASHES.createListing),
  };
}

export function buildDelistBody(externalId: string) {
  return {
    operationName: "UpdateItemStatusMutation",
    variables: { input: { id: externalId, status: "cancel" } },
    extensions: persisted(MERCARI_HASHES.updateItemStatus),
  };
}

export function deliveryAddressesUrl(): string {
  return (
    `${MERCARI_API}?operationName=DeliveryAddresses&variables=%7B%7D` +
    `&extensions=${encodeURIComponent(JSON.stringify(persisted(MERCARI_HASHES.deliveryAddresses)))}`
  );
}

/** First GraphQL error as a readable string, or null. */
export function graphqlError(data: unknown): string | null {
  const errors = (data as { errors?: Array<{ message?: string; extensions?: any }> })?.errors;
  if (!errors?.length) return null;
  const e = errors[0]!;
  const code = e?.extensions?.exception?.code ?? e?.extensions?.code;
  return `${e?.message ?? "GraphQL error"}${code ? ` [${code}]` : ""}`;
}

// ── Sold feed (sale detection) ─────────────────────────────────────────────────────────────
//
// The seller's own "Sold / In progress" listing queries, as CAPTURED from live traffic with
// scripts/proxy/capture-mercari-graphql.ts and configured through MERCARI_SOLD_FEED_QUERIES
// (never guessed — an unknown hash answers PersistedQueryNotFound). Value: a JSON array of
//   { "operationName": "...", "sha256Hash": "...", "variables": { ... } }
// copied straight from the capture file — one entry per tab (e.g. In Progress and Sold/Complete).
// With it unset, the server can't detect Mercari sales and the sweep says so in its run row.

export interface MercariFeedQuery {
  operationName: string;
  sha256Hash: string;
  variables: unknown;
}

export function mercariSoldFeedQueries(): MercariFeedQuery[] {
  const raw = process.env.MERCARI_SOLD_FEED_QUERIES?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.filter(
      (q): q is MercariFeedQuery =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as MercariFeedQuery).operationName === "string" &&
        typeof (q as MercariFeedQuery).sha256Hash === "string" &&
        /^[0-9a-f]{64}$/.test((q as MercariFeedQuery).sha256Hash)
    );
  } catch {
    console.error("[mercari] MERCARI_SOLD_FEED_QUERIES is not valid JSON — ignoring it");
    return [];
  }
}

export function feedQueryUrl(q: MercariFeedQuery): string {
  return (
    `${MERCARI_API}?operationName=${encodeURIComponent(q.operationName)}` +
    `&variables=${encodeURIComponent(JSON.stringify(q.variables ?? {}))}` +
    `&extensions=${encodeURIComponent(JSON.stringify(persisted(q.sha256Hash)))}`
  );
}

const ITEM_ID_RE = /^m\d{6,}$/;
const ON_SALE_RE = /^(item_status_)?on_sale$/i;

/**
 * Item ids found in a sold-feed response, minus any whose own status says they're still on
 * sale. Walks the JSON generically rather than assuming field paths, so it survives Mercari
 * reshaping the response — the query itself is what restricts the feed to sold/in-progress items.
 */
export function soldItemIdsFromFeed(data: unknown): Set<string> {
  const ids = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const obj = node as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : null;
    if (id && ITEM_ID_RE.test(id)) {
      const status = typeof obj.status === "string" ? obj.status : "";
      if (!ON_SALE_RE.test(status)) ids.add(id);
    }
    for (const value of Object.values(obj)) visit(value);
  };
  visit(data);
  return ids;
}
