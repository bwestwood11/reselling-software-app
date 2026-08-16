// IMPORTANT: Poshmark has no public API. All endpoints below are reverse-engineered
// from their web app and are subject to change without notice.
// Verify all endpoints and payloads against live network traffic before production use.
//
// Auth: Cookie-based. The MarketplaceConnection stores session cookies in the
// `sessionCookies` JSON field (same pattern as Mercari). Required cookies include
// `_csrf_token` and the session JWT. Obtain these by logging in via the mobile WebView.
//
// POSHMARK_API base: https://poshmark.com
// The `/api/v2/posts...` paths that used to be documented here don't exist — see
// extension/POSHMARK.md "History of wrong guesses". The real, verified flow (draft
// create -> image upload -> save -> publish -> verify) lives under /vm-rest/, fully
// documented in extension/POSHMARK.md and implemented in extension/background.js.
//
// Sold-item detection (see extension/POSHMARK.md "Sold-item detection" for full capture
// notes): GET /vm-rest/posts/{postId}?app_version=5.04&pm_version={PM_VERSION} — check
// response.data.inventory.status === "sold_out" (NOT response.data.status, which stays
// "published" forever). response.data.inventory.status_changed_at is the sale timestamp.
// This is the same endpoint already used to verify a publish succeeded.
//
// Poshmark publishes are handled via the mobile WebView flow (same as Mercari)
// because server-side cookie injection is unreliable without a real browser TLS
// fingerprint. The crosslist service returns NEEDS_WEBVIEW and never calls publish().
// These stubs satisfy the abstract base class contract.

import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

// Maps our internal Condition enum to Poshmark condition strings
const CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS:    "nwt",
  NEW_WITHOUT_TAGS: "like_new",
  VERY_GOOD:        "good",
  GOOD:             "good",
  SATISFACTORY:     "fair",
};

// Shape of the poshmark-specific data stored in listing.marketplaceData
interface PoshmarkListingData {
  departmentId?: string;
  categoryId?: string;
  subcategoryId?: string;
  condition?: string;         // nwt | like_new | good | fair
  brand?: string;
  colors?: string[];          // up to 2 color name strings e.g. ["Red", "Blue"]
  styleTags?: string[];       // up to 3 tags
  sizeId?: string;            // e.g. "M", "OS", "10"
  originalPriceCents?: number;
  shippingDiscount?: string;  // no_discount | discounted_4_99 | free_shipping
}

function buildPoshmarkPayload(listing: ListingPayload, data: PoshmarkListingData) {
  const condition = CONDITION_MAP[listing.inventoryItem?.condition ?? "GOOD"] ?? "good";
  const price = Number(listing.price);
  const images = listing.inventoryItem?.images ?? [];

  return {
    listing: {
      title: listing.title,
      description: listing.description ?? "",
      price_amount: {
        val: price.toFixed(2),
        currency_code: "USD",
      },
      ...(data.originalPriceCents != null
        ? { original_price: { val: (data.originalPriceCents / 100).toFixed(2), currency_code: "USD" } }
        : {}),
      catalog: {
        ...(data.departmentId ? { department_id: data.departmentId } : {}),
        ...(data.categoryId ? { category_id: data.categoryId } : {}),
        ...(data.subcategoryId ? { subcategory_id: data.subcategoryId } : {}),
      },
      condition: data.condition ?? condition,
      ...(data.brand?.trim() ? { brand: data.brand.trim() } : {}),
      colors: (data.colors ?? []).map((name) => ({ name })),
      ...(data.styleTags?.length ? { style_tags: data.styleTags.map((t) => ({ name: t })) } : {}),
      ...(data.sizeId ? { size_obj: { id: data.sizeId, size_system: "us" } } : {}),
      pictures: images
        .filter((img) => img.url.startsWith("https://"))
        .slice(0, 8)
        .map((img) => ({ img_url: img.url, url_secure: img.url })),
      ...(data.shippingDiscount && data.shippingDiscount !== "no_discount"
        ? { seller_shipping_discount_id: data.shippingDiscount }
        : {}),
    },
  };
}

export class PoshmarkAdapter extends BaseMarketplaceAdapter {
  // Poshmark publishing is handled by the mobile WebView flow.
  // Server-side cookie injection is unreliable; the mobile WebView uses a real
  // browser context which passes Poshmark's session checks.
  async publish(_listing: ListingPayload): Promise<string> {
    throw new Error(
      "Poshmark publishing is handled by the mobile WebView flow. This adapter should not be called directly."
    );
  }

  async update(_externalId: string, _listing: ListingPayload): Promise<void> {
    // Not supported server-side — requires a real browser cookie session.
    // Implement once a verified server-side cookie flow is available.
  }

  async delist(_externalId: string): Promise<void> {
    // Not supported server-side — requires a real browser cookie session.
  }

  async checkStatus(_externalId: string) {
    return { status: "unknown" as const };
  }
}

// Exported for use in mobile WebView payload construction
export { buildPoshmarkPayload, CONDITION_MAP as POSHMARK_CONDITION_MAP };
export type { PoshmarkListingData };
