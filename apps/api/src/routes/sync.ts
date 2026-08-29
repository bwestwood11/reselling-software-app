import type { FastifyInstance } from "fastify";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { SyncService } from "../services/sync.service";
import { EbayStatusService } from "../services/ebay-status.service";

export async function syncRoutes(fastify: FastifyInstance) {
  const svc = new SyncService(fastify.prisma);
  const ebayStatus = new EbayStatusService(fastify.prisma);

  // POST /api/sync/import-ebay — import active eBay listings into inventory
  fastify.post(
    "/import-ebay",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const result = await svc.importFromEbay(request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/sync/all — trigger sync for all active listings
  fastify.post(
    "/all",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const result = await svc.syncAll(request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/sync/listing/:id — sync a specific listing
  fastify.post(
    "/listing/:id",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await svc.syncListing(id, request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // ─── eBay status checking (hourly sold detection) ───────────────────────────
  //
  // The eBay counterpart of the Mercari/Poshmark sweeps. eBay has a real API, so this runs
  // server-side with no extension in the loop — but a sale it finds goes through the same
  // handleSold() as the others, so the copies of that item on every other marketplace are
  // delisted automatically. The hourly cron in jobs/sync.job.ts calls the same sweep.

  // POST /api/sync/ebay/status-check — sweep now. `force: true` skips the once-an-hour interval.
  fastify.post("/ebay/status-check", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const body = (request.body ?? {}) as { force?: boolean };
    try {
      const result = await ebayStatus.sweep(request.user!.id, { force: body.force === true });
      return reply.send({ success: true, data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "eBay status check failed";
      return reply.status(502).send({ success: false, error: message });
    }
  });

  // GET /api/sync/ebay/status-check/runs — recent eBay sweeps, newest first.
  fastify.get("/ebay/status-check/runs", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Number.parseInt(query.limit ?? "20", 10) || 20, 100);
    const runs = await ebayStatus.listRuns(request.user!.id, limit);
    return reply.send({ success: true, data: runs });
  });

  // GET /api/sync/events — recent sync events for the user
  fastify.get(
    "/events",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string };
      const page = parseInt(query.page ?? "1");
      const limit = parseInt(query.limit ?? "20");

      const [events, total] = await Promise.all([
        fastify.prisma.syncEvent.findMany({
          where: { listing: { userId: request.user!.id } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            listing: { select: { title: true, marketplace: true, externalId: true } },
          },
        }),
        fastify.prisma.syncEvent.count({
          where: { listing: { userId: request.user!.id } },
        }),
      ]);

      return reply.send({
        success: true,
        data: events,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }
  );
}
