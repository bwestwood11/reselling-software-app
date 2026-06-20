import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { AIService } from "../services/ai/ai.service.js";

const generateBodySchema = {
  type: "object",
  required: ["imageUrls"],
  properties: {
    imageUrls: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 10,
    },
    title: { type: "string" },
  },
} as const;

export async function aiRoutes(fastify: FastifyInstance) {
  const aiService = new AIService();

  fastify.post(
    "/generate",
    { preHandler: [requireAuth], schema: { body: generateBodySchema } },
    async (request, reply) => {
      const { imageUrls, title } = request.body as { imageUrls: string[]; title?: string };

      try {
        const data = await aiService.generateDescription(imageUrls, title);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI generation failed";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );
}
