import type { PrismaClient, InventoryStatus, Condition } from "@repo/db";
import { getPaginationParams, buildPaginatedResponse } from "@repo/utils";

interface ListOptions {
  page: number;
  limit: number;
  status?: InventoryStatus;
  search?: string;
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
}

export class InventoryService {
  constructor(private db: PrismaClient) {}

  async list(userId: string, opts: ListOptions) {
    const { skip, take, page, limit } = getPaginationParams(opts.page, opts.limit);

    const where = {
      userId,
      ...(opts.status && { status: opts.status }),
      ...(opts.search && {
        OR: [
          { title: { contains: opts.search, mode: "insensitive" as const } },
          { brand: { contains: opts.search, mode: "insensitive" as const } },
          { sku: { contains: opts.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          _count: { select: { listings: true } },
        },
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
    return this.db.inventoryItem.updateMany({
      where: { id, userId },
      data: { status },
    });
  }
}
