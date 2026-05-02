// IMPORTANT: All endpoints marked MERCARI_API must be verified against live
// network traffic (Chrome DevTools › Network while using mercari.com).
// Mercari's internal API is undocumented and subject to change.

import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

// Auth confirmed at https://www.mercari.com/v1 (see mercari-auth.service.ts).
// Sell API inferred from same host — verify endpoints against live network traffic.
const MERCARI_API_BASE = "https://www.mercari.com/v1";

// MERCARI_API: confirm condition ID values by inspecting the sell form payload
const CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS: "1",    // Brand new
  NEW_WITHOUT_TAGS: "2", // Like new
  VERY_GOOD: "3",        // Good
  GOOD: "4",             // Fair
  SATISFACTORY: "5",     // Poor
};

// Mercari's www.mercari.com is protected by Cloudflare Bot Management, which
// blocks server-side Node.js requests based on TLS fingerprint (JA3/JA4).
// Publishing is handled entirely via an in-app WebView on mobile, which runs
// in a real browser context and calls the GraphQL endpoint at POST /v1/api.
// The crosslist service returns NEEDS_WEBVIEW for Mercari and never calls this
// adapter's publish() — these stubs exist only to satisfy the abstract base.
export class MercariAdapter extends BaseMarketplaceAdapter {
  async publish(_listing: ListingPayload): Promise<string> {
    throw new Error(
      "Mercari publishing is handled by the mobile WebView flow. This adapter should not be called directly."
    );
  }

  async update(_externalId: string, _listing: ListingPayload): Promise<void> {
    // Not supported server-side — Cloudflare blocks Node.js requests to www.mercari.com
  }

  async delist(_externalId: string): Promise<void> {
    // Not supported server-side — Cloudflare blocks Node.js requests to www.mercari.com
  }

  async checkStatus(_externalId: string) {
    return { status: "unknown" as const };
  }
}
