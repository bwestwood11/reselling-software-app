import type { PrismaClient, InventoryStatus, Condition } from "@repo/db";
import { getPaginationParams, buildPaginatedResponse } from "@repo/utils";

interface ListOptions {
  page: number;
  limit: number;
  status?: InventoryStatus;
  search?: string;
  sourceId?: string;
  unassigned?: boolean; // true → items with sourceId IS NULL
  withListings?: boolean; // include listing status per marketplace
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

    const where = {
      userId,
      ...(opts.status && { status: opts.status }),
      ...(opts.unassigned ? { sourceId: null } : opts.sourceId ? { sourceId: opts.sourceId } : {}),
      ...(opts.search && {
        OR: [
          { title: { contains: opts.search, mode: "insensitive" as const } },
          { brand: { contains: opts.search, mode: "insensitive" as const } },
          { sku: { contains: opts.search, mode: "insensitive" as const } },
        ],
      }),
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
                select: {
                  id: true,
                  marketplace: true,
                  status: true,
                  price: true,
                  externalUrl: true,
                  title: true,
                  description: true,
                  marketplaceData: true,
                },
              },
            }
          : baseInclude,
      }),
      this.db.inventoryItem.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
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
