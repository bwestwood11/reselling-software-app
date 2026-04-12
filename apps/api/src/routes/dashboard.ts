import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { startOfMonth } from "@repo/utils";

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;
      const monthStart = startOfMonth();

      const [
        totalInventory,
        activeListings,
        soldThisMonth,
        revenueResult,
        recentSyncEvents,
        listingsByMarketplace,
      ] = await Promise.all([
        fastify.prisma.inventoryItem.count({ where: { userId } }),
        fastify.prisma.listing.count({ where: { userId, status: "ACTIVE" } }),
        fastify.prisma.listing.count({
          where: { userId, status: "SOLD", soldAt: { gte: monthStart } },
        }),
        fastify.prisma.listing.aggregate({
          where: { userId, status: "SOLD" },
          _sum: { price: true },
        }),
        fastify.prisma.syncEvent.findMany({
          where: { listing: { userId } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { listing: { select: { title: true, marketplace: true } } },
        }),
        fastify.prisma.listing.groupBy({
          by: ["marketplace", "status"],
          where: { userId },
          _count: { id: true },
        }),
      ]);

      // Reshape marketplace counts
      const marketplaceMap: Record<
        string,
        { marketplace: string; count: number; active: number }
      > = {};
      for (const row of listingsByMarketplace) {
        if (!marketplaceMap[row.marketplace]) {
          marketplaceMap[row.marketplace] = {
            marketplace: row.marketplace,
            count: 0,
            active: 0,
          };
        }
        marketplaceMap[row.marketplace]!.count += row._count.id;
        if (row.status === "ACTIVE") {
          marketplaceMap[row.marketplace]!.active += row._count.id;
        }
      }

      return reply.send({
        success: true,
        data: {
          totalInventory,
          activeListings,
          soldThisMonth,
          totalRevenue: Number(revenueResult._sum.price ?? 0),
          recentSyncEvents: recentSyncEvents.map((e) => ({
            id: e.id,
            listingId: e.listingId,
            listingTitle: e.listing.title,
            marketplace: e.listing.marketplace,
            type: e.type,
            status: e.status,
            createdAt: e.createdAt,
          })),
          listingsByMarketplace: Object.values(marketplaceMap),
        },
      });
    }
  );
}
