import Stripe from "stripe";
import type { PrismaClient } from "@repo/db";
import {
  PLANS,
  ADDONS,
  getPlanByStripePriceId,
  getAddonByStripePriceId,
  isPaidPlan,
  hasBgRemoval,
  FREE_INVENTORY_CREDITS,
  FREE_LISTING_CREDITS,
  type PlanKey,
  type AddonKey,
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
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return {
        plan: null,
        status: "INACTIVE" as const,
        credits: 0,
        inventoryCredits: 0,
        bgRemovalCredits: 0,
        ironToolCredits: 0,
        flatLayCredits: 0,
        ghostMannequinCredits: 0,
        monthlyCredits: 0,
        monthlyInventoryCredits: 0,
        monthlyBgRemovalCredits: 0,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isUnlimited: false,
      };
    }
    const planKey = sub.plan as PlanKey;
    const unlimited =
      isPaidPlan(planKey) && (sub.status === "ACTIVE" || sub.status === "TRIALING");
    return {
      plan: sub.plan,
      status: sub.status,
      credits: sub.credits,
      inventoryCredits: sub.inventoryCredits,
      bgRemovalCredits: sub.bgRemovalCredits,
      ironToolCredits: sub.ironToolCredits,
      flatLayCredits: sub.flatLayCredits,
      ghostMannequinCredits: sub.ghostMannequinCredits,
      monthlyCredits: unlimited ? null : FREE_LISTING_CREDITS,
      monthlyInventoryCredits: unlimited ? null : FREE_INVENTORY_CREDITS,
      monthlyBgRemovalCredits: unlimited ? (PLANS[planKey].bgRemovalCredits || null) : null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      isUnlimited: unlimited,
    };
  }

  // ── Credit checks ───────────────────────────────────────────────────────────

  async checkListingCredits(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) return false;
    if (isPaidPlan(sub.plan as PlanKey)) return true;
    return sub.credits > 0;
  }

  async checkInventoryCredits(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) return false;
    if (isPaidPlan(sub.plan as PlanKey)) return true;
    return sub.inventoryCredits > 0;
  }

  async checkBgRemovalCredit(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) return false;
    if (!hasBgRemoval(sub.plan as PlanKey)) return false;
    return sub.bgRemovalCredits > 0;
  }

  async checkIronToolCredit(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    return sub.ironToolCredits > 0;
  }

  async checkFlatLayCredit(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    return sub.flatLayCredits > 0;
  }

  async checkGhostMannequinCredit(userId: string): Promise<boolean> {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    return sub.ghostMannequinCredits > 0;
  }

  // ── Credit operations ───────────────────────────────────────────────────────

  async deductListingCredit(userId: string, listingId: string, marketplace: string) {
    return this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
        throw new Error("An active subscription is required to publish listings.");
      }
      if (isPaidPlan(sub.plan as PlanKey)) return sub;
      if (sub.credits <= 0) {
        throw new Error(
          "You have no listing credits remaining. Upgrade your plan to publish more listings."
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

  async deductInventoryCredit(userId: string) {
    return this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
        throw new Error("An active subscription is required to add inventory.");
      }
      if (isPaidPlan(sub.plan as PlanKey)) return sub;
      if (sub.inventoryCredits <= 0) {
        throw new Error(
          "You've reached the 40-item inventory limit on the free plan. Upgrade to add unlimited items."
        );
      }
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: { inventoryCredits: { decrement: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: "Added inventory item",
        },
      });
      return updated;
    });
  }

  async deductBgRemovalCredit(userId: string) {
    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
        throw new Error("Active subscription required for background removal.");
      }
      if (!hasBgRemoval(sub.plan as PlanKey)) {
        throw new Error("Background removal requires the Full-Time or Enterprise plan.");
      }
      if (sub.bgRemovalCredits <= 0) {
        throw new Error("No background removal credits remaining this month.");
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { bgRemovalCredits: { decrement: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: "Background removal used",
        },
      });
    });
  }

  async deductIronToolCredit(userId: string) {
    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new Error("Subscription not found.");
      if (sub.ironToolCredits <= 0) {
        throw new Error("No Iron Tool credits remaining. Purchase a pack to continue.");
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { ironToolCredits: { decrement: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: "Iron Tool used",
        },
      });
    });
  }

  async deductFlatLayCredit(userId: string) {
    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new Error("Subscription not found.");
      if (sub.flatLayCredits <= 0) {
        throw new Error("No Flat Lay credits remaining. Purchase a pack to continue.");
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { flatLayCredits: { decrement: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: "Flat Lay Tool used",
        },
      });
    });
  }

  async deductGhostMannequinCredit(userId: string) {
    await this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new Error("Subscription not found.");
      if (sub.ghostMannequinCredits <= 0) {
        throw new Error("No Ghost Mannequin credits remaining. Purchase a pack to continue.");
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { ghostMannequinCredits: { decrement: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: -1,
          description: "Ghost Mannequin used",
        },
      });
    });
  }

  async refundListingCredit(userId: string, listingId: string, marketplace: string) {
    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub || isPaidPlan(sub.plan as PlanKey)) return;
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
    if (plan === "FREE") throw new Error("Cannot check out to the free plan.");
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
          plan: "FREE",
          status: "INACTIVE",
          credits: 0,
          inventoryCredits: 0,
        },
        update: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${webUrl}/settings/billing?success=true`,
      cancel_url: `${webUrl}/settings/billing`,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return { url: session.url! };
  }

  async createAddonCheckoutSession(userId: string, addon: AddonKey, packs = 1) {
    const addonConfig = ADDONS[addon];
    if (!addonConfig.stripePriceId) {
      throw new Error(
        `Stripe Price ID not configured for add-on: ${addon}. Set STRIPE_${addon}_PRICE_ID in your environment.`
      );
    }

    const stripe = getStripe();
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
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
      await this.db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          plan: "FREE",
          status: "ACTIVE",
          credits: FREE_LISTING_CREDITS,
          inventoryCredits: FREE_INVENTORY_CREDITS,
        },
        update: { stripeCustomerId: customerId },
      });
    }

    const totalCredits = packs * addonConfig.creditsPerPack;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: addonConfig.stripePriceId, quantity: packs }],
      success_url: `${webUrl}/settings/billing?addon_success=${addon}`,
      cancel_url: `${webUrl}/settings/billing`,
      metadata: { userId, addon, totalCredits: String(totalCredits) },
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
        if (session.mode === "subscription" && session.subscription) {
          const stripe = getStripe();
          const stripeSub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await this.provisionSubscription(stripeSub);
        } else if (session.mode === "payment") {
          await this.provisionAddonPurchase(session);
        }
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
          data: {
            status: "CANCELLED",
            plan: "FREE",
            credits: 0,
            inventoryCredits: 0,
            bgRemovalCredits: 0,
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
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

        // Replenish bg removal credits on monthly renewal
        const bgRemovalAllotment = PLANS[planKey].bgRemovalCredits;
        if (bgRemovalAllotment > 0) {
          await this.db.$transaction(async (tx) => {
            await tx.subscription.update({
              where: { id: sub.id },
              data: { bgRemovalCredits: bgRemovalAllotment },
            });
            await tx.creditTransaction.create({
              data: {
                subscriptionId: sub.id,
                userId: sub.userId,
                amount: bgRemovalAllotment,
                description: `Monthly renewal — ${bgRemovalAllotment} bg removal credits`,
              },
            });
          });
        }
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

  private async provisionSubscription(stripeSub: Stripe.Subscription): Promise<void> {
    const priceId = stripeSub.items.data[0]?.price.id;
    if (!priceId) return;

    const planKey = getPlanByStripePriceId(priceId);
    if (!planKey) return;

    const userId = stripeSub.metadata["userId"];
    if (!userId) return;

    const status = this.mapStripeStatus(stripeSub.status);
    const bgRemovalAllotment = PLANS[planKey].bgRemovalCredits;
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
          credits: 0,
          inventoryCredits: 0,
          bgRemovalCredits: bgRemovalAllotment,
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
          ...(isPlanChange && { bgRemovalCredits: bgRemovalAllotment }),
        },
      });

      if (isPlanChange) {
        await tx.creditTransaction.create({
          data: {
            subscriptionId: sub.id,
            userId,
            amount: bgRemovalAllotment,
            description: `${PLANS[planKey].name} plan activated${bgRemovalAllotment > 0 ? ` — ${bgRemovalAllotment} bg removal credits` : " — unlimited listings & inventory"}`,
          },
        });
      }
    });
  }

  private async provisionAddonPurchase(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.["userId"];
    const addonKey = session.metadata?.["addon"] as AddonKey | undefined;
    const creditsStr = session.metadata?.["totalCredits"];
    if (!userId || !addonKey || !creditsStr) return;

    const credits = parseInt(creditsStr, 10);
    if (isNaN(credits) || credits <= 0) return;

    const sub = await this.db.subscription.findUnique({ where: { userId } });
    if (!sub) return;

    const creditField =
      addonKey === "IRON_TOOL"
        ? "ironToolCredits"
        : addonKey === "FLAT_LAY"
          ? "flatLayCredits"
          : addonKey === "GHOST_MANNEQUIN"
            ? "ghostMannequinCredits"
            : null;
    if (!creditField) return;

    await this.db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { [creditField]: { increment: credits } },
      });
      await tx.creditTransaction.create({
        data: {
          subscriptionId: sub.id,
          userId,
          amount: credits,
          description: `${ADDONS[addonKey].name} — purchased ${credits} credits`,
        },
      });
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
