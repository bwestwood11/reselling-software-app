import type { Prisma, PrismaClient, InventoryStatus, Condition, MarketplaceType } from "@repo/db";
import { getPaginationParams, buildPaginatedResponse } from "@repo/utils";

/** Listing states that mean "this item is currently live on a marketplace". */
const LIVE_LISTING_STATUSES = ["ACTIVE", "PENDING"] as const;

interface ListOptions {
  page: number;
  limit: number;
  status?: InventoryStatus;
  search?: string;
  sourceId?: string;
  unassigned?: boolean; // true → items with sourceId IS NULL
  withListings?: boolean; // include listing status per marketplace
  marketplace?: MarketplaceType; // only items that have a listing on this marketplace
  includeListed?: boolean; // treat "has a live listing" as ACTIVE (listings board view)
}

interface ImageInput {
  url: string;
  key: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface CreateInput {
  title: string;
  description?: string;
  sku?: string;
  condition: Condition;
  quantity: number;
  costPrice?: number;
  targetPrice?: number;
  brand?: string;
  category?: string;
  tags?: string[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  notes?: string;
  attributes?: Array<{ name: string; value: string }>;
  images?: ImageInput[];
  sourceId?: string | null;
}

export class InventoryService {
  constructor(private db: PrismaClient) {}

  async list(userId: string, opts: ListOptions) {
    const { skip, take, page, limit } = getPaginationParams(opts.page, opts.limit);

    // Conditions are ANDed through an explicit array so that several of them can
    // each carry their own OR without clobbering one another.
    const and: Prisma.InventoryItemWhereInput[] = [];

    const statusFilter = this.buildStatusFilter(opts);
    if (statusFilter) and.push(statusFilter);

    if (opts.search) {
      and.push({
        OR: [
          { title: { contains: opts.search, mode: "insensitive" } },
          { brand: { contains: opts.search, mode: "insensitive" } },
          { sku: { contains: opts.search, mode: "insensitive" } },
        ],
      });
    }

    // Filter by marketplace server-side — doing it on the client only filtered the
    // current page, so matching items on later pages silently disappeared.
    if (opts.marketplace) {
      and.push({ listings: { some: { marketplace: opts.marketplace } } });
    }

    const where: Prisma.InventoryItemWhereInput = {
      userId,
      ...(opts.unassigned ? { sourceId: null } : opts.sourceId ? { sourceId: opts.sourceId } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    const baseInclude = {
      images: { orderBy: { sortOrder: "asc" as const } },
      source: { select: { id: true, name: true, parentId: true } },
      _count: { select: { listings: true } },
    };

    const [data, total] = await Promise.all([
      this.db.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: opts.withListings
          ? {
              ...baseInclude,
              listings: {
                orderBy: { createdAt: "desc" as const },
                select: {
                  id: true,
                  marketplace: true,
                  status: true,
                  price: true,
                  externalUrl: true,
                  title: true,
                  description: true,
                  marketplaceData: true,
                  syncError: true,
                  publishAttempts: true,
                  createdAt: true,
                },
              },
            }
          : baseInclude,
      }),
      this.db.inventoryItem.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  /**
   * An item's own `status` lags behind reality — publishing a listing doesn't always
   * flip the item to ACTIVE, so items that are live on a marketplace used to fall out
   * of the "Listed" tab entirely. When `includeListed` is set, live listings count.
   */
  private buildStatusFilter(opts: ListOptions): Prisma.InventoryItemWhereInput | null {
    if (!opts.status) return null;
    if (!opts.includeListed) return { status: opts.status };

    if (opts.status === "ACTIVE") {
      return {
        status: { notIn: ["SOLD", "ARCHIVED"] },
        OR: [
          { status: "ACTIVE" },
          { listings: { some: { status: { in: [...LIVE_LISTING_STATUSES] } } } },
        ],
      };
    }

    if (opts.status === "DRAFT") {
      // Keep the tabs mutually exclusive: a draft item that is already live counts
      // as listed, not as a draft.
      return {
        status: "DRAFT",
        listings: { none: { status: { in: [...LIVE_LISTING_STATUSES] } } },
      };
    }

    return { status: opts.status };
  }

  async findById(id: string, userId: string) {
    return this.db.inventoryItem.findFirst({
      where: { id, userId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        attributes: true,
        source: { select: { id: true, name: true, parentId: true } },
        listings: {
          include: { marketplaceConnection: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async create(userId: string, input: CreateInput) {
    const { attributes, dimensions, images, ...rest } = input;

    return this.db.inventoryItem.create({
      data: {
        ...rest,
        userId,
        dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
        attributes: attributes ? { create: attributes } : undefined,
        images: images ? { create: images } : undefined,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        attributes: true,
      },
    });
  }

  async update(id: string, userId: string, input: Partial<CreateInput>) {
    const existing = await this.db.inventoryItem.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;

    const { attributes, dimensions, images, ...rest } = input;

    return this.db.inventoryItem.update({
      where: { id },
      data: {
        ...rest,
        dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
        ...(attributes && {
          attributes: { deleteMany: {}, create: attributes },
        }),
        ...(images && {
          images: { deleteMany: {}, create: images },
        }),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        attributes: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.db.inventoryItem.deleteMany({ where: { id, userId } });
  }

  async updateStatus(id: string, userId: string, status: InventoryStatus) {
    // Moving an item away from SOLD clears any recorded sale details so stale
    // revenue never lingers on an item that's back in stock.
    const clearSold =
      status !== "SOLD"
        ? { soldPrice: null, soldAt: null, soldVia: null, soldNote: null }
        : {};

    return this.db.inventoryItem.updateMany({
      where: { id, userId },
      data: { status, ...clearSold },
    });
  }

  async markSold(
    id: string,
    userId: string,
    input: { soldPrice: number; soldVia?: string | null; soldNote?: string | null; soldAt?: Date }
  ) {
    const existing = await this.db.inventoryItem.findFirst({ where: { id, userId } });
    if (!existing) return null;

    return this.db.inventoryItem.update({
      where: { id },
      data: {
        status: "SOLD",
        soldPrice: input.soldPrice,
        soldAt: input.soldAt ?? new Date(),
        soldVia: input.soldVia ?? null,
        soldNote: input.soldNote ?? null,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        attributes: true,
        source: { select: { id: true, name: true, parentId: true } },
      },
    });
  }
}
