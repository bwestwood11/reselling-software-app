import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

const DEPOP_API_BASE = "https://api.depop.com/api/v1";

/**
 * Depop adapter — uses Depop's unofficial/partner API.
 * Official API access requires applying to Depop's partner program.
 */
export class DepopAdapter extends BaseMarketplaceAdapter {
  private get headers() {
    return {
      Authorization: `Bearer ${this.connection.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async publish(listing: ListingPayload): Promise<string> {
    const price = Number(listing.price);

    const images = listing.inventoryItem?.images ?? [];
    const primaryImage = images.find((i) => i.isPrimary) ?? images[0];

    const payload = {
      description: listing.description ?? listing.title,
      price: Math.round(price * 100), // Depop uses cents
      currency_name: "USD",
      quantity: 1,
      country_name: "US",
      photos: primaryImage ? [{ url: primaryImage.url }] : [],
      category_id: (listing.marketplaceData as any)?.categoryId,
      brand_id: (listing.marketplaceData as any)?.brandId,
      size_id: (listing.marketplaceData as any)?.sizeId,
      condition: this.mapCondition(listing.inventoryItem?.condition),
    };

    const res = await fetch(`${DEPOP_API_BASE}/products/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Depop publish error: ${res.status}`);
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  }

  async update(externalId: string, listing: ListingPayload): Promise<void> {
    const price = Number(listing.price);

    await fetch(`${DEPOP_API_BASE}/products/${externalId}/`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({
        price: Math.round(price * 100),
        description: listing.description,
      }),
    });
  }

  async delist(externalId: string): Promise<void> {
    await fetch(`${DEPOP_API_BASE}/products/${externalId}/`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async checkStatus(externalId: string) {
    const res = await fetch(`${DEPOP_API_BASE}/products/${externalId}/`, {
      headers: this.headers,
    });

    if (!res.ok) return { status: "unknown" as const };

    const data = (await res.json()) as any;
    if (data.sold) return { status: "sold" as const };
    if (!data.is_available) return { status: "ended" as const };
    return { status: "active" as const };
  }

  private mapCondition(condition?: string): number {
    // Depop condition IDs: 1=New, 2=Like New, 3=Good, 4=Fair, 5=Poor
    const map: Record<string, number> = {
      NEW_WITH_TAGS: 1,
      NEW_WITHOUT_TAGS: 2,
      VERY_GOOD: 2,
      GOOD: 3,
      SATISFACTORY: 4,
    };
    return map[condition ?? "GOOD"] ?? 3;
  }
}
