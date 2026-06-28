import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { AIService } from "../services/ai/ai.service.js";
import { SubscriptionService } from "../services/subscription.service.js";

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
  const subscriptionService = new SubscriptionService(fastify.prisma);

  fastify.post(
    "/generate",
    { preHandler: [requireAuth], schema: { body: generateBodySchema } },
    async (request, reply) => {
      const userId = request.user!.id;
      const { imageUrls, title } = request.body as { imageUrls: string[]; title?: string };

      const hasAccess = await subscriptionService.checkAiDescriptionAccess(userId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: "AI description generation requires a paid plan. Upgrade to unlock this feature.",
        });
      }

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
