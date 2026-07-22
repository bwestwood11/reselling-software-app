"use client";

import { Suspense, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { subscriptionApi } from "@/lib/api";
import type { SubscriptionInfo, PlanType, BillingInterval } from "@repo/types";
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
  ShoppingCart,
  Package,
  Gift,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@repo/ui";

// ─── Plan config ──────────────────────────────────────────────────────────────

interface PlanDisplay {
  name: string;
  priceMonthly: number; // dollars
  priceYearlyPerMonth: number; // dollars, per month billed annually
  description: string;
  Icon: React.ElementType;
  features: string[];
  popular: boolean;
  /** false = contact-sales (Enterprise); FREE is the trial tier, not purchasable */
  purchasable: boolean;
}

const PLAN_DISPLAY: Record<PlanType, PlanDisplay> = {
  FREE: {
    name: "Free Trial",
    priceMonthly: 0,
    priceYearlyPerMonth: 0,
    description: "7-day free trial — card required, cancel anytime",
    Icon: Gift,
    features: [
      "Everything free for 7 days",
      "Up to 50 inventory items",
      "20 smart AI credits",
      "Access to all marketplaces",
    ],
    popular: false,
    purchasable: false,
  },
  SIDE_HUSTLE: {
    name: "Side Hustle",
    priceMonthly: 39.99,
    priceYearlyPerMonth: 34.99,
    description: "For casual sellers ready to scale up",
    Icon: Briefcase,
    features: [
      "1,500 inventory items",
      "500 smart AI credits / month",
      "Analytics & tax-ready reports",
      "Import from marketplaces (eBay)",
      "Sale detection & auto-delist",
      "Priority email support",
    ],
    popular: false,
    purchasable: true,
  },
  FULL_TIME: {
    name: "Full-Time",
    priceMonthly: 64.99,
    priceYearlyPerMonth: 59.99,
    description: "For serious resellers growing their business",
    Icon: Star,
    features: [
      "Everything in Side Hustle",
      "3,000 inventory items",
      "750 smart AI credits / month",
    ],
    popular: true,
    purchasable: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceMonthly: 0,
    priceYearlyPerMonth: 0,
    description: "Custom plan tailored to high-volume sellers",
    Icon: Crown,
    features: [
      "Custom inventory limits",
      "Custom smart AI credits",
      "Dedicated onboarding & support",
    ],
    popular: false,
    purchasable: false,
  },
};

const PLAN_ORDER: PlanType[] = ["FREE", "SIDE_HUSTLE", "FULL_TIME", "ENTERPRISE"];
const ENTERPRISE_CONTACT = "mailto:support@relist.app?subject=Enterprise%20plan%20inquiry";

// ─── Top-up config ──────────────────────────────────────────────────────────────

const TOPUP = {
  creditsPerPack: 100,
  pricePerPack: 15,
};
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
    TRIALING: "Free trial",
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

function UsageBar({
  label,
  used,
  total,
  suffix,
}: {
  label: string;
  used: number;
  total: number;
  suffix?: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="tabular-nums text-sm font-semibold text-zinc-900">
          {used.toLocaleString()}
          <span className="font-normal text-zinc-400">
            {" "}
            / {total.toLocaleString()}
            {suffix ? ` ${suffix}` : ""}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
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
  const topupSuccess = searchParams.get("topup_success") === "true";

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [packs, setPacks] = useState(1);

  const { data: subData, isLoading } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 30_000,
  });

  const subscription = subData?.data;
  const isActive = subscription?.isActive ?? false;
  const isTrialing = subscription?.isTrialing ?? false;
  const hasSubscribed = isActive || subscription?.status === "PAST_DUE";

  const checkoutMutation = useMutation({
    mutationFn: (plan: PlanType) =>
      subscriptionApi.createCheckout(plan, interval) as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to start checkout"),
  });

  const topupMutation = useMutation({
    mutationFn: (n: number) =>
      subscriptionApi.createTopupCheckout(n) as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to start checkout"),
  });

  const portalMutation = useMutation({
    mutationFn: () => subscriptionApi.createPortal() as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to open billing portal"),
  });

  const monthlyUsed = subscription
    ? Math.max(0, subscription.monthlyAiCredits - subscription.aiCredits)
    : 0;
  const totalCredits = subscription
    ? subscription.aiCredits + subscription.bonusAiCredits
    : 0;

  const topupTotalCredits = packs * TOPUP.creditsPerPack;
  const topupTotalPrice = packs * TOPUP.pricePerPack;
  const topupFillPct = ((packs - 1) / (MAX_PACKS - 1)) * 100;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Billing & Plan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and track your usage.
        </p>
      </div>

      {/* Success banners */}
      {justSubscribed && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">You&apos;re all set!</p>
            <p className="text-xs text-emerald-600">
              Your 7-day free trial has started. Explore everything — cancel anytime before it ends.
            </p>
          </div>
        </div>
      )}
      {topupSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">AI credits added!</p>
            <p className="text-xs text-emerald-600">
              Your smart AI credit balance has been topped up and is ready to use.
            </p>
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
                    ? (PLAN_DISPLAY[subscription.plan]?.name ?? subscription.plan)
                    : "No Plan"}
                </h2>
                {statusBadge(subscription.status)}
              </div>
              {isTrialing && subscription.trialEndsAt && (
                <p className="mt-1 text-xs text-blue-600">
                  Free trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()} — you&apos;ll
                  be charged then unless you cancel.
                </p>
              )}
              {!isTrialing && subscription.currentPeriodEnd && isActive && (
                <p className="mt-1 text-xs text-zinc-500">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  {subscription.billingInterval ? ` · billed ${subscription.billingInterval}` : ""}
                </p>
              )}
              {subscription.status === "PAST_DUE" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Payment failed — update your payment method to restore access
                </div>
              )}
            </div>
            {hasSubscribed && (
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
              <UsageBar
                label="Inventory items"
                used={subscription.inventoryUsed}
                total={subscription.inventoryLimit}
              />
              <UsageBar
                label="Smart AI credits used this cycle"
                used={monthlyUsed}
                total={subscription.monthlyAiCredits}
              />
              <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Available AI credits
                </span>
                <span className="tabular-nums font-semibold text-zinc-900">
                  {totalCredits.toLocaleString()}
                  {subscription.bonusAiCredits > 0 && (
                    <span className="ml-1 font-normal text-zinc-400">
                      ({subscription.bonusAiCredits.toLocaleString()} top-up)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm font-medium",
            interval === "monthly" ? "text-zinc-900" : "text-zinc-400"
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={interval === "yearly"}
          onClick={() => setInterval((i) => (i === "monthly" ? "yearly" : "monthly"))}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            interval === "yearly" ? "bg-orange-500" : "bg-zinc-300"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              interval === "yearly" ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium",
            interval === "yearly" ? "text-zinc-900" : "text-zinc-400"
          )}
        >
          Yearly
          <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            Save more
          </span>
        </span>
      </div>

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
            const isEnterprise = planKey === "ENTERPRISE";
            const isFreeCard = planKey === "FREE";
            const isPending =
              checkoutMutation.isPending && checkoutMutation.variables === planKey;
            const perMonth =
              interval === "yearly" ? plan.priceYearlyPerMonth : plan.priceMonthly;

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
                  {isEnterprise ? (
                    <span className="text-2xl font-bold text-zinc-900">Custom</span>
                  ) : isFreeCard ? (
                    <span className="text-3xl font-bold text-zinc-900">$0</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-zinc-900">
                        ${perMonth.toFixed(2)}
                      </span>
                      <span className="text-sm text-zinc-500">/mo</span>
                      {interval === "yearly" && (
                        <p className="mt-0.5 text-[11px] text-zinc-400">billed annually</p>
                      )}
                    </>
                  )}
                </div>
                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-xs text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <a
                    href={ENTERPRISE_CONTACT}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50"
                  >
                    Contact support
                  </a>
                ) : (
                  <button
                    onClick={() => plan.purchasable && checkoutMutation.mutate(planKey)}
                    disabled={isCurrent || !plan.purchasable || checkoutMutation.isPending}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed",
                      isCurrent
                        ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : !plan.purchasable
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
                      "Included with every plan"
                    ) : hasSubscribed ? (
                      "Switch to this plan"
                    ) : (
                      "Start 7-day free trial"
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!hasSubscribed && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            A card is required to start your trial. You won&apos;t be charged until the 7-day trial
            ends, and you can cancel anytime.
          </p>
        )}
      </div>

      {/* AI credit top-up */}
      <div>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900">Buy more smart AI credits</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Need more than your monthly allotment? Top up anytime — purchased credits never expire.
            BG removal costs 1 credit; iron, flat lay & ghost mannequin cost 5 each.
          </p>
        </div>
        <div className="max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gradient-to-br from-orange-50 to-amber-50 px-6 pb-5 pt-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">Smart AI Credits</p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">
                Works on any plan · never expires
              </p>
            </div>
            {subscription && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                <Package className="h-3 w-3" />
                {totalCredits.toLocaleString()} left
              </span>
            )}
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Quantity
                </span>
                <span className="tabular-nums text-sm font-bold text-zinc-900">
                  {topupTotalCredits.toLocaleString()}{" "}
                  <span className="text-xs font-medium text-zinc-400">credits</span>
                </span>
              </div>
              <div className="relative">
                <div
                  className="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-orange-500"
                  style={{ width: `${topupFillPct}%` }}
                />
                <input
                  type="range"
                  min={1}
                  max={MAX_PACKS}
                  step={1}
                  value={packs}
                  onChange={(e) => setPacks(Number(e.target.value))}
                  className="relative h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200"
                  style={{ accentColor: "#f97316" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">
                  {packs} pack{packs !== 1 ? "s" : ""} × ${TOPUP.pricePerPack}.00
                </p>
                <p className="text-[10px] text-zinc-400">
                  ${(TOPUP.pricePerPack / TOPUP.creditsPerPack).toFixed(2)} per credit
                </p>
              </div>
              <p className="text-2xl font-bold text-zinc-900">${topupTotalPrice.toFixed(2)}</p>
            </div>

            <button
              onClick={() => topupMutation.mutate(packs)}
              disabled={topupMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.5)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {topupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              Buy {topupTotalCredits.toLocaleString()} credits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
