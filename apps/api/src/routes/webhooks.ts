import crypto from "crypto";
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
      // Ask Stripe to retry: handleWebhookEvent rolled back its dedup marker on
      // failure, and every handler is idempotent, so a redelivery is safe.
      return reply.status(500).send({ error: "Webhook handler failed" });
    }

    return reply.send({ received: true });
  });

  // GET /api/webhooks/ebay/account-deletion  (endpoint ownership challenge)
  // eBay sends ?challenge_code=xxx when you register the endpoint in the developer portal.
  // Must respond with SHA-256(challengeCode + verificationToken + endpointUrl) as hex.
  fastify.get("/ebay/account-deletion", async (request, reply) => {
    const { challenge_code } = request.query as Record<string, string | undefined>;
    const verificationToken = process.env.EBAY_DELETION_VERIFICATION_TOKEN;
    const endpointUrl = process.env.EBAY_DELETION_ENDPOINT_URL;

    if (!challenge_code) {
      return reply.status(400).send({ error: "Missing challenge_code" });
    }
    if (!verificationToken || !endpointUrl) {
      fastify.log.error(
        "EBAY_DELETION_VERIFICATION_TOKEN or EBAY_DELETION_ENDPOINT_URL not configured"
      );
      return reply.status(500).send({ error: "Endpoint not configured" });
    }

    const hash = crypto.createHash("sha256");
    hash.update(challenge_code);
    hash.update(verificationToken);
    hash.update(endpointUrl);
    const challengeResponse = hash.digest("hex");

    return reply.header("Content-Type", "application/json").send({ challengeResponse });
  });

  // POST /api/webhooks/ebay/account-deletion  (account deletion notification)
  // No auth — eBay signs the payload via x-ebay-signature header.
  // For now we log the deletion; future work can verify the signature and purge user data.
  fastify.post("/ebay/account-deletion", async (request, reply) => {
    const rawBody = request.body as Buffer;

    let payload: {
      metadata?: { topic?: string };
      notification?: {
        notificationId?: string;
        eventDate?: string;
        data?: { username?: string; userId?: string; eiasToken?: string };
      };
    };

    try {
      payload = JSON.parse(rawBody.toString("utf-8")) as typeof payload;
    } catch {
      fastify.log.warn("eBay account deletion: failed to parse JSON body");
      return reply.status(400).send({ error: "Invalid JSON body" });
    }

    const signature = request.headers["x-ebay-signature"];
    if (!signature) {
      fastify.log.warn("eBay account deletion notification missing x-ebay-signature header");
    }

    fastify.log.info(
      {
        topic: payload.metadata?.topic,
        notificationId: payload.notification?.notificationId,
        eventDate: payload.notification?.eventDate,
        userId: payload.notification?.data?.userId,
        username: payload.notification?.data?.username,
      },
      "eBay marketplace account deletion notification received"
    );

    return reply.status(200).send();
  });
}
