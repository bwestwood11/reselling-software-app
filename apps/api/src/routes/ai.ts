import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { AIService } from "../services/ai/ai.service.js";
import { SubscriptionService } from "../services/subscription.service.js";
import { AI_CREDIT_COSTS } from "../config/plans.js";

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

      const cost = AI_CREDIT_COSTS.seoDescription;
      const hasCredits = await subscriptionService.checkAiCredits(userId, cost);
      if (!hasCredits) {
        return reply.status(403).send({
          success: false,
          error:
            "You don't have enough smart AI credits to generate a description. Upgrade your plan or buy a top-up.",
        });
      }

      try {
        const data = await aiService.generateDescription(imageUrls, title);
        // Deduct only after a successful generation.
        try {
          await subscriptionService.deductAiCredits(userId, cost, "AI SEO description generated");
        } catch (err) {
          request.log.error({ err }, "[ai] Credit deduction failed after generation");
        }
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI generation failed";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );
}
