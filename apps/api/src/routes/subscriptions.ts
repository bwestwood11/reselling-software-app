import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import type { PlanKey, AddonKey } from "../config/plans";
import { PLANS, ADDONS } from "../config/plans";

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
  // Body: { plan: "SIDE_HUSTLE" | "FULL_TIME" | "ENTERPRISE" }
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

  // POST /api/subscriptions/addon-checkout
  // Body: { addon: "IRON_TOOL" | "FLAT_LAY", packs: number (1–10) }
  fastify.post<{ Body: { addon: AddonKey; packs?: number } }>(
    "/addon-checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { addon, packs = 1 } = request.body ?? {};
      if (!addon || !ADDONS[addon]) {
        return reply.status(400).send({ success: false, error: "Invalid add-on" });
      }
      const packsNum = Math.max(1, Math.min(10, Math.floor(Number(packs))));
      try {
        const data = await svc.createAddonCheckoutSession(request.user!.id, addon, packsNum);
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
