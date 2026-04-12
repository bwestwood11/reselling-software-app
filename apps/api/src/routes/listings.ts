import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { ListingService } from "../services/listing.service";

const createListingSchema = z.object({
  inventoryItemId: z.string(),
  marketplaceConnectionId: z.string(),
  marketplace: z.enum([
    "EBAY",
    "FACEBOOK_MARKETPLACE",
    "DEPOP",
    "MERCARI",
    "POSHMARK",
    "ETSY",
  ]),
  price: z.number().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  marketplaceData: z.record(z.string(), z.unknown()).optional(),
});

export async function listingsRoutes(fastify: FastifyInstance) {
  const svc = new ListingService(fastify.prisma);

  // GET /api/listings
  fastify.get(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        marketplace?: string;
        inventoryItemId?: string;
      };

      const result = await svc.list(request.user!.id, {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        status: query.status as any,
        marketplace: query.marketplace as any,
        inventoryItemId: query.inventoryItemId,
      });

      return reply.send({ success: true, ...result });
    }
  );

  // GET /api/listings/:id
  fastify.get(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const listing = await svc.findById(id, request.user!.id);

      if (!listing) {
        return reply.status(404).send({ success: false, error: "Listing not found" });
      }

      return reply.send({ success: true, data: listing });
    }
  );

  // POST /api/listings
  fastify.post(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = createListingSchema.parse(request.body);
      const listing = await svc.create(request.user!.id, body);
      return reply.status(201).send({ success: true, data: listing });
    }
  );

  // PUT /api/listings/:id
  fastify.put(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createListingSchema.partial().parse(request.body);
      const listing = await svc.update(id, request.user!.id, body);

      if (!listing) {
        return reply.status(404).send({ success: false, error: "Listing not found" });
      }

      return reply.send({ success: true, data: listing });
    }
  );

  // DELETE /api/listings/:id
  fastify.delete(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await svc.delete(id, request.user!.id);
      return reply.send({ success: true, message: "Listing deleted" });
    }
  );

  // POST /api/listings/:id/publish
  fastify.post(
    "/:id/publish",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await svc.publish(id, request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/listings/:id/delist
  fastify.post(
    "/:id/delist",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await svc.delist(id, request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/listings/:id/mark-sold
  fastify.post(
    "/:id/mark-sold",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await svc.markSold(id, request.user!.id);
      return reply.send({ success: true, data: result });
    }
  );
}
