import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { SourceService } from "../services/source.service";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
});

export async function sourcesRoutes(fastify: FastifyInstance) {
  const svc = new SourceService(fastify.prisma);

  // GET /api/sources
  fastify.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const sources = await svc.list(request.user!.id);
    return reply.send({ success: true, data: sources });
  });

  // GET /api/sources/stats
  fastify.get("/stats", { preHandler: [requireAuth] }, async (request, reply) => {
    const stats = await svc.getStats(request.user!.id);
    return reply.send({ success: true, data: stats });
  });

  // GET /api/sources/:id
  fastify.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const source = await svc.findById(id, request.user!.id);
    if (!source) return reply.status(404).send({ success: false, error: "Source not found" });
    return reply.send({ success: true, data: source });
  });

  // POST /api/sources
  fastify.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { name, parentId } = createSchema.parse(request.body);
    try {
      const source = await svc.create(request.user!.id, name, parentId);
      return reply.status(201).send({ success: true, data: source });
    } catch (err: unknown) {
      return reply.status(400).send({ success: false, error: (err as Error).message });
    }
  });

  // PUT /api/sources/:id
  fastify.put("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    try {
      const source = await svc.update(id, request.user!.id, body);
      if (!source) return reply.status(404).send({ success: false, error: "Source not found" });
      return reply.send({ success: true, data: source });
    } catch (err: unknown) {
      return reply.status(400).send({ success: false, error: (err as Error).message });
    }
  });

  // DELETE /api/sources/:id
  fastify.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.delete(id, request.user!.id);
    return reply.send({ success: true, message: "Source deleted" });
  });
}
