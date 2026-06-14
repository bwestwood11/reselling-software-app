"use client";

import Link from "next/link";
import { Eraser, Layers, Sparkles, Lock, ShoppingCart, Ghost } from "lucide-react";
import { cn } from "@repo/ui";
import type { SubscriptionInfo } from "@repo/types";

export interface EditOptions {
  removeBackground: boolean;
  flatLay: boolean;
  ironing: boolean;
  ghostMannequin: boolean;
}

interface ToolConfig {
  key: keyof EditOptions;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  activeIconBg: string;
  activeTextColor: string;
  activeBorder: string;
  activeBg: string;
  iconBg: string;
  creditBadgeActive: string;
  creditBadgeLow: string;
  getLockReason: (sub: SubscriptionInfo | undefined) => string | null;
  getCredits: (sub: SubscriptionInfo | undefined) => number | null;
  upgradeLink: string;
  upgradeText: string;
}

const TOOLS: ToolConfig[] = [
  {
    key: "removeBackground",
    label: "BG Remove",
    sublabel: "Cut out backgrounds",
    Icon: Eraser,
    activeIconBg: "bg-orange-500",
    activeTextColor: "text-orange-700",
    activeBorder: "border-orange-200",
    activeBg: "bg-orange-50",
    iconBg: "bg-orange-100 text-orange-600",
    creditBadgeActive: "bg-orange-100 text-orange-600",
    creditBadgeLow: "bg-red-100 text-red-600",
    getLockReason: (sub) => {
      if (sub?.plan !== "FULL_TIME" && sub?.plan !== "ENTERPRISE") {
        return "Full-Time plan required";
      }
      if ((sub?.bgRemovalCredits ?? 0) === 0) return "0 credits this month";
      return null;
    },
    getCredits: (sub) => {
      if (sub?.plan !== "FULL_TIME" && sub?.plan !== "ENTERPRISE") return null;
      return sub?.bgRemovalCredits ?? null;
    },
    upgradeLink: "/settings/billing",
    upgradeText: "Upgrade to Full-Time",
  },
  {
    key: "ironing",
    label: "Iron Tool",
    sublabel: "Remove wrinkles",
    Icon: Sparkles,
    activeIconBg: "bg-amber-500",
    activeTextColor: "text-amber-700",
    activeBorder: "border-amber-200",
    activeBg: "bg-amber-50",
    iconBg: "bg-amber-100 text-amber-600",
    creditBadgeActive: "bg-amber-100 text-amber-700",
    creditBadgeLow: "bg-red-100 text-red-600",
    getLockReason: (sub) => {
      if ((sub?.ironToolCredits ?? 0) === 0) return "No credits";
      return null;
    },
    getCredits: (sub) => sub?.ironToolCredits ?? null,
    upgradeLink: "/settings/billing#addons",
    upgradeText: "Buy Iron Tool credits",
  },
  {
    key: "flatLay",
    label: "Flat Lay",
    sublabel: "Generate flat lay shots",
    Icon: Layers,
    activeIconBg: "bg-violet-500",
    activeTextColor: "text-violet-700",
    activeBorder: "border-violet-200",
    activeBg: "bg-violet-50",
    iconBg: "bg-violet-100 text-violet-600",
    creditBadgeActive: "bg-violet-100 text-violet-700",
    creditBadgeLow: "bg-red-100 text-red-600",
    getLockReason: (sub) => {
      if ((sub?.flatLayCredits ?? 0) === 0) return "No credits";
      return null;
    },
    getCredits: (sub) => sub?.flatLayCredits ?? null,
    upgradeLink: "/settings/billing#addons",
    upgradeText: "Buy Flat Lay credits",
  },
  {
    key: "ghostMannequin",
    label: "Ghost Mannequin",
    sublabel: "Remove mannequins",
    Icon: Ghost,
    activeIconBg: "bg-teal-500",
    activeTextColor: "text-teal-700",
    activeBorder: "border-teal-200",
    activeBg: "bg-teal-50",
    iconBg: "bg-teal-100 text-teal-600",
    creditBadgeActive: "bg-teal-100 text-teal-700",
    creditBadgeLow: "bg-red-100 text-red-600",
    getLockReason: (sub) => {
      if ((sub?.ghostMannequinCredits ?? 0) === 0) return "No credits";
      return null;
    },
    getCredits: (sub) => sub?.ghostMannequinCredits ?? null,
    upgradeLink: "/settings/billing#addons",
    upgradeText: "Buy Ghost Mannequin credits",
  },
];

