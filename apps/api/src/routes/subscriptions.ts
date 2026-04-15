import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import type { PlanKey } from "../config/plans";
import { PLANS } from "../config/plans";

export async function subscriptionRoutes(fastify: FastifyInstance) {
  const svc = new SubscriptionService(fastify.prisma);

  // GET /api/subscriptions/current
  fastify.get(
    "/current",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const data = await svc.getCurrent(request.user!.id);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/checkout
  // Body: { plan: "STARTER" | "PRO" | "PREMIUM" }
  fastify.post<{ Body: { plan: PlanKey } }>(
    "/checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { plan } = request.body ?? {};
      if (!plan || !PLANS[plan]) {
        return reply.status(400).send({ success: false, error: "Invalid plan" });
      }
      try {
        const data = await svc.createCheckoutSession(request.user!.id, plan);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/portal
  fastify.post(
    "/portal",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const data = await svc.createPortalSession(request.user!.id);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );
}
