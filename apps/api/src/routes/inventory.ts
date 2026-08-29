import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { InventoryService } from "../services/inventory.service";
import { SubscriptionService } from "../services/subscription.service";
import { getPrefillProvider } from "../services/prefill/factory.js";

const imageSchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const createItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  condition: z.enum([
    "NEW_WITH_TAGS",
    "NEW_WITHOUT_TAGS",
    "VERY_GOOD",
    "GOOD",
    "SATISFACTORY",
  ]),
  quantity: z.number().int().min(1).default(1),
  costPrice: z.number().positive().optional(),
  targetPrice: z.number().positive().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  notes: z.string().optional(),
  attributes: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional(),
  images: z.array(imageSchema).optional(),
  sourceId: z.string().min(1).nullable().optional(),
});

const markSoldSchema = z.object({
  soldPrice: z.number().nonnegative(),
  soldVia: z.string().max(255).nullable().optional(),
  soldNote: z.string().max(2000).nullable().optional(),
  soldAt: z.string().datetime().optional(),
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  const svc = new InventoryService(fastify.prisma);
  const subSvc = new SubscriptionService(fastify.prisma);

  // GET /api/inventory
  fastify.get(
    "/",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        search?: string;
        sourceId?: string;
        unassigned?: string;
        withListings?: string;
        marketplace?: string;
        includeListed?: string;
      };

      const result = await svc.list(request.user!.id, {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        status: query.status as any,
        search: query.search,
        sourceId: query.sourceId,
        unassigned: query.unassigned === "true",
        withListings: query.withListings === "true",
        marketplace: query.marketplace as any,
        includeListed: query.includeListed === "true",
      });

      return reply.send({ success: true, ...result });
    }
  );

  // GET /api/inventory/:id
  fastify.get(
    "/:id",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const item = await svc.findById(id, request.user!.id);

      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      return reply.send({ success: true, data: item });
    }
  );

  // POST /api/inventory
  fastify.post(
    "/",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      try {
        await subSvc.assertCanAddInventory(request.user!.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Inventory limit reached";
        return reply.status(403).send({ success: false, error: message });
      }

      const body = createItemSchema.parse(request.body);
      const item = await svc.create(request.user!.id, body);
      return reply.status(201).send({ success: true, data: item });
    }
  );

  // PUT /api/inventory/:id
  fastify.put(
    "/:id",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createItemSchema.partial().parse(request.body);
      const item = await svc.update(id, request.user!.id, body);

      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      return reply.send({ success: true, data: item });
    }
  );

  // DELETE /api/inventory/:id
  fastify.delete(
    "/:id",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await svc.delete(id, request.user!.id);
      return reply.send({ success: true, message: "Item deleted" });
    }
  );

  // PATCH /api/inventory/:id/status
  fastify.patch(
    "/:id/status",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const item = await svc.updateStatus(id, request.user!.id, status as any);
      return reply.send({ success: true, data: item });
    }
  );

  // POST /api/inventory/:id/mark-sold
  fastify.post(
    "/:id/mark-sold",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = markSoldSchema.parse(request.body);
      const item = await svc.markSold(id, request.user!.id, {
        soldPrice: body.soldPrice,
        soldVia: body.soldVia,
        soldNote: body.soldNote,
        soldAt: body.soldAt ? new Date(body.soldAt) : undefined,
      });
      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }
      return reply.send({ success: true, data: item });
    }
  );

  // GET /api/inventory/:id/prefill?marketplace=MERCARI
  fastify.get(
    "/:id/prefill",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { marketplace } = request.query as { marketplace?: string };
      if (!marketplace) {
        return reply.status(400).send({ success: false, error: "marketplace query param required" });
      }
      try {
        const provider = getPrefillProvider(marketplace.toUpperCase(), fastify.prisma);
        const data = await provider.getPrefill(id, request.user!.id);
        return reply.send({ success: true, data });
      } catch (err: any) {
        if (err.statusCode === 404) return reply.status(404).send({ success: false, error: "Item not found" });
        if (err.statusCode === 400) return reply.status(400).send({ success: false, error: err.message });
        throw err;
      }
    }
  );
}