interface Props {
  subscription: SubscriptionInfo | undefined;
  editOptions: EditOptions;
  onToggle: (key: keyof EditOptions) => void;
}

export function PhotoToolbar({ subscription, editOptions, onToggle }: Props) {
  return (
    <div className="mt-4 space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        AI Photo Tools
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOLS.map(
          ({
            key,
            label,
            sublabel,
            Icon,
            activeIconBg,
            activeTextColor,
            activeBorder,
            activeBg,
            iconBg,
            creditBadgeActive,
            creditBadgeLow,
            getLockReason,
            getCredits,
            upgradeLink,
            upgradeText,
          }) => {
            const lockReason = getLockReason(subscription);
            const isLocked = lockReason !== null;
            const active = !isLocked && editOptions[key];
            const credits = getCredits(subscription);
            const isLow = credits !== null && credits > 0 && credits < 10;
            const isDepleted = credits !== null && credits === 0;

            return (
              <div key={key} className="group relative">
                <button
                  type="button"
                  onClick={() => !isLocked && onToggle(key)}
                  className={cn(
                    "relative flex w-full flex-col items-start rounded-xl border p-3 text-left transition-all",
                    isLocked
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
                      : active
                        ? cn("border shadow-sm", activeBorder, activeBg)
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      "mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      isLocked
                        ? "bg-zinc-200 text-zinc-400"
                        : active
                          ? cn(activeIconBg, "text-white")
                          : iconBg
                    )}
                  >
                    {isLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className={cn(
                      "block text-xs font-semibold",
                      isLocked
                        ? "text-zinc-400"
                        : active
                          ? activeTextColor
                          : "text-zinc-700"
                    )}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-zinc-400">
                    {sublabel}
                  </span>

                  {/* Credit badge */}
                  {!isLocked && credits !== null && (
                    <span
                      className={cn(
                        "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        isDepleted
                          ? "bg-red-100 text-red-500"
                          : isLow
                            ? creditBadgeLow
                            : creditBadgeActive
                      )}
                    >
                      {credits}
                    </span>
                  )}
                </button>

                {/* Hover tooltip for locked tools */}
                {isLocked && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-40 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                    <p className="text-[11px] font-medium text-zinc-700">{lockReason}</p>
                    <Link
                      href={upgradeLink}
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      {upgradeText}
                    </Link>
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-zinc-200 bg-white" />
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Bottom hints — only when something is actually actionable */}
      {subscription && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {subscription.plan !== "FULL_TIME" && subscription.plan !== "ENTERPRISE" && (
            <p className="text-[10px] text-zinc-400">
              BG removal on{" "}
              <Link href="/settings/billing" className="font-medium text-orange-500 hover:underline">
                Full-Time plan
              </Link>
            </p>
          )}
          {(subscription.ironToolCredits === 0 || subscription.flatLayCredits === 0) && (
            <p className="text-[10px] text-zinc-400">
              <Link href="/settings/billing" className="font-medium text-orange-500 hover:underline">
                Buy credits
              </Link>{" "}
              for Iron / Flat Lay ($15 · 100 uses)
            </p>
          )}
          {subscription.ghostMannequinCredits === 0 && (
            <p className="text-[10px] text-zinc-400">
              <Link href="/settings/billing" className="font-medium text-orange-500 hover:underline">
                Buy credits
              </Link>{" "}
              for Ghost Mannequin ($20 · 100 uses)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
