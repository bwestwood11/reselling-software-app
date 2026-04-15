export type PlanKey = "FREE" | "STARTER" | "PRO" | "PREMIUM";

export interface PlanConfig {
  name: string;
  description: string;
  priceMonthly: number; // USD cents
  credits: number;
  stripePriceId: string;
}

// ─── Pricing Configuration ────────────────────────────────────────────────────
// To change plan prices:
//   1. Update `priceMonthly` below (in cents, e.g. 999 = $9.99)
//   2. Create matching Price objects in your Stripe dashboard
//   3. Set the corresponding STRIPE_*_PRICE_ID env vars to the new Price IDs
//
// To change credits per plan, update the `credits` field below.
// FREE_PLAN_CREDITS is used both here and in the auth onboarding hook — update
// both places if you want to change the free tier credit amount.

export const FREE_PLAN_CREDITS = 20;

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    name: "Free",
    description: "Get started with no commitment",
    priceMonthly: 0, // $0 — no Stripe charge
    credits: FREE_PLAN_CREDITS,
    stripePriceId: "", // no Stripe price for free tier
  },
  STARTER: {
    name: "Starter",
    description: "Perfect for casual sellers getting started",
    priceMonthly: 999, // $9.99 / month
    credits: 50,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  },
  PRO: {
    name: "Pro",
    description: "For serious resellers ready to scale",
    priceMonthly: 2499, // $24.99 / month
    credits: 200,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  },
  PREMIUM: {
    name: "Premium",
    description: "Maximum power for high-volume sellers",
    priceMonthly: 4999, // $49.99 / month
    credits: 500,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
  },
};

/** Look up a plan key by its Stripe Price ID. Returns null if not found. */
export function getPlanByStripePriceId(priceId: string): PlanKey | null {
  const entry = Object.entries(PLANS).find(([, cfg]) => cfg.stripePriceId === priceId);
  return entry ? (entry[0] as PlanKey) : null;
}
