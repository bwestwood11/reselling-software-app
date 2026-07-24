import type {
  Prisma,
  PrismaClient,
  ListingStatus,
  MarketplaceType,
} from "@repo/db";
import { getPaginationParams, buildPaginatedResponse } from "@repo/utils";
import { MarketplaceFactory } from "./marketplace/factory";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";
import { scheduleMercariZenRowsFallback } from "../jobs/mercari-zenrows.worker";

interface ListOptions {
  page: number;
  limit: number;
  status?: ListingStatus;
  marketplace?: MarketplaceType;
  inventoryItemId?: string;
}

interface CreateInput {
  inventoryItemId: string;
  marketplaceConnectionId: string;
  marketplace: MarketplaceType;
  price: number;
  title: string;
  description?: string;
  marketplaceData?: Record<string, unknown>;
}

interface UpdateInput {
  marketplace?: MarketplaceType;
  price?: number;
  title?: string;
  description?: string;
  marketplaceData?: Record<string, unknown>;
}

export class ListingService {
  constructor(private db: PrismaClient) {}

  async list(userId: string, opts: ListOptions) {
    const { skip, take, page, limit } = getPaginationParams(opts.page, opts.limit);

    const where = {
      userId,
      ...(opts.status && { status: opts.status }),
      ...(opts.marketplace && { marketplace: opts.marketplace }),
      ...(opts.inventoryItemId && { inventoryItemId: opts.inventoryItemId }),
    };

    const [data, total] = await Promise.all([
      this.db.listing.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          inventoryItem: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
          marketplaceConnection: true,
        },
      }),
      this.db.listing.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(id: string, userId: string) {
    return this.db.listing.findFirst({
      where: { id, userId },
      include: {
        inventoryItem: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            attributes: true,
          },
        },
        marketplaceConnection: true,
        syncEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  async create(userId: string, input: CreateInput) {
    // Verify the inventory item belongs to the user
    const item = await this.db.inventoryItem.findFirst({
      where: { id: input.inventoryItemId, userId },
    });
    if (!item) throw new Error("Inventory item not found");

    // Verify the marketplace connection belongs to the user
    const connection = await this.db.marketplaceConnection.findFirst({
      where: { id: input.marketplaceConnectionId, userId },
    });
    if (!connection) throw new Error("Marketplace connection not found");

    return this.db.listing.create({
      data: {
        userId,
        inventoryItemId: input.inventoryItemId,
        marketplaceConnectionId: input.marketplaceConnectionId,
        marketplace: input.marketplace,
        price: input.price,
        title: input.title,
        description: input.description,
        marketplaceData: input.marketplaceData as Prisma.InputJsonValue | undefined,
        status: "DRAFT",
      },
      include: {
        inventoryItem: true,
        marketplaceConnection: true,
      },
    });
  }

  async update(id: string, userId: string, input: UpdateInput) {
    const existing = await this.db.listing.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const data: Prisma.ListingUpdateInput = {
      ...(input.marketplace !== undefined && { marketplace: input.marketplace }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.marketplaceData !== undefined && {
        marketplaceData: input.marketplaceData as Prisma.InputJsonValue,
      }),
    };

    return this.db.listing.update({
      where: { id },
      data,
      include: {
        inventoryItem: true,
        marketplaceConnection: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.db.listing.deleteMany({ where: { id, userId } });
  }

  async publish(id: string, userId: string) {
    const listing = await this.db.listing.findFirst({
      where: { id, userId },
      include: {
        inventoryItem: { include: { images: { orderBy: { sortOrder: "asc" } }, attributes: true } },
        marketplaceConnection: true,
      },
    });

    if (!listing) throw new Error("Listing not found");

    // Cross-listing is unlimited on every plan — no per-listing credit is charged.

    // Create a sync event
    await this.db.syncEvent.create({
      data: {
        listingId: id,
        type: "PUBLISH",
        status: "pending",
        message: "Publishing listing to marketplace",
      },
    });

    // Mercari cannot be published server-side (Cloudflare Bot Management blocks Node.js
    // requests by TLS fingerprint). Instead, queue a MercariJob for the Chrome extension,
    // which runs in a real browser context and calls Mercari's API directly.
    if (listing.marketplace === "MERCARI") {
      const images =
        listing.inventoryItem?.images?.map((img) => img.url) ?? [];

      const mpData = listing.marketplaceData as Record<string, unknown> | null;
      const shipping = (mpData?.shipping ?? {}) as Record<string, unknown>;
      const dim = (shipping.dimension ?? {}) as Record<string, unknown>;

      const job = await this.db.mercariJob.create({
        data: {
          userId,
          listingId: id,
          payload: {
            listingId: id,
            title: listing.title,
            description: listing.description ?? "",
            // Price in cents — listing.price is stored as dollars (e.g. 12.99)
            price: Math.round(Number(listing.price) * 100),
            condition: listing.inventoryItem?.condition ?? "GOOD",
            images,
            categoryId: mpData?.categoryId ?? null,
            brandId: mpData?.brandId ?? null,
            sizeId: mpData?.sizeId ?? null,
            shippingPayerId: (shipping.shippingPayerId as number) ?? 1,
            // shippingCost in cents — carrier fee; used to compute salesFee when buyer pays
            shippingCost: (shipping.shippingCost as number) ?? null,
            shippingClassId: (shipping.shippingClassId as number) ?? null,
            shippingPackageWeight: (shipping.weightOz as number) ?? 8,
            shippingWeightUnit: "OUNCE",
            shippingPackageLength: (dim.length as number) ?? null,
            shippingPackageWidth: (dim.width as number) ?? null,
            shippingPackageHeight: (dim.height as number) ?? null,
            shippingDimensionUnit: "INCH",
            isShippingSoyo: shipping.method === "SOYO",
            offerConfig: mpData?.offerConfig ?? null,
            zipCode: mpData?.zipCode ?? null,
          },
        },
      });

      const updated = await this.db.listing.update({
        where: { id },
        data: { status: "PENDING", lastSyncAt: new Date(), syncError: null },
      });

      await this.db.syncEvent.updateMany({
        where: { listingId: id, type: "PUBLISH", status: "pending" },
        data: {
          status: "success",
          message: `Mercari job queued (${job.id}) — extension will post directly`,
        },
      });

      // Server-side ZenRows fallback: if the extension doesn't complete the job within the
      // grace period, publish it via ZenRows. No-op unless ZENROWS_API_KEY is set.
      scheduleMercariZenRowsFallback(job.id);

      return updated;
    }

    try {
      const connection = await refreshConnectionIfNeeded(
        this.db,
        listing.marketplaceConnection
      );
      const adapter = MarketplaceFactory.create(listing.marketplace, connection);
      const externalId = await adapter.publish(listing);

      const updated = await this.db.listing.update({
        where: { id },
        data: {
          status: "ACTIVE",
          externalId,
          listedAt: new Date(),
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      await this.db.syncEvent.updateMany({
        where: { listingId: id, type: "PUBLISH", status: "pending" },
        data: { status: "success", message: `Published with ID: ${externalId}` },
      });

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.db.listing.update({
        where: { id },
        data: { status: "FAILED", syncError: message },
      });
      await this.db.syncEvent.updateMany({
        where: { listingId: id, type: "PUBLISH", status: "pending" },
        data: { status: "failed", message },
      });
      throw err;
    }
  }

  async delist(id: string, userId: string) {
    const listing = await this.db.listing.findFirst({
      where: { id, userId },
      include: { marketplaceConnection: true },
    });
    if (!listing) throw new Error("Listing not found");

    if (listing.externalId) {
      const connection = await refreshConnectionIfNeeded(
        this.db,
        listing.marketplaceConnection
      );
      const adapter = MarketplaceFactory.create(listing.marketplace, connection);
      await adapter.delist(listing.externalId);
    }

    const updated = await this.db.listing.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date(), lastSyncAt: new Date() },
    });

    await this.db.syncEvent.create({
      data: {
        listingId: id,
        type: "DELIST",
        status: "success",
        message: "Listing delisted",
      },
    });

    return updated;
  }

  async crosslist(
    userId: string,
    input: {
      inventoryItemId: string;
      price: number;
      title: string;
      description?: string;
      publishImmediately: boolean;
      marketplaces: Array<{
        connectionId: string;
        marketplaceData?: Record<string, unknown>;
      }>;
    }
  ) {
    const item = await this.db.inventoryItem.findFirst({
      where: { id: input.inventoryItemId, userId },
      include: { images: { orderBy: { sortOrder: "asc" } }, attributes: true },
    });
    if (!item) throw new Error("Inventory item not found");

    const results: Array<{
      marketplace: string;
      listingId?: string;
      status: string;
      error?: string;
    }> = [];

    for (const mp of input.marketplaces) {
      const connection = await this.db.marketplaceConnection.findFirst({
        where: { id: mp.connectionId, userId },
      });
      if (!connection) {
        results.push({ marketplace: mp.connectionId, status: "error", error: "Connection not found" });
        continue;
      }

      try {
        const listing = await this.db.listing.create({
          data: {
            userId,
            inventoryItemId: input.inventoryItemId,
            marketplaceConnectionId: mp.connectionId,
            marketplace: connection.marketplace,
            price: input.price,
            title: input.title,
            description: input.description,
            marketplaceData: mp.marketplaceData as import("@repo/db").Prisma.InputJsonValue | undefined,
            status: "DRAFT",
          },
        });

        if (!input.publishImmediately) {
          results.push({ marketplace: connection.marketplace, listingId: listing.id, status: "DRAFT" });
          continue;
        }

        if (connection.marketplace === "MERCARI") {
          // Mercari's API is Cloudflare-protected; publish via WebView on the device instead
          results.push({ marketplace: "MERCARI", listingId: listing.id, status: "NEEDS_WEBVIEW" });
        } else {
          await this.publish(listing.id, userId);
          results.push({ marketplace: connection.marketplace, listingId: listing.id, status: "ACTIVE" });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed";
        results.push({ marketplace: connection.marketplace, status: "error", error });
      }
    }

    return results;
  }

  async recordPublished(id: string, userId: string, externalId: string) {
    const listing = await this.db.listing.findFirst({
      where: { id, userId, marketplace: "MERCARI", status: "DRAFT" },
    });
    if (!listing) throw new Error("Listing not found or already published");

    const updated = await this.db.listing.update({
      where: { id },
      data: {
        status: "ACTIVE",
        externalId,
        externalUrl: `https://www.mercari.com/item/${externalId}/`,
        listedAt: new Date(),
        lastSyncAt: new Date(),
        syncError: null,
      },
    });

    await this.db.syncEvent.create({
      data: {
        listingId: id,
        type: "PUBLISH",
        status: "success",
        message: `Published via WebView with ID: ${externalId}`,
      },
    });

    return updated;
  }

  async markSold(id: string, userId: string, soldPrice?: number) {
    const listing = await this.db.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new Error("Listing not found");

    const soldAt = new Date();
    // Fall back to the listing price when no explicit sale price is provided.
    const salePrice = soldPrice ?? Number(listing.price);

    const updated = await this.db.listing.update({
      where: { id },
      data: { status: "SOLD", soldAt, soldPrice: salePrice },
    });

    // Also mark the inventory item as sold if no other active listings remain
    const activeListings = await this.db.listing.count({
      where: {
        inventoryItemId: listing.inventoryItemId,
        status: "ACTIVE",
        id: { not: id },
      },
    });

    if (activeListings === 0) {
      await this.db.inventoryItem.update({
        where: { id: listing.inventoryItemId },
        data: {
          status: "SOLD",
          soldPrice: salePrice,
          soldAt,
          soldVia: listing.marketplace as string,
        },
      });
    }

    await this.db.syncEvent.create({
      data: {
        listingId: id,
        type: "SOLD",
        status: "success",
        message: "Listing marked as sold",
      },
    });

    return updated;
  }
}
