import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { SubscriptionService } from "../services/subscription.service";

export async function webhookRoutes(fastify: FastifyInstance) {
  const svc = new SubscriptionService(fastify.prisma);

  // Override JSON content-type parser in this plugin scope so Stripe signature
  // verification can access the raw request body (Stripe requires the exact
  // byte-for-byte payload to validate the HMAC signature).
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      done(null, body);
    }
  );

  // POST /api/webhooks/stripe  (no auth — verified via Stripe signature)
  fastify.post("/stripe", async (request, reply) => {
    const sig = request.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      fastify.log.error("STRIPE_WEBHOOK_SECRET is not configured");
      return reply.status(500).send({ error: "Webhook secret not configured" });
    }

    if (!sig) {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig as string,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      fastify.log.warn(`Stripe webhook signature verification failed: ${message}`);
      return reply.status(400).send({ error: `Webhook error: ${message}` });
    }

    try {
      await svc.handleWebhookEvent(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Handler error";
      fastify.log.error(`Stripe webhook handler error [${event.type}]: ${message}`);
      // Return 200 to prevent Stripe retrying — log the error instead
    }

    return reply.send({ received: true });
  });
}
