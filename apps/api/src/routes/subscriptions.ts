import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import type { PlanKey, BillingInterval } from "../config/plans";
import { PLANS } from "../config/plans";

export async function subscriptionRoutes(fastify: FastifyInstance) {
  const svc = new SubscriptionService(fastify.prisma);

  // GET /api/subscriptions/current
  fastify.get("/current", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await svc.getCurrent(request.user!.id);
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/subscriptions/checkout
  // Body: { plan: "SIDE_HUSTLE" | "FULL_TIME", interval?: "monthly" | "yearly" }
  fastify.post<{ Body: { plan: PlanKey; interval?: BillingInterval } }>(
    "/checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { plan, interval = "monthly" } = request.body ?? {};
      if (!plan || !PLANS[plan]) {
        return reply.status(400).send({ success: false, error: "Invalid plan" });
      }
      if (interval !== "monthly" && interval !== "yearly") {
        return reply.status(400).send({ success: false, error: "Invalid billing interval" });
      }
      try {
        const data = await svc.createCheckoutSession(request.user!.id, plan, interval);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/topup-checkout
  // Body: { packs?: number (1–10) } — buys packs of smart AI credits
  fastify.post<{ Body: { packs?: number } }>(
    "/topup-checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { packs = 1 } = request.body ?? {};
      const packsNum = Math.max(1, Math.min(10, Math.floor(Number(packs))));
      try {
        const data = await svc.createTopupCheckoutSession(request.user!.id, packsNum);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/verify-session
  // Body: { sessionId: string } — verify a Stripe Checkout Session on return and
  // provision the subscription/credits idempotently (does not trust the webhook).
  fastify.post<{ Body: { sessionId?: string } }>(
    "/verify-session",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { sessionId } = request.body ?? {};
      if (!sessionId) {
        return reply.status(400).send({ success: false, error: "sessionId is required" });
      }
      try {
        const data = await svc.verifyAndProvisionSession(request.user!.id, sessionId);
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/portal
  fastify.post("/portal", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await svc.createPortalSession(request.user!.id);
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
