import type { PrismaClient } from "@repo/db";
import type { SourceStats } from "@repo/types";

export class SourceService {
  constructor(private db: PrismaClient) {}

  async list(userId: string) {
    return this.db.source.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string, userId: string) {
    return this.db.source.findFirst({ where: { id, userId } });
  }

  async create(userId: string, name: string, parentId?: string) {
    if (parentId) {
      const parent = await this.db.source.findFirst({ where: { id: parentId, userId } });
      if (!parent) throw new Error("Parent source not found");
    }
    return this.db.source.create({ data: { userId, name, parentId: parentId ?? null } });
  }

  async update(id: string, userId: string, data: { name?: string; parentId?: string | null }) {
    const source = await this.db.source.findFirst({ where: { id, userId } });
    if (!source) return null;

    if (data.parentId) {
      if (data.parentId === id) throw new Error("A source cannot be its own parent");
      const isDescendant = await this._isDescendant(data.parentId, id, userId);
      if (isDescendant) throw new Error("Cannot create circular source hierarchy");
      const parent = await this.db.source.findFirst({ where: { id: data.parentId, userId } });
      if (!parent) throw new Error("Parent source not found");
    }

    return this.db.source.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const source = await this.db.source.findFirst({ where: { id, userId } });
    if (!source) return;

    await this.db.$transaction([
      this.db.inventoryItem.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
      this.db.source.updateMany({ where: { parentId: id }, data: { parentId: source.parentId } }),
      this.db.source.delete({ where: { id } }),
    ]);
  }

  async getStats(userId: string): Promise<SourceStats[]> {
    const [sources, items] = await Promise.all([
      this.db.source.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      this.db.inventoryItem.findMany({
        where: { userId, sourceId: { not: null } },
        select: { sourceId: true, costPrice: true, targetPrice: true, quantity: true, status: true },
      }),
    ]);

    type FlatStats = { totalCost: number; totalRevenue: number; directItemCount: number };
    const statsMap = new Map<string, FlatStats>();
    for (const src of sources) {
      statsMap.set(src.id, { totalCost: 0, totalRevenue: 0, directItemCount: 0 });
    }

    for (const item of items) {
      const s = statsMap.get(item.sourceId!);
      if (!s) continue;
      s.directItemCount += 1;
      if (item.costPrice) s.totalCost += Number(item.costPrice) * item.quantity;
      if (item.status === "SOLD" && item.targetPrice) {
        s.totalRevenue += Number(item.targetPrice) * item.quantity;
      }
    }

    const buildTree = (parentId: string | null): SourceStats[] => {
      return sources
        .filter((s) => s.parentId === parentId)
        .map((s) => {
          const children = buildTree(s.id);
          const direct = statsMap.get(s.id)!;
          const totalCost = direct.totalCost + children.reduce((a, c) => a + c.totalCost, 0);
          const totalRevenue = direct.totalRevenue + children.reduce((a, c) => a + c.totalRevenue, 0);
          const itemCount = direct.directItemCount + children.reduce((a, c) => a + c.itemCount, 0);
          return {
            id: s.id,
            name: s.name,
            parentId: s.parentId,
            itemCount,
            totalCost,
            totalRevenue,
            profit: totalRevenue - totalCost,
            children,
          };
        });
    };

    return buildTree(null);
  }

  private async _isDescendant(candidateId: string, ancestorId: string, userId: string): Promise<boolean> {
    const sources = await this.db.source.findMany({ where: { userId }, select: { id: true, parentId: true } });
    const parentMap = new Map(sources.map((s) => [s.id, s.parentId]));
    let current: string | null | undefined = candidateId;
    while (current) {
      if (current === ancestorId) return true;
      current = parentMap.get(current);
    }
    return false;
  }
}
