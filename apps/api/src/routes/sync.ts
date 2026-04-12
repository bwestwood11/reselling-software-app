import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { SyncService } from "../services/sync.service";

export async function syncRoutes(fastify: FastifyInstance) {
  const svc = new SyncService(fastify.prisma);

  // POST /api/sync/all — trigger sync for all active listings
  fastify.post(
    "/all",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await svc.syncAll(request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/sync/listing/:id — sync a specific listing
  fastify.post(
    "/listing/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await svc.syncListing(id, request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/sync/events — recent sync events for the user
  fastify.get(
    "/events",
    { preHandler: [requireAuth] },
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
