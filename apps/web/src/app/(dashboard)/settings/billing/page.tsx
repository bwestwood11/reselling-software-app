"use client";

import { Suspense, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { subscriptionApi } from "@/lib/api";
import type { SubscriptionInfo, PlanType } from "@repo/types";
import {
  Check,
  Zap,
  Briefcase,
  Star,
  Crown,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Infinity,
  ShoppingCart,
  Eraser,
  Sparkles,
  Layers,
  Ghost,
  Package,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@repo/ui";

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLAN_DISPLAY = {
  FREE: {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with no commitment",
    Icon: Zap,
    features: [
      "Access to all marketplaces",
      "Up to 40 inventory items",
      "20 listing credits (one-time)",
    ],
    popular: false,
    isPaid: false,
  },
  SIDE_HUSTLE: {
    name: "Side Hustle",
    price: "$14.99",
    period: "/month",
    description: "For casual sellers ready to scale up",
    Icon: Briefcase,
    features: [
      "Access to all marketplaces",
      "Unlimited inventory items",
      "Unlimited listings",
      "Import from existing marketplaces",
      "Sale detection & auto-delist",
    ],
    popular: true,
    isPaid: true,
  },
  FULL_TIME: {
    name: "Full-Time",
    price: "$29.99",
    period: "/month",
    description: "For serious resellers growing their business",
    Icon: Star,
    features: [
      "Everything in Side Hustle",
      "AI description generation",
      "300 background removals / month",
    ],
    popular: false,
    isPaid: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: "$59.99",
    period: "/month",
    description: "Maximum power for high-volume sellers",
    Icon: Crown,
    features: [
      "Everything in Full-Time",
      "500 background removals / month",
      "Priority support",
    ],
    popular: false,
    isPaid: true,
  },
} as const;

type PlanKey = keyof typeof PLAN_DISPLAY;
const PLAN_ORDER: PlanKey[] = ["FREE", "SIDE_HUSTLE", "FULL_TIME", "ENTERPRISE"];

// ─── Add-on config ────────────────────────────────────────────────────────────

const ADDON_CONFIG = {
  IRON_TOOL: {
    name: "Iron Tool",
    tagline: "Remove wrinkles from clothing photos with AI",
    Icon: Sparkles,
    accent: "amber",
    iconBg: "bg-amber-500",
    headerBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    badgeColors: "bg-amber-100 text-amber-700",
    btnClass:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_12px_-4px_rgba(245,158,11,0.5)] hover:opacity-90",
    trackFill: "#f59e0b",
    creditsPerPack: 100,
    pricePerPack: 15,
  },
  FLAT_LAY: {
    name: "Flat Lay Tool",
    tagline: "Auto-generate flat lay shots from regular photos",
    Icon: Layers,
    accent: "violet",
    iconBg: "bg-violet-500",
    headerBg: "bg-gradient-to-br from-violet-50 to-purple-50",
    badgeColors: "bg-violet-100 text-violet-700",
    btnClass:
      "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-[0_4px_12px_-4px_rgba(139,92,246,0.5)] hover:opacity-90",
    trackFill: "#8b5cf6",
    creditsPerPack: 100,
    pricePerPack: 15,
  },
  GHOST_MANNEQUIN: {
    name: "Ghost Mannequin",
    tagline: "Remove mannequins for clean, professional clothing visuals",
    Icon: Ghost,
    accent: "teal",
    iconBg: "bg-teal-500",
    headerBg: "bg-gradient-to-br from-teal-50 to-cyan-50",
    badgeColors: "bg-teal-100 text-teal-700",
    btnClass:
      "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_4px_12px_-4px_rgba(20,184,166,0.5)] hover:opacity-90",
    trackFill: "#14b8a6",
    creditsPerPack: 100,
    pricePerPack: 20,
  },
} as const;

type AddonKey = keyof typeof ADDON_CONFIG;
const ADDON_ORDER: AddonKey[] = ["IRON_TOOL", "FLAT_LAY", "GHOST_MANNEQUIN"];

const MAX_PACKS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: SubscriptionInfo["status"]) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    TRIALING: "bg-blue-50 text-blue-700 border-blue-200",
    PAST_DUE: "bg-red-50 text-red-700 border-red-200",
    CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    INACTIVE: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    TRIALING: "Trial",
    PAST_DUE: "Past Due",
    CANCELLED: "Cancelled",
    INACTIVE: "No subscription",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? styles["INACTIVE"]
      )}
    >
      {labels[status] ?? "Inactive"}
    </span>
  );
}

function CreditBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="tabular-nums text-sm font-semibold text-zinc-900">
          {used}
          <span className="font-normal text-zinc-400"> / {total}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {total - used === 0 && (
        <p className="mt-1.5 text-xs text-red-500">
          No credits left. Upgrade or purchase more to continue.
        </p>
      )}
    </div>
  );
}

