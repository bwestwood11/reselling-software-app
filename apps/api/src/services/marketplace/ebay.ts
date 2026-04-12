import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

const EBAY_API_BASE = "https://api.ebay.com";
const EBAY_SANDBOX_API_BASE = "https://api.sandbox.ebay.com";

export class EbayAdapter extends BaseMarketplaceAdapter {
  private get baseUrl() {
    return process.env.EBAY_SANDBOX === "true"
      ? EBAY_SANDBOX_API_BASE
      : EBAY_API_BASE;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.connection.accessToken}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    };
  }

  async publish(listing: ListingPayload): Promise<string> {
    const price = typeof listing.price === "object"
      ? parseFloat((listing.price as any).toString())
      : Number(listing.price);

    const imageUrls = listing.inventoryItem?.images
      ?.filter((img) => img.url)
      .map((img) => img.url) ?? [];

    // Create inventory item on eBay
    const itemKey = `ITEM-${listing.id}`;

    await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${itemKey}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        availability: {
          shipToLocationAvailability: { quantity: 1 },
        },
        condition: this.mapCondition(listing.inventoryItem?.condition),
        product: {
          title: listing.title,
          description: listing.description ?? listing.title,
          imageUrls,
          brand: listing.inventoryItem?.brand,
        },
      }),
    }).then((res) => {
      if (!res.ok) throw new Error(`eBay inventory_item error: ${res.status}`);
    });

    // Create offer
    const offerRes = await fetch(`${this.baseUrl}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        sku: itemKey,
        marketplaceId: "EBAY_US",
        format: "FIXED_PRICE",
        listingPolicies: (listing.marketplaceData as any)?.listingPolicies ?? {},
        pricingSummary: { price: { value: price.toFixed(2), currency: "USD" } },
        categoryId: (listing.marketplaceData as any)?.categoryId ?? "1",
        merchantLocationKey: (listing.marketplaceData as any)?.locationKey,
      }),
    });

    if (!offerRes.ok) {
      throw new Error(`eBay create offer error: ${offerRes.status}`);
    }

    const { offerId } = (await offerRes.json()) as { offerId: string };

    // Publish offer
    const publishRes = await fetch(
      `${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
      { method: "POST", headers: this.headers }
    );

    if (!publishRes.ok) {
      throw new Error(`eBay publish offer error: ${publishRes.status}`);
    }

    const { listingId } = (await publishRes.json()) as { listingId: string };
    return listingId;
  }

  async update(externalId: string, listing: ListingPayload): Promise<void> {
    const price = Number(listing.price);
    await fetch(
      `${this.baseUrl}/sell/inventory/v1/offer/${externalId}`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          pricingSummary: { price: { value: price.toFixed(2), currency: "USD" } },
        }),
      }
    );
  }

  async delist(externalId: string): Promise<void> {
    await fetch(
      `${this.baseUrl}/sell/inventory/v1/offer/${externalId}/withdraw`,
      { method: "POST", headers: this.headers }
    );
  }

  async checkStatus(externalId: string) {
    const res = await fetch(
      `${this.baseUrl}/sell/fulfillment/v1/order?filter=listingId:{${externalId}}`,
      { headers: this.headers }
    );
    if (!res.ok) return { status: "unknown" as const };

    const data = (await res.json()) as any;
    if (data.orders?.length > 0) return { status: "sold" as const };
    return { status: "active" as const };
  }

  private mapCondition(condition?: string): string {
    const map: Record<string, string> = {
      NEW_WITH_TAGS: "NEW_WITH_TAGS",
      NEW_WITHOUT_TAGS: "NEW_WITHOUT_TAGS",
      VERY_GOOD: "LIKE_NEW",
      GOOD: "GOOD",
      SATISFACTORY: "ACCEPTABLE",
    };
    return map[condition ?? "GOOD"] ?? "GOOD";
  }
}
