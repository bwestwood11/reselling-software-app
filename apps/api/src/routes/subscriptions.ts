import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import type { PlanKey, BillingInterval } from "../config/plans";
import { PLANS } from "../config/plans";
import type { GaIds } from "../services/google-analytics";

/** Accept only well-formed GA ids (client "<digits>.<digits>", session "<digits>") — they end up in Stripe metadata. */
function parseGaIds(body: { gaClientId?: unknown; gaSessionId?: unknown }): GaIds {
  const pick = (value: unknown, pattern: RegExp) =>
    typeof value === "string" && pattern.test(value) ? value : undefined;
  return {
    clientId: pick(body.gaClientId, /^\d{1,20}\.\d{1,20}$/),
    sessionId: pick(body.gaSessionId, /^\d{1,20}$/),
  };
}

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
  // Body: { plan: "SIDE_HUSTLE" | "FULL_TIME", interval?: "monthly" | "yearly", gaClientId?: string, gaSessionId?: string }
  fastify.post<{
    Body: { plan: PlanKey; interval?: BillingInterval; gaClientId?: string; gaSessionId?: string };
  }>(
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
        const data = await svc.createCheckoutSession(
          request.user!.id,
          plan,
          interval,
          parseGaIds(request.body ?? {})
        );
        return reply.send({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({ success: false, error: message });
      }
    }
  );

  // POST /api/subscriptions/topup-checkout
  // Body: { packs?: number (1–10), gaClientId?: string, gaSessionId?: string } — buys packs of smart AI credits
  fastify.post<{ Body: { packs?: number; gaClientId?: string; gaSessionId?: string } }>(
    "/topup-checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { packs = 1 } = request.body ?? {};
      const packsNum = Math.max(1, Math.min(10, Math.floor(Number(packs))));
      try {
        const data = await svc.createTopupCheckoutSession(
          request.user!.id,
          packsNum,
          parseGaIds(request.body ?? {})
        );
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

  // POST /api/subscriptions/end-trial — end the free trial and start the paid plan now
  fastify.post("/end-trial", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await svc.endTrialNow(request.user!.id);
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(400).send({ success: false, error: message });
    }
  });

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
