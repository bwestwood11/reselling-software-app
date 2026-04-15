export interface ListingPayload {
  id: string;
  title: string;
  description?: string | null;
  price: unknown; // Decimal from Prisma
  marketplaceData?: unknown;
  inventoryItem?: {
    images?: Array<{ url: string; isPrimary: boolean }>;
    attributes?: Array<{ name: string; value: string }>;
    condition?: string;
    brand?: string | null;
    category?: string | null;
    weight?: unknown;
    dimensions?: unknown;
  } | null;
}

export abstract class BaseMarketplaceAdapter {
  protected connection: {
    accessToken: string;
    refreshToken?: string | null;
    accountId?: string | null;
  };

  constructor(connection: {
    accessToken: string;
    refreshToken?: string | null;
    accountId?: string | null;
  }) {
    this.connection = connection;
  }

  /** Publish the listing and return the external listing ID */
  abstract publish(listing: ListingPayload): Promise<string>;

  /** Update an existing listing */
  abstract update(externalId: string, listing: ListingPayload): Promise<void>;

  /** Delist / end a listing */
  abstract delist(externalId: string): Promise<void>;

  /** Check the current status of a listing */
  abstract checkStatus(externalId: string): Promise<{
    status: "active" | "sold" | "ended" | "unknown";
    soldPrice?: number;
  }>;
}
