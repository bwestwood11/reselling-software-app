import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

/**
 * Facebook Marketplace adapter.
 * Facebook does not provide a public API for Marketplace listings —
 * this stub is a placeholder for when/if Facebook releases an official API
 * or for use via an approved partner integration.
 */
export class FacebookAdapter extends BaseMarketplaceAdapter {
  async publish(_listing: ListingPayload): Promise<string> {
    // Facebook Marketplace does not currently offer a public listing API.
    // In a real integration this would call the Graph API with appropriate
    // commerce permissions.
    throw new Error(
      "Facebook Marketplace API integration is not yet available. " +
        "Please list manually at facebook.com/marketplace."
    );
  }

  async update(_externalId: string, _listing: ListingPayload): Promise<void> {
    throw new Error("Facebook Marketplace API not available.");
  }

  async delist(_externalId: string): Promise<void> {
    throw new Error("Facebook Marketplace API not available.");
  }

  async checkStatus(_externalId: string) {
    return { status: "unknown" as const };
  }
}
