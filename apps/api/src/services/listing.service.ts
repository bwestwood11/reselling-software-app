import type {
  Prisma,
  PrismaClient,
  ListingStatus,
  MarketplaceType,
} from "@repo/db";
import { getPaginationParams, buildPaginatedResponse } from "@repo/utils";
import { MarketplaceFactory } from "./marketplace/factory";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";
import { SubscriptionService } from "./subscription.service";

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
  private subscriptionSvc: SubscriptionService;

  constructor(private db: PrismaClient) {
    this.subscriptionSvc = new SubscriptionService(db);
  }

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
        inventoryItem: { include: { images: true, attributes: true } },
        marketplaceConnection: true,
      },
    });

    if (!listing) throw new Error("Listing not found");

    // Deduct 1 credit (throws if user has no active subscription or no credits)
    await this.subscriptionSvc.deductCredit(
      userId,
      id,
      listing.marketplace as string
    );

    // Create a sync event
    await this.db.syncEvent.create({
      data: {
        listingId: id,
        type: "PUBLISH",
        status: "pending",
        message: "Publishing listing to marketplace",
      },
    });

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
      // Refund the credit since the publish failed
      await this.subscriptionSvc.refundCredit(
        userId,
        id,
        listing.marketplace as string
      );

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

  async markSold(id: string, userId: string) {
    const listing = await this.db.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new Error("Listing not found");

    const updated = await this.db.listing.update({
      where: { id },
      data: { status: "SOLD", soldAt: new Date() },
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
        data: { status: "SOLD" },
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
