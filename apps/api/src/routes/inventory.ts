import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { InventoryService } from "../services/inventory.service";

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
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  const svc = new InventoryService(fastify.prisma);

  // GET /api/inventory
  fastify.get(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        search?: string;
      };

      const result = await svc.list(request.user!.id, {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        status: query.status as any,
        search: query.search,
      });

      return reply.send({ success: true, ...result });
    }
  );

  // GET /api/inventory/:id
  fastify.get(
    "/:id",
    { preHandler: [requireAuth] },
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
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = createItemSchema.parse(request.body);
      const item = await svc.create(request.user!.id, body);
      return reply.status(201).send({ success: true, data: item });
    }
  );

  // PUT /api/inventory/:id
  fastify.put(
    "/:id",
    { preHandler: [requireAuth] },
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
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await svc.delete(id, request.user!.id);
      return reply.send({ success: true, message: "Item deleted" });
    }
  );

  // PATCH /api/inventory/:id/status
  fastify.patch(
    "/:id/status",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const item = await svc.updateStatus(id, request.user!.id, status as any);
      return reply.send({ success: true, data: item });
    }
  );
}
