import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

/**
 * Mercari adapter.
 * Mercari does not offer a public API for third-party listing creation.
 * This stub documents the intended integration point.
 * In production, this would use Mercari's partner API if/when available.
 */
export class MercariAdapter extends BaseMarketplaceAdapter {
  async publish(_listing: ListingPayload): Promise<string> {
    throw new Error(
      "Mercari does not currently offer a public API for listing creation. " +
        "Please list manually at mercari.com."
    );
  }

  async update(_externalId: string, _listing: ListingPayload): Promise<void> {
    throw new Error("Mercari API not available.");
  }

  async delist(_externalId: string): Promise<void> {
    throw new Error("Mercari API not available.");
  }

  async checkStatus(_externalId: string) {
    return { status: "unknown" as const };
  }
}
