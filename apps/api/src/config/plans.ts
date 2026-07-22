export type PlanKey = "FREE" | "SIDE_HUSTLE" | "FULL_TIME" | "ENTERPRISE";
export type BillingInterval = "monthly" | "yearly";

export interface PlanConfig {
  name: string;
  description: string;
  /** Hard cap on the number of distinct inventory items the user may hold. */
  inventoryLimit: number;
  /** Smart AI credits granted each billing cycle. */
  aiCredits: number;
  /** Headline monthly price in USD cents. */
  priceMonthly: number;
  /** Per-month price in USD cents when billed yearly (0 if no yearly option). */
  priceYearlyPerMonth: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  /** Whether the plan can be purchased self-serve (Enterprise is contact-sales). */
  selfServe: boolean;
}

// ─── Trial ──────────────────────────────────────────────────────────────────
/** Length of the free trial every new paid subscription starts with. */
export const TRIAL_DAYS = 7;

// ─── Free-trial allotments ────────────────────────────────────────────────────
// While a subscription is in its 7-day trial (status TRIALING) the user gets the
// "Free" tier allotments below, regardless of which plan they will convert to.
export const FREE_INVENTORY_LIMIT = 50;
export const FREE_AI_CREDITS = 20;

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    name: "Free",
    description: "7-day free trial — try everything, cancel anytime",
    inventoryLimit: FREE_INVENTORY_LIMIT,
    aiCredits: FREE_AI_CREDITS,
    priceMonthly: 0,
    priceYearlyPerMonth: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    selfServe: false,
  },
  SIDE_HUSTLE: {
    name: "Side Hustle",
    description: "For casual sellers ready to scale up",
    inventoryLimit: 1500,
    aiCredits: 500,
    priceMonthly: 3999, // $39.99/month
    priceYearlyPerMonth: 3499, // $34.99/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_SIDE_HUSTLE_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.STRIPE_SIDE_HUSTLE_YEARLY_PRICE_ID ?? "",
    selfServe: true,
  },
  FULL_TIME: {
    name: "Full-Time",
    description: "For serious resellers growing their business",
    inventoryLimit: 3000,
    aiCredits: 750,
    priceMonthly: 6499, // $64.99/month
    priceYearlyPerMonth: 5999, // $59.99/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_FULL_TIME_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.STRIPE_FULL_TIME_YEARLY_PRICE_ID ?? "",
    selfServe: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "Custom plan tailored to high-volume sellers",
    inventoryLimit: 1_000_000, // effectively unlimited; real limit set per contract
    aiCredits: 0, // provisioned manually per contract
    priceMonthly: 0,
    priceYearlyPerMonth: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    selfServe: false,
  },
};

// ─── Smart AI credit costs ────────────────────────────────────────────────────
// Every AI feature draws from the single "smart AI credit" pool.
export const AI_CREDIT_COSTS = {
  seoDescription: 1,
  backgroundRemoval: 1,
  ironTool: 5,
  flatLay: 5,
  ghostMannequin: 5,
} as const;

export interface PhotoEditOptions {
  removeBackground: boolean;
  flatLay: boolean;
  ironing: boolean;
  ghostMannequin: boolean;
}

/**
 * Cost of a single PhotoRoom edit request. Multiple effects run in one API call,
 * so the user is charged once at the highest applicable tier — e.g. ghost
 * mannequin + background removal = 5 credits (not 6), not 5 + 1.
 */
export function photoEditCreditCost(o: PhotoEditOptions): number {
  if (o.flatLay || o.ironing || o.ghostMannequin) return AI_CREDIT_COSTS.ironTool; // 5
  if (o.removeBackground) return AI_CREDIT_COSTS.backgroundRemoval; // 1
  return 0;
}

// ─── AI credit top-up ─────────────────────────────────────────────────────────
export const AI_CREDIT_TOPUP = {
  name: "Smart AI Credits",
  description: "Top up your AI credit balance — never expires, works on any plan",
  creditsPerPack: 100,
  packPrice: 1500, // $15.00 per 100 credits (display only; Stripe price is source of truth)
  stripePriceId: process.env.STRIPE_AI_CREDITS_PRICE_ID ?? "",
};

// ─── Plan groupings & helpers ───────────────────────────────────────────────────
export const FREE_PLAN: PlanKey = "FREE";
export const PAID_PLANS: PlanKey[] = ["SIDE_HUSTLE", "FULL_TIME", "ENTERPRISE"];

export function isPaidPlan(plan: PlanKey): boolean {
  return plan !== "FREE";
}

/** The Stripe recurring price ID for a plan + interval, or "" if not configured. */
export function getStripePriceId(plan: PlanKey, interval: BillingInterval): string {
  const cfg = PLANS[plan];
  return interval === "yearly" ? cfg.stripePriceIdYearly : cfg.stripePriceIdMonthly;
}

/** Reverse-lookup a plan + interval by Stripe Price ID. Returns null if not found. */
export function getPlanByStripePriceId(
  priceId: string
): { plan: PlanKey; interval: BillingInterval } | null {
  for (const [key, cfg] of Object.entries(PLANS) as [PlanKey, PlanConfig][]) {
    if (cfg.stripePriceIdMonthly && cfg.stripePriceIdMonthly === priceId) {
      return { plan: key, interval: "monthly" };
    }
    if (cfg.stripePriceIdYearly && cfg.stripePriceIdYearly === priceId) {
      return { plan: key, interval: "yearly" };
    }
  }
  return null;
}

/**
 * The inventory-item cap and monthly AI credit allotment that currently apply,
 * given a plan and subscription status. Trials always get the Free allotment;
 * inactive/lapsed subscriptions get nothing.
 */
export function effectiveAllotments(
  plan: PlanKey | null,
  status: string
): { inventoryLimit: number; aiCredits: number } {
  if (status === "TRIALING") {
    return { inventoryLimit: FREE_INVENTORY_LIMIT, aiCredits: FREE_AI_CREDITS };
  }
  if (status === "ACTIVE" && plan) {
    return { inventoryLimit: PLANS[plan].inventoryLimit, aiCredits: PLANS[plan].aiCredits };
  }
  return { inventoryLimit: 0, aiCredits: 0 };
}
