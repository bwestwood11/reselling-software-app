import Stripe from "stripe";
import type { PrismaClient } from "@repo/db";
import { PLANS, getPlanByStripePriceId, type PlanKey } from "../config/plans";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export class SubscriptionService {
  constructor(private db: PrismaClient) {}

  // ── Read ────────────────────────────────────────────────────────────────────

  async getCurrent(userId: string) {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return {
        plan: null,
        status: "INACTIVE" as const,
        credits: 0,
        monthlyCredits: 0,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    const planConfig = PLANS[sub.plan as PlanKey];
    return {
      plan: sub.plan,
      status: sub.status,
      credits: sub.credits,
      monthlyCredits: planConfig.credits,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  async checkCredits(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    return (
      (sub?.status === "ACTIVE" || sub?.status === "TRIALING") &&
      (sub?.credits ?? 0) > 0
    );
  }

  // ── Credit operations ───────────────────────────────────────────────────────

  /**
   * Deducts 1 credit atomically. Throws if the user has no active subscription
   * or insufficient credits. Returns the subscription record so callers can
   * refund on failure via refundCredit().
   */
  async deductCredit(userId: string, listingId: string, marketplace: string) {
    return this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
        throw new Error(
          "An active subscription is required to publish listings."
        );
      }
      if (sub.credits <= 0) {
        throw new Error(
          "You have no credits remaining. Credits renew at the start of your next billing cycle."
        );
      }

      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: { credits: { decrement: 1 } },
      });

      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: `Published listing to ${marketplace}`,
          listingId,
        },
      });

      return updated;
    });
  }

  /** Refunds 1 credit (e.g. when a publish attempt fails after credit was deducted). */
  async refundCredit(userId: string, listingId: string, marketplace: string) {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return;

    await this.db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { credits: { increment: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: 1,
          description: `Refunded — publish to ${marketplace} failed`,
          listingId,
        },
      });
    });
  }

  // ── Stripe sessions ─────────────────────────────────────────────────────────

  async createCheckoutSession(userId: string, plan: PlanKey) {
    if (plan === "FREE") {
      throw new Error("Cannot check out to the free plan.");
    }
    const planConfig = PLANS[plan];
    if (!planConfig.stripePriceId) {
      throw new Error(
        `Stripe Price ID not configured for plan: ${plan}. Set STRIPE_${plan}_PRICE_ID in your environment.`
      );
    }

    const stripe = getStripe();
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const successUrl = `${webUrl}/settings/billing?success=true`;
    const cancelUrl = `${webUrl}/settings/billing`;

    // Get or create the Stripe customer
    let sub = await this.db.subscription.findUnique({ where: { userId } });
    let customerId: string;

    if (sub?.stripeCustomerId) {
      customerId = sub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      sub = await this.db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          plan: "STARTER",
          status: "INACTIVE",
          credits: 0,
        },
        update: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return { url: session.url! };
  }

  async createPortalSession(userId: string) {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw new Error("Billing portal is only available for paid subscribers.");
    }

    const stripe = getStripe();
    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${webUrl}/settings/billing`,
    });
    return { url: session.url };
  }

  // ── Webhook handling ────────────────────────────────────────────────────────

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await this.provisionSubscription(stripeSub);
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.provisionSubscription(stripeSub);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.db.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: { status: "CANCELLED", credits: 0 },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Only handle recurring renewals, not the initial charge
        if (invoice.billing_reason !== "subscription_cycle") break;

        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as { id: string } | null)?.id;
        if (!subId) break;

        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const priceId = stripeSub.items.data[0]?.price.id;
        if (!priceId) break;

        const planKey = getPlanByStripePriceId(priceId);
        if (!planKey) break;

        const sub = await this.db.subscription.findFirst({
          where: { stripeSubscriptionId: subId },
        });
        if (!sub) break;

        const planCredits = PLANS[planKey].credits;
        await this.db.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { credits: planCredits },
          });
          await tx.creditTransaction.create({
            data: {
              subscriptionId: sub.id,
              userId: sub.userId,
              amount: planCredits,
              description: `Monthly renewal — ${PLANS[planKey].name} plan (${planCredits} credits)`,
            },
          });
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as { id: string } | null)?.id;
        if (!subId) break;
        await this.db.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: { status: "PAST_DUE" },
        });
        break;
      }
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async provisionSubscription(
    stripeSub: Stripe.Subscription
  ): Promise<void> {
    const priceId = stripeSub.items.data[0]?.price.id;
    if (!priceId) return;

    const planKey = getPlanByStripePriceId(priceId);
    if (!planKey) return;

    const userId = stripeSub.metadata["userId"];
    if (!userId) return;

    const status = this.mapStripeStatus(stripeSub.status);
    const planCredits = PLANS[planKey].credits;

    // Detect plan changes so we know whether to replenish credits
    const existing = await this.db.subscription.findUnique({ where: { userId } });
    const isPlanChange =
      !existing?.stripeSubscriptionId ||
      existing.stripeSubscriptionId !== stripeSub.id ||
      existing.plan !== planKey;

    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: stripeSub.customer as string,
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          plan: planKey,
          status,
          credits: planCredits,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
        update: {
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          plan: planKey,
          status,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          ...(isPlanChange && { credits: planCredits }),
        },
      });

      if (isPlanChange) {
        await tx.creditTransaction.create({
          data: {
            subscriptionId: sub.id,
            userId,
            amount: planCredits,
            description: `${PLANS[planKey].name} plan activated — ${planCredits} credits`,
          },
        });
      }
    });
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status
  ): "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING" {
    switch (status) {
      case "active":
        return "ACTIVE";
      case "trialing":
        return "TRIALING";
      case "past_due":
        return "PAST_DUE";
      case "canceled":
        return "CANCELLED";
      default:
        return "INACTIVE";
    }
  }
}
