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
        select: {
          sourceId: true,
          costPrice: true,
          targetPrice: true,
          soldPrice: true,
          quantity: true,
          status: true,
        },
      }),
    ]);

    // `totalRevenue` is money actually collected (sold items only) — kept accurate
    // as-is. `profit` blends that with the *potential* margin on unsold stock
    // (target price − cost), so a folder full of not-yet-sold items reads as its
    // projected margin instead of a loss equal to everything spent sourcing it.
    type FlatStats = { totalCost: number; totalRevenue: number; projectedValue: number; directItemCount: number };
    const statsMap = new Map<string, FlatStats>();
    for (const src of sources) {
      statsMap.set(src.id, { totalCost: 0, totalRevenue: 0, projectedValue: 0, directItemCount: 0 });
    }

    for (const item of items) {
      const s = statsMap.get(item.sourceId!);
      if (!s) continue;
      s.directItemCount += 1;
      if (item.costPrice) s.totalCost += Number(item.costPrice) * item.quantity;
      if (item.status === "SOLD") {
        // Prefer the actual sale price (total received for the item). Fall back to
        // the target price for legacy sold items recorded before soldPrice existed.
        const revenue =
          item.soldPrice != null
            ? Number(item.soldPrice)
            : item.targetPrice
              ? Number(item.targetPrice) * item.quantity
              : 0;
        s.totalRevenue += revenue;
        s.projectedValue += revenue;
      } else if (item.targetPrice) {
        s.projectedValue += Number(item.targetPrice) * item.quantity;
      }
    }

    // Each recursive call carries its subtree's projected value alongside the
    // public SourceStats shape, so parents can roll it up without leaking an
    // internal field into the API response.
    const buildTree = (parentId: string | null): Array<{ stats: SourceStats; projectedValue: number }> => {
      return sources
        .filter((s) => s.parentId === parentId)
        .map((s) => {
          const childNodes = buildTree(s.id);
          const direct = statsMap.get(s.id)!;
          const totalCost = direct.totalCost + childNodes.reduce((a, c) => a + c.stats.totalCost, 0);
          const totalRevenue = direct.totalRevenue + childNodes.reduce((a, c) => a + c.stats.totalRevenue, 0);
          const projectedValue = direct.projectedValue + childNodes.reduce((a, c) => a + c.projectedValue, 0);
          const itemCount = direct.directItemCount + childNodes.reduce((a, c) => a + c.stats.itemCount, 0);
          return {
            stats: {
              id: s.id,
              name: s.name,
              parentId: s.parentId,
              itemCount,
              totalCost,
              totalRevenue,
              profit: projectedValue - totalCost,
              children: childNodes.map((c) => c.stats),
            },
            projectedValue,
          };
        });
    };

    return buildTree(null).map((n) => n.stats);
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
