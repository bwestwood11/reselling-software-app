import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  ListingService,
  PublishRetryLimitError,
  MAX_PUBLISH_ATTEMPTS,
} from "../services/listing.service";

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

const crosslistSchema = z.object({
  inventoryItemId: z.string(),
  price: z.number().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  publishImmediately: z.boolean().default(true),
  marketplaces: z
    .array(
      z.object({
        connectionId: z.string(),
        marketplaceData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1),
});

const markSoldSchema = z.object({
  soldPrice: z.number().nonnegative().optional(),
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

  // POST /api/listings/crosslist
  fastify.post(
    "/crosslist",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = crosslistSchema.parse(request.body);
      const results = await svc.crosslist(request.user!.id, body);
      return reply.status(201).send({ success: true, data: results });
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

  // POST /api/listings/:id/publish — also used to retry a FAILED listing
  fastify.post(
    "/:id/publish",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const result = await svc.publish(id, request.user!.id);
        return reply.send({ success: true, data: result });
      } catch (err) {
        // Surface the marketplace's own message — the default 500 body only says
        // "Internal Server Error", which tells the seller nothing about the failure.
        const error = err instanceof Error ? err.message : "Failed to publish listing";
        const status = err instanceof PublishRetryLimitError ? 409 : 400;

        const listing = await svc.findById(id, request.user!.id);
        return reply.status(status).send({
          success: false,
          error,
          retriesLeft: listing ? Math.max(0, MAX_PUBLISH_ATTEMPTS - listing.publishAttempts) : 0,
        });
      }
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

  // POST /api/listings/:id/record-published  (Mercari WebView flow)
  fastify.post(
    "/:id/record-published",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { externalId } = request.body as { externalId?: string };

      if (!externalId?.trim()) {
        return reply.status(400).send({ success: false, error: "externalId is required" });
      }

      const result = await svc.recordPublished(id, request.user!.id, externalId.trim());
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/listings/:id/mark-sold
  fastify.post(
    "/:id/mark-sold",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = markSoldSchema.parse(request.body ?? {});
      const result = await svc.markSold(id, request.user!.id, body.soldPrice);
      return reply.send({ success: true, data: result });
    }
  );
}
