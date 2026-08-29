import Stripe from "stripe";
import { Prisma, type PrismaClient } from "@repo/db";
import {
  PLANS,
  AI_CREDIT_TOPUP,
  TRIAL_DAYS,
  effectiveAllotments,
  getStripePriceId,
  getPlanByStripePriceId,
  isPaidPlan,
  isEntitled,
  type PlanKey,
  type BillingInterval,
} from "../config/plans";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export class SubscriptionService {
  constructor(private db: PrismaClient) {}

  // ── Read ────────────────────────────────────────────────────────────────────

  async getCurrent(userId: string) {
    const [sub, inventoryUsed] = await Promise.all([
      this.db.subscription.findUnique({ where: { userId } }),
      this.db.inventoryItem.count({ where: { userId } }),
    ]);

    if (!sub) {
      return {
        plan: null,
        status: "INACTIVE" as const,
        billingInterval: null,
        aiCredits: 0,
        bonusAiCredits: 0,
        monthlyAiCredits: 0,
        inventoryLimit: 0,
        inventoryUsed,
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        isTrialing: false,
        isActive: false,
      };
    }

    const planKey = sub.plan as PlanKey;
    const { inventoryLimit, aiCredits: monthlyAiCredits } = effectiveAllotments(
      planKey,
      sub.status
    );

    return {
      plan: sub.plan,
      status: sub.status,
      billingInterval: sub.billingInterval,
      aiCredits: sub.aiCredits,
      bonusAiCredits: sub.bonusAiCredits,
      monthlyAiCredits,
      inventoryLimit,
      inventoryUsed,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      isTrialing: sub.status === "TRIALING",
      isActive: isEntitled(sub.status),
    };
  }

  // ── Inventory limit ───────────────────────────────────────────────────────────

  /** True if the user may add another inventory item under their plan's cap. */
  async checkInventoryLimit(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || !isEntitled(sub.status)) return false;
    const { inventoryLimit } = effectiveAllotments(sub.plan as PlanKey, sub.status);
    const used = await this.db.inventoryItem.count({ where: { userId } });
    return used < inventoryLimit;
  }

  async assertCanAddInventory(userId: string): Promise<void> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || !isEntitled(sub.status)) {
      throw new Error("An active subscription is required to add inventory. Start your free trial.");
    }
    const { inventoryLimit } = effectiveAllotments(sub.plan as PlanKey, sub.status);
    const used = await this.db.inventoryItem.count({ where: { userId } });
    if (used >= inventoryLimit) {
      throw new Error(
        `You've reached your plan's limit of ${inventoryLimit.toLocaleString()} inventory items. Upgrade to add more.`
      );
    }
  }

  // ── Smart AI credits ────────────────────────────────────────────────────────

  private aiBalance(sub: { aiCredits: number; bonusAiCredits: number }): number {
    return sub.aiCredits + sub.bonusAiCredits;
  }

  /** True if the user is entitled and has at least `cost` AI credits available. */
  async checkAiCredits(userId: string, cost: number): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || !isEntitled(sub.status)) return false;
    return this.aiBalance(sub) >= cost;
  }

  /**
   * Deduct `cost` AI credits, drawing from the monthly allotment first, then from
   * purchased top-up credits. Throws if the user is not entitled or is short.
   */
  async deductAiCredits(
    userId: string,
    cost: number,
    description: string,
    listingId?: string
  ): Promise<void> {
    if (cost <= 0) return;
    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub || !isEntitled(sub.status)) {
        throw new Error("An active subscription is required to use AI features.");
      }
      if (this.aiBalance(sub) < cost) {
        throw new Error(
          "You don't have enough smart AI credits. Upgrade your plan or buy a top-up to continue."
        );
      }
      const fromMonthly = Math.min(sub.aiCredits, cost);
      const fromBonus = cost - fromMonthly;
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          aiCredits: { decrement: fromMonthly },
          ...(fromBonus > 0 && { bonusAiCredits: { decrement: fromBonus } }),
        },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -cost,
          description,
          ...(listingId && { listingId }),
        },
      });
    });
  }

  // ── Stripe sessions ─────────────────────────────────────────────────────────

  private async ensureCustomer(userId: string): Promise<string> {
    const stripe = getStripe();
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (sub?.stripeCustomerId) return sub.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });
    await this.db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        plan: "FREE",
        status: "INACTIVE",
      },
      update: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  /**
   * Start a subscription checkout. Every new paid subscription begins with a
   * {@link TRIAL_DAYS}-day free trial; a card is collected up front and charged
   * automatically when the trial ends unless the user cancels.
   */
  async createCheckoutSession(userId: string, plan: PlanKey, interval: BillingInterval) {
    if (!isPaidPlan(plan) || !PLANS[plan].selfServe) {
      throw new Error(`Plan "${plan}" cannot be purchased self-serve.`);
    }
    const priceId = getStripePriceId(plan, interval);
    if (!priceId) {
      throw new Error(`Stripe Price ID not configured for ${plan} (${interval}).`);
    }

    const stripe = getStripe();
    const customerId = await this.ensureCustomer(userId);
    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

    // Only offer the trial to users who have never subscribed before.
    const existing = await this.db.subscription.findUnique({ where: { userId } });
    const eligibleForTrial = !existing?.stripeSubscriptionId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/settings/billing`,
      metadata: { userId, plan, interval },
      subscription_data: {
        metadata: { userId, plan, interval },
        ...(eligibleForTrial && { trial_period_days: TRIAL_DAYS }),
      },
    });

    return { url: session.url! };
  }

  /** One-time purchase of AI credit top-up packs. */
  async createTopupCheckoutSession(userId: string, packs = 1) {
    if (!AI_CREDIT_TOPUP.stripePriceId) {
      throw new Error("AI credit top-up is not configured. Set STRIPE_AI_CREDITS_PRICE_ID.");
    }
    const stripe = getStripe();
    const customerId = await this.ensureCustomer(userId);
    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const totalCredits = packs * AI_CREDIT_TOPUP.creditsPerPack;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: AI_CREDIT_TOPUP.stripePriceId, quantity: packs }],
      success_url: `${webUrl}/settings/billing?topup_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/settings/billing`,
      metadata: { userId, topup: "AI_CREDITS", totalCredits: String(totalCredits) },
    });

    return { url: session.url! };
  }

  async createPortalSession(userId: string) {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw new Error("Billing portal is only available once you've started a subscription.");
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
    // Idempotency: Stripe delivers events at-least-once and redelivers on retry.
    // Record each event id first; if the insert conflicts, we've already handled
    // it — skip. The @id primary key makes this atomic, so two concurrent
    // deliveries of the same event can't both proceed.
    try {
      await this.db.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return; // duplicate delivery — already processed
      }
      throw err;
    }

    try {
      await this.dispatchWebhookEvent(event);
    } catch (err) {
      // A genuine handler failure: drop the marker so Stripe's retry can
      // reprocess the event cleanly instead of being deduped away.
      await this.db.stripeWebhookEvent.delete({ where: { id: event.id } }).catch(() => {});
      throw err;
    }
  }

  private async dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const stripe = getStripe();
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
          await this.provisionSubscription(stripeSub, session.id);
        } else if (session.mode === "payment") {
          await this.provisionTopupPurchase(session);
        }
        break;
      }

      case "customer.subscription.updated": {
        await this.provisionSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.db.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: {
            status: "CANCELLED",
            plan: "FREE",
            aiCredits: 0,
            // bonusAiCredits are purchased outright — preserved on cancellation.
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Replenish the monthly AI allotment on each renewal cycle.
        if (invoice.billing_reason !== "subscription_cycle") break;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as { id: string } | null)?.id;
        if (!subId) break;

        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const priceId = stripeSub.items.data[0]?.price.id;
        const match = priceId ? getPlanByStripePriceId(priceId) : null;
        if (!match) break;

        const sub = await this.db.subscription.findFirst({
          where: { stripeSubscriptionId: subId },
        });
        if (!sub) break;

        const allotment = PLANS[match.plan].aiCredits;
        await this.db.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { aiCredits: allotment },
          });
          await tx.creditTransaction.create({
            data: {
              subscriptionId: sub.id,
              userId: sub.userId,
              amount: allotment,
              description: `Monthly renewal — ${allotment} smart AI credits`,
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

  /**
   * Upsert a subscription and grant its AI allotment. Idempotent: credits are SET
   * (never incremented), and when a `checkoutSessionId` is supplied the grant
   * ledger row is keyed on it so the webhook and the landing-page verify endpoint
   * — which both provision the same checkout — can't double-grant. The unique
   * `stripeSessionId` constraint is the hard backstop against a concurrent race.
   */
  private async provisionSubscription(
    stripeSub: Stripe.Subscription,
    checkoutSessionId?: string
  ): Promise<void> {
    const priceId = stripeSub.items.data[0]?.price.id;
    if (!priceId) return;

    const match = getPlanByStripePriceId(priceId);
    if (!match) return;
    const { plan: planKey, interval } = match;

    const userId = stripeSub.metadata["userId"];
    if (!userId) return;

    const status = this.mapStripeStatus(stripeSub.status);
    const { aiCredits: allotment } = effectiveAllotments(planKey, status);

    const existing = await this.db.subscription.findUnique({ where: { userId } });
    // Regrant the AI allotment when the subscription is new, changes plan, or
    // converts out of the trial into an active paid period.
    const isNewOrChanged =
      !existing?.stripeSubscriptionId ||
      existing.stripeSubscriptionId !== stripeSub.id ||
      existing.plan !== planKey ||
      existing.status !== status;

    // Cross-path dedup: if a grant for this checkout session already exists, the
    // other path (webhook or verify) beat us to it — sync the sub fields but skip
    // the grant so credits and the ledger aren't duplicated.
    const alreadyGranted =
      isNewOrChanged && checkoutSessionId
        ? (await this.db.creditTransaction.findUnique({
            where: { stripeSessionId: checkoutSessionId },
          })) !== null
        : false;
    const shouldGrant = isNewOrChanged && !alreadyGranted;

    const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;

    try {
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
            billingInterval: interval,
            aiCredits: allotment,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            trialEndsAt: trialEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
          update: {
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: priceId,
            plan: planKey,
            status,
            billingInterval: interval,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            trialEndsAt: trialEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            ...(shouldGrant && { aiCredits: allotment }),
          },
        });

        if (shouldGrant) {
          const label =
            status === "TRIALING"
              ? `${PLANS[planKey].name} trial started — ${allotment} smart AI credits`
              : `${PLANS[planKey].name} plan activated — ${allotment} smart AI credits`;
          await tx.creditTransaction.create({
            data: {
              subscriptionId: sub.id,
              userId,
              amount: allotment,
              description: label,
              ...(checkoutSessionId && { stripeSessionId: checkoutSessionId }),
            },
          });
        }
      });
    } catch (err) {
      // A concurrent path already recorded the grant for this session — its
      // unique stripeSessionId rolled our transaction back. Safe to treat as done.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
  }

  private async provisionTopupPurchase(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.["userId"];
    const creditsStr = session.metadata?.["totalCredits"];
    if (!userId || session.metadata?.["topup"] !== "AI_CREDITS" || !creditsStr) return;

    // Only credit an actually-paid one-time purchase.
    if (session.payment_status !== "paid") return;

    const credits = parseInt(creditsStr, 10);
    if (isNaN(credits) || credits <= 0) return;

    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return;

    // Idempotency: the unique stripeSessionId guarantees the top-up is applied
    // exactly once no matter how many times this runs (webhook + verify race).
    const already = await this.db.creditTransaction.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (already) return;

    try {
      await this.db.$transaction(async (tx) => {
        await tx.creditTransaction.create({
          data: {
            subscriptionId: sub.id,
            userId,
            amount: credits,
            description: `${AI_CREDIT_TOPUP.name} — purchased ${credits} credits`,
            stripeSessionId: session.id,
          },
        });
        await tx.subscription.update({
          where: { id: sub.id },
          data: { bonusAiCredits: { increment: credits } },
        });
      });
    } catch (err) {
      // Unique-constraint violation → a concurrent caller already provisioned it.
      if (err instanceof Error && err.message.includes("stripeSessionId")) return;
      throw err;
    }
  }

  /**
   * Verify a completed Checkout Session directly with Stripe and provision the
   * result, without waiting for (or trusting) the webhook. Called when the user
   * lands back on the billing page with `?session_id=…`. Safe to call repeatedly:
   * subscription upserts are idempotent and top-ups are keyed on the session id.
   */
  async verifyAndProvisionSession(userId: string, sessionId: string) {
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("A checkout session id is required.");
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ownership: the session must belong to the authenticated user. This is the
    // critical guard — the session id comes from a URL and must not let one user
    // provision against another's checkout.
    if (session.metadata?.["userId"] !== userId) {
      throw new Error("This checkout session does not belong to your account.");
    }

    if (session.mode === "subscription" && session.subscription) {
      // A subscription session is "complete" once the trial/subscription is set
      // up, even before the first charge — provision from the live subscription.
      if (session.status !== "complete") {
        throw new Error("Checkout is not complete yet. Please try again in a moment.");
      }
      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
      await this.provisionSubscription(stripeSub, session.id);
    } else if (session.mode === "payment") {
      if (session.payment_status !== "paid") {
        throw new Error("Payment has not completed yet. Please try again in a moment.");
      }
      await this.provisionTopupPurchase(session);
    }

    return this.getCurrent(userId);
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
