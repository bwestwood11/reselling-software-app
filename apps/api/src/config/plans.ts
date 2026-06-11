export type PlanKey = "FREE" | "SIDE_HUSTLE" | "FULL_TIME" | "ENTERPRISE";
export type AddonKey = "IRON_TOOL" | "FLAT_LAY";

export interface PlanConfig {
  name: string;
  description: string;
  priceMonthly: number; // USD cents
  /** Listing credits per billing cycle. 0 = unlimited (enforced by plan check). */
  listingCredits: number;
  /** Inventory item credits on signup / cycle. 0 = unlimited (enforced by plan check). */
  inventoryCredits: number;
  /** Background removal credits replenished each billing cycle. 0 = not available. */
  bgRemovalCredits: number;
  stripePriceId: string;
}

export interface AddonConfig {
  name: string;
  description: string;
  creditsPerPack: number;
  packPrice: number; // USD cents
  stripePriceId: string;
}

// ─── Free tier limits ─────────────────────────────────────────────────────────
export const FREE_INVENTORY_CREDITS = 40;
export const FREE_LISTING_CREDITS = 20;

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    name: "Free",
    description: "Get started with no commitment",
    priceMonthly: 0,
    listingCredits: FREE_LISTING_CREDITS,
    inventoryCredits: FREE_INVENTORY_CREDITS,
    bgRemovalCredits: 0,
    stripePriceId: "",
  },
  SIDE_HUSTLE: {
    name: "Side Hustle",
    description: "For casual sellers ready to scale up",
    priceMonthly: 1499, // $14.99/month
    listingCredits: 0, // unlimited
    inventoryCredits: 0,
    bgRemovalCredits: 0, // bg removal not included
    stripePriceId: process.env.STRIPE_SIDE_HUSTLE_PRICE_ID ?? "",
  },
  FULL_TIME: {
    name: "Full-Time",
    description: "For serious resellers growing their business",
    priceMonthly: 2999, // $29.99/month
    listingCredits: 0,
    inventoryCredits: 0,
    bgRemovalCredits: 300, // 300 bg removals per month
    stripePriceId: process.env.STRIPE_FULL_TIME_PRICE_ID ?? "",
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "Maximum power for high-volume sellers",
    priceMonthly: 5999, // $59.99/month
    listingCredits: 0,
    inventoryCredits: 0,
    bgRemovalCredits: 500, // 500 bg removals per month
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
  },
};

export const ADDONS: Record<AddonKey, AddonConfig> = {
  IRON_TOOL: {
    name: "Iron Tool",
    description: "AI wrinkle removal for clothing photos",
    creditsPerPack: 100,
    packPrice: 1500, // $15.00 for 100 credits ($0.15 each)
    stripePriceId: process.env.STRIPE_IRON_TOOL_PRICE_ID ?? "",
  },
  FLAT_LAY: {
    name: "Flat Lay Tool",
    description: "AI flat lay generation for clothing photos",
    creditsPerPack: 100,
    packPrice: 1500, // $15.00 for 100 credits ($0.15 each)
    stripePriceId: process.env.STRIPE_FLAT_LAY_PRICE_ID ?? "",
  },
};

export const FREE_PLAN: PlanKey = "FREE";
export const PAID_PLANS: PlanKey[] = ["SIDE_HUSTLE", "FULL_TIME", "ENTERPRISE"];
export const BG_REMOVAL_PLANS: PlanKey[] = ["FULL_TIME", "ENTERPRISE"];

export function isPaidPlan(plan: PlanKey): boolean {
  return plan !== "FREE";
}

export function hasBgRemoval(plan: PlanKey): boolean {
  return BG_REMOVAL_PLANS.includes(plan);
}

/** Look up a plan key by its Stripe Price ID. Returns null if not found. */
export function getPlanByStripePriceId(priceId: string): PlanKey | null {
  const entry = Object.entries(PLANS).find(([, cfg]) => cfg.stripePriceId === priceId);
  return entry ? (entry[0] as PlanKey) : null;
}

/** Look up an add-on key by its Stripe Price ID. Returns null if not found. */
export function getAddonByStripePriceId(priceId: string): AddonKey | null {
  const entry = Object.entries(ADDONS).find(([, cfg]) => cfg.stripePriceId === priceId);
  return entry ? (entry[0] as AddonKey) : null;
}