// ─── Add-on card ──────────────────────────────────────────────────────────────

function AddonCard({
  addonKey,
  currentCredits,
  packs,
  onPacksChange,
  onBuy,
  isPending,
}: {
  addonKey: AddonKey;
  currentCredits: number | undefined;
  packs: number;
  onPacksChange: (n: number) => void;
  onBuy: () => void;
  isPending: boolean;
}) {
  const cfg = ADDON_CONFIG[addonKey];
  const { Icon } = cfg;
  const totalCredits = packs * cfg.creditsPerPack;
  const totalPrice = packs * cfg.pricePerPack;
  const fillPct = ((packs - 1) / (MAX_PACKS - 1)) * 100;

  // Tick labels shown under slider
  const ticks = [1, 3, 5, 7, 10];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Coloured header */}
      <div className={cn("px-6 pt-6 pb-5", cfg.headerBg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
                cfg.iconBg
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">{cfg.name}</p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">{cfg.tagline}</p>
            </div>
          </div>

          {/* Credit balance chip */}
          <div className="shrink-0">
            {currentCredits !== undefined ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  currentCredits > 0 ? cfg.badgeColors : "bg-zinc-100 text-zinc-400"
                )}
              >
                <Package className="h-3 w-3" />
                {currentCredits.toLocaleString()} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                <Package className="h-3 w-3" />
                0 left
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-5 space-y-5">
        {/* Slider */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Quantity
            </span>
            <span className="tabular-nums text-sm font-bold text-zinc-900">
              {totalCredits.toLocaleString()}{" "}
              <span className="text-xs font-medium text-zinc-400">credits</span>
            </span>
          </div>


          {/* Custom range with gradient fill */}
          <div className="relative">
            <div
              className="absolute top-1/2 left-0 -translate-y-1/2 h-2 rounded-full pointer-events-none"
              style={{
                width: `${fillPct}%`,
                background: cfg.trackFill,
              }}
            />
            <input
              type="range"
              min={1}
              max={MAX_PACKS}
              step={1}
              value={packs}
              onChange={(e) => onPacksChange(Number(e.target.value))}
              className="relative w-full h-2 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-current"
              style={{ accentColor: cfg.trackFill }}
            />
          </div>

          {/* Tick marks + labels */}
          <div className="relative mt-2 h-4">
            {Array.from({ length: MAX_PACKS }, (_, i) => {
              const pos = (i / (MAX_PACKS - 1)) * 100;
              const isActive = i + 1 <= packs;
              const showLabel = ticks.includes(i + 1);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                >
                  <div
                    className={cn(
                      "h-1 w-0.5 rounded-full",
                      isActive ? "opacity-60" : "bg-zinc-300"
                    )}
                    style={isActive ? { background: cfg.trackFill } : undefined}
                  />
                  {showLabel && (
                    <span className="mt-0.5 text-[10px] tabular-nums text-zinc-400">
                      {(i + 1) * cfg.creditsPerPack}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Price summary */}
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-xs text-zinc-500">
              {packs} pack{packs !== 1 ? "s" : ""} × ${cfg.pricePerPack}.00
            </p>
            <p className="text-[10px] text-zinc-400">
              ${(cfg.pricePerPack / cfg.creditsPerPack).toFixed(2)} per image
            </p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">${totalPrice.toFixed(2)}</p>
        </div>

        {/* Buy button */}
        <button
          onClick={onBuy}
          disabled={isPending}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            cfg.btnClass
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          Buy {totalCredits.toLocaleString()} credits
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get("success") === "true";
  const addonSuccess = searchParams.get("addon_success") as AddonKey | null;

  const { data: subData, isLoading } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 30_000,
  });

  const subscription = subData?.data;
  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const isPaid = isActive && subscription?.plan !== "FREE";
  const isFree = subscription?.plan === "FREE";
  const hasBgRemoval =
    subscription?.plan === "FULL_TIME" || subscription?.plan === "ENTERPRISE";

  const checkoutMutation = useMutation({
    mutationFn: (plan: PlanKey) =>
      subscriptionApi.createCheckout(plan) as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => { window.location.href = data.url; },
    onError: (err: Error) => toast.error(err.message ?? "Failed to start checkout"),
  });

  const [addonPacks, setAddonPacks] = useState<Record<AddonKey, number>>({
    IRON_TOOL: 1,
    FLAT_LAY: 1,
    GHOST_MANNEQUIN: 1,
  });

  const addonMutation = useMutation({
    mutationFn: ({ addon, packs }: { addon: AddonKey; packs: number }) =>
      subscriptionApi.createAddonCheckout(addon, packs) as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => { window.location.href = data.url; },
    onError: (err: Error) => toast.error(err.message ?? "Failed to start checkout"),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.createPortal() as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => { window.location.href = data.url; },
    onError: (err: Error) => toast.error(err.message ?? "Failed to open billing portal"),
  });

  const inventoryUsed =
    isFree && subscription
      ? (subscription.monthlyInventoryCredits ?? 40) - subscription.inventoryCredits
      : 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Billing & Plan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and track your usage limits.
        </p>
      </div>

      {/* Success banners */}
      {justSubscribed && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Subscription activated!</p>
            <p className="text-xs text-emerald-600">You now have unlimited inventory and listings.</p>
          </div>
        </div>
      )}
      {addonSuccess && ADDON_CONFIG[addonSuccess] && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {ADDON_CONFIG[addonSuccess].name} credits added!
            </p>
            <p className="text-xs text-emerald-600">Your credits have been topped up and are ready to use.</p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading subscription…
        </div>
      ) : subscription ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900">
                  {subscription.plan
                    ? PLAN_DISPLAY[subscription.plan as PlanKey]?.name ?? subscription.plan
                    : "No Plan"}
                </h2>
                {statusBadge(subscription.status)}
              </div>
              {subscription.currentPeriodEnd && isActive && (
                <p className="mt-1 text-xs text-zinc-500">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
              {subscription.status === "PAST_DUE" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Payment failed — update your payment method to restore access
                </div>
              )}
            </div>
            {isPaid && (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage billing
              </button>
            )}
          </div>

          {isActive && (
            <div className="mt-5 space-y-4 rounded-xl bg-zinc-50 p-4">
              {isPaid ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <Infinity className="h-4 w-4 text-orange-500" />
                    Unlimited inventory items &amp; listings
                  </div>
                  {hasBgRemoval && subscription.monthlyBgRemovalCredits != null && (
                    <CreditBar
                      label="Background removals used this month"
                      used={subscription.monthlyBgRemovalCredits - subscription.bgRemovalCredits}
                      total={subscription.monthlyBgRemovalCredits}
                    />
                  )}
                </>
              ) : (
                <>
                  <CreditBar
                    label="Inventory slots used"
                    used={inventoryUsed}
                    total={subscription.monthlyInventoryCredits ?? 40}
                  />
                  <CreditBar
                    label="Listing credits remaining"
                    used={(subscription.monthlyCredits ?? 20) - subscription.credits}
                    total={subscription.monthlyCredits ?? 20}
                  />
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-zinc-900">
          {isActive ? "Change plan" : "Choose a plan"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLAN_DISPLAY[planKey];
            const { Icon } = plan;
            const isCurrent = subscription?.plan === planKey && isActive;
            const isFreeCard = planKey === "FREE";
            const isPending =
              checkoutMutation.isPending && checkoutMutation.variables === planKey;

            return (
              <div
                key={planKey}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-shadow",
                  plan.popular
                    ? "border-orange-300 bg-gradient-to-b from-orange-50 to-white shadow-[0_0_0_1px_theme(colors.orange.300),0_8px_24px_-8px_theme(colors.orange.200)]"
                    : "border-zinc-200 bg-white hover:shadow-md",
                  isCurrent && "ring-2 ring-emerald-400 ring-offset-2"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
                      Most popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
                      Current plan
                    </span>
                  </div>
                )}
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl",
                      plan.popular
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{plan.name}</p>
                    <p className="text-[11px] text-zinc-500">{plan.description}</p>
                  </div>
                </div>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-zinc-900">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-xs text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isFreeCard && checkoutMutation.mutate(planKey)}
                  disabled={isCurrent || isFreeCard || checkoutMutation.isPending}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed",
                    isCurrent
                      ? "cursor-default bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isFreeCard
                        ? "cursor-default border border-zinc-200 bg-zinc-50 text-zinc-400"
                        : plan.popular
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.7)] hover:opacity-90"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : isFreeCard ? (
                    "Free on sign-up"
                  ) : isActive ? (
                    "Switch to this plan"
                  ) : (
                    "Upgrade"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900">AI Photo Tools</h2>
          <p className="mt-1 text-sm text-zinc-500">
            One-time credit packs — never expire, work on any plan, stack with every purchase.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ADDON_ORDER.map((addonKey) => {
            const currentCredits =
              addonKey === "IRON_TOOL"
                ? subscription?.ironToolCredits
                : addonKey === "FLAT_LAY"
                  ? subscription?.flatLayCredits
                  : subscription?.ghostMannequinCredits;

            return (
              <AddonCard
                key={addonKey}
                addonKey={addonKey}
                currentCredits={currentCredits}
                packs={addonPacks[addonKey]}
                onPacksChange={(n) =>
                  setAddonPacks((prev) => ({ ...prev, [addonKey]: n }))
                }
                onBuy={() =>
                  addonMutation.mutate({ addon: addonKey, packs: addonPacks[addonKey] })
                }
                isPending={
                  addonMutation.isPending && addonMutation.variables?.addon === addonKey
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
