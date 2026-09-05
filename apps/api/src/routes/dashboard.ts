import type { FastifyInstance } from "fastify";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { startOfMonth } from "@repo/utils";

/** YYYY-MM-DD in the server's local time zone. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DDTHH in the server's local time zone — used for the hourly "today" view. */
function hourKey(d: Date): string {
  return `${dateKey(d)}T${String(d.getHours()).padStart(2, "0")}`;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
    { preHandler: [requireAuth, requireActiveSubscription] },
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
        inventoryStatusCounts,
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
        fastify.prisma.inventoryItem.groupBy({
          by: ["status"],
          where: { userId },
          _count: { id: true },
        }),
      ]);

      const inventoryByStatus = inventoryStatusCounts.map((row) => ({
        status: row.status,
        count: row._count.id,
      }));

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
          inventoryByStatus,
        },
      });
    }
  );

  // GET /api/dashboard/trend — sales revenue / units sold / listings-published, bucketed by
  // day (or by hour for "today"), for the Sales Trend chart's date-range picker.
  const PRESET_DAYS: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30 };
  const MAX_CUSTOM_RANGE_DAYS = 90;

  fastify.get(
    "/trend",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const userId = request.user!.id;
      const query = request.query as { preset?: string; startDate?: string; endDate?: string };
      const preset = query.preset ?? "14d";

      let rangeStart: Date;
      let rangeEndExclusive: Date;
      let granularity: "hour" | "day" = "day";

      if (preset === "today") {
        granularity = "hour";
        rangeStart = new Date();
        rangeStart.setHours(0, 0, 0, 0);
        rangeEndExclusive = new Date(rangeStart);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
      } else if (preset === "custom") {
        if (!query.startDate || !query.endDate) {
          return reply
            .status(400)
            .send({ success: false, error: "startDate and endDate are required for a custom range" });
        }
        const start = new Date(`${query.startDate}T00:00:00`);
        const end = new Date(`${query.endDate}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
          return reply.status(400).send({ success: false, error: "Invalid date range" });
        }
        const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
        if (spanDays > MAX_CUSTOM_RANGE_DAYS) {
          return reply
            .status(400)
            .send({ success: false, error: `Custom range can't exceed ${MAX_CUSTOM_RANGE_DAYS} days` });
        }
        rangeStart = start;
        rangeEndExclusive = new Date(end);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
      } else {
        const days = PRESET_DAYS[preset] ?? PRESET_DAYS["14d"]!;
        rangeEndExclusive = new Date();
        rangeEndExclusive.setHours(0, 0, 0, 0);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
        rangeStart = new Date(rangeEndExclusive);
        rangeStart.setDate(rangeStart.getDate() - days);
      }

      const [soldListings, createdListings] = await Promise.all([
        fastify.prisma.listing.findMany({
          where: { userId, status: "SOLD", soldAt: { gte: rangeStart, lt: rangeEndExclusive } },
          select: { price: true, soldAt: true },
        }),
        fastify.prisma.listing.findMany({
          where: { userId, listedAt: { gte: rangeStart, lt: rangeEndExclusive } },
          select: { listedAt: true },
        }),
      ]);

      const bucketMap = new Map<string, { revenue: number; unitsSold: number; listingsCreated: number }>();
      const keyOf = granularity === "hour" ? hourKey : dateKey;

      if (granularity === "hour") {
        for (let h = 0; h < 24; h++) {
          const d = new Date(rangeStart);
          d.setHours(h);
          bucketMap.set(hourKey(d), { revenue: 0, unitsSold: 0, listingsCreated: 0 });
        }
      } else {
        const totalDays = Math.round((rangeEndExclusive.getTime() - rangeStart.getTime()) / 86_400_000);
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(rangeStart);
          d.setDate(d.getDate() + i);
          bucketMap.set(dateKey(d), { revenue: 0, unitsSold: 0, listingsCreated: 0 });
        }
      }

      for (const listing of soldListings) {
        if (!listing.soldAt) continue;
        const bucket = bucketMap.get(keyOf(listing.soldAt));
        if (bucket) {
          bucket.revenue += Number(listing.price);
          bucket.unitsSold += 1;
        }
      }
      for (const listing of createdListings) {
        if (!listing.listedAt) continue;
        const bucket = bucketMap.get(keyOf(listing.listedAt));
        if (bucket) bucket.listingsCreated += 1;
      }

      const points = Array.from(bucketMap.entries()).map(([date, v]) => ({ date, ...v }));

      return reply.send({ success: true, data: { granularity, points } });
    }
  );
}
