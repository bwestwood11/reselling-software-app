"use client";

import { Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { subscriptionApi } from "@/lib/api";
import type { SubscriptionInfo, PlanType } from "@repo/types";
import { Check, Zap, Star, Crown, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@repo/ui";

// ─── Plan display config ───────────────────────────────────────────────────────
// Prices here are for display only — the actual charge is determined by the
// Stripe Price objects referenced in apps/api/src/config/plans.ts.
// Keep these numbers in sync when you change plan pricing.

const PLAN_DISPLAY = {
  FREE: {
    name: "Free",
    price: "$0",
    period: "",
    credits: 20,
    description: "Get started with no commitment",
    Icon: Zap,
    features: [
      "20 credits on sign-up (one-time)",
      "All marketplace integrations",
      "Inventory management",
    ],
    popular: false,
    isPaid: false,
  },
  STARTER: {
    name: "Starter",
    price: "$9.99",
    period: "/month",
    credits: 50,
    description: "Perfect for casual sellers getting started",
    Icon: Zap,
    features: [
      "50 crosspost credits per month",
      "All marketplace integrations",
      "Inventory management",
      "Basic analytics dashboard",
    ],
    popular: false,
    isPaid: true,
  },
  PRO: {
    name: "Pro",
    price: "$24.99",
    period: "/month",
    credits: 200,
    description: "For serious resellers ready to scale",
    Icon: Star,
    features: [
      "200 crosspost credits per month",
      "All marketplace integrations",
      "Inventory management",
      "Advanced analytics",
      "Priority sync",
    ],
    popular: true,
    isPaid: true,
  },
  PREMIUM: {
    name: "Premium",
    price: "$49.99",
    period: "/month",
    credits: 500,
    description: "Maximum power for high-volume sellers",
    Icon: Crown,
    features: [
      "500 crosspost credits per month",
      "All marketplace integrations",
      "Inventory management",
      "Advanced analytics",
      "Priority sync",
      "Bulk operations",
      "Priority support",
    ],
    popular: false,
    isPaid: true,
  },
} as const;

type PlanKey = keyof typeof PLAN_DISPLAY;

const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "PRO", "PREMIUM"];

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

  const { data: subData, isLoading, refetch } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 30_000,
  });

  const subscription = subData?.data;
  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const isPaidPlan = isActive && subscription?.plan !== "FREE";

  const checkoutMutation = useMutation({
    mutationFn: (plan: PlanKey) =>
      subscriptionApi.createCheckout(plan) as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to start checkout");
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.createPortal() as Promise<{ data: { url: string } }>,
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to open billing portal");
    },
  });

  const creditPct =
    isActive && subscription?.monthlyCredits
      ? Math.max(0, Math.min(100, (subscription.credits / subscription.monthlyCredits) * 100))
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Billing & Credits</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each time you crosspost a listing to a marketplace, 1 credit is used. Credits
          reset at the start of every billing cycle.
        </p>
      </div>

      {/* Success banner */}
      {justSubscribed && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Subscription activated!</p>
            <p className="text-xs text-emerald-600">Your credits have been added and you can start crossposts now.</p>
          </div>
        </div>
      )}

      {/* Current plan status */}
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

            {isPaidPlan && (
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

          {/* Credits bar */}
          {isActive && (
            <div className="mt-5 rounded-xl bg-zinc-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">Crosspost credits</span>
                <span className="tabular-nums text-sm font-semibold text-zinc-900">
                  {subscription.credits}
                  <span className="font-normal text-zinc-400"> / {subscription.monthlyCredits}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              {subscription.credits === 0 && (
                <p className="mt-2 text-xs text-red-500">
                  You&apos;ve used all your credits. They&apos;ll reset when your plan renews.
                </p>
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
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_ORDER.map((planKey) => {
            const plan = PLAN_DISPLAY[planKey];
            const { Icon } = plan;
            const isCurrent = subscription?.plan === planKey && isActive;
            const isFreeCard = planKey === "FREE";
            const isPending = checkoutMutation.isPending && checkoutMutation.variables === planKey;

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
                  <p className="mt-0.5 text-xs font-medium text-orange-600">
                    {isFreeCard
                      ? `${plan.credits} credits on sign-up`
                      : `${plan.credits} crosspost credits / month`}
                  </p>
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
                    "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                    isCurrent
                      ? "cursor-default bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isFreeCard
                        ? "cursor-default border border-zinc-200 bg-zinc-50 text-zinc-400"
                        : plan.popular
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.7)] hover:opacity-90"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    "disabled:cursor-not-allowed"
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
    </div>
  );
}
