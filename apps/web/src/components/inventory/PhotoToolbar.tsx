"use client";

import Link from "next/link";
import { Eraser, Layers, Sparkles, Lock, ShoppingCart, Ghost, Zap } from "lucide-react";
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
  /** Smart AI credit cost for this effect. */
  cost: number;
  Icon: React.ElementType;
  activeIconBg: string;
  activeTextColor: string;
  activeBorder: string;
  activeBg: string;
  iconBg: string;
}

const TOOLS: ToolConfig[] = [
  {
    key: "removeBackground",
    label: "BG Remove",
    sublabel: "Cut out backgrounds",
    cost: 1,
    Icon: Eraser,
    activeIconBg: "bg-orange-500",
    activeTextColor: "text-orange-700",
    activeBorder: "border-orange-200",
    activeBg: "bg-orange-50",
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    key: "ironing",
    label: "Iron Tool",
    sublabel: "Remove wrinkles",
    cost: 10,
    Icon: Sparkles,
    activeIconBg: "bg-amber-500",
    activeTextColor: "text-amber-700",
    activeBorder: "border-amber-200",
    activeBg: "bg-amber-50",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    key: "flatLay",
    label: "Flat Lay",
    sublabel: "Generate flat lay shots",
    cost: 10,
    Icon: Layers,
    activeIconBg: "bg-violet-500",
    activeTextColor: "text-violet-700",
    activeBorder: "border-violet-200",
    activeBg: "bg-violet-50",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    key: "ghostMannequin",
    label: "Ghost Mannequin",
    sublabel: "Remove mannequins",
    cost: 10,
    Icon: Ghost,
    activeIconBg: "bg-teal-500",
    activeTextColor: "text-teal-700",
    activeBorder: "border-teal-200",
    activeBg: "bg-teal-50",
    iconBg: "bg-teal-100 text-teal-600",
  },
];

function totalBalance(sub: SubscriptionInfo | undefined): number {
  if (!sub) return 0;
  return (sub.aiCredits ?? 0) + (sub.bonusAiCredits ?? 0);
}

interface Props {
  subscription: SubscriptionInfo | undefined;
  editOptions: EditOptions;
  onToggle: (key: keyof EditOptions) => void;
}

export function PhotoToolbar({ subscription, editOptions, onToggle }: Props) {
  const entitled = subscription?.isActive ?? false;
  const balance = totalBalance(subscription);

  return (
    <div className="mt-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          AI Photo Tools
        </p>
        {subscription && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 tabular-nums">
            <Zap className="h-3 w-3" />
            {balance.toLocaleString()} credits
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOLS.map(
          ({
            key,
            label,
            sublabel,
            cost,
            Icon,
            activeIconBg,
            activeTextColor,
            activeBorder,
            activeBg,
            iconBg,
          }) => {
            const lockReason = !entitled
              ? "Start your free trial"
              : balance < cost
                ? "Not enough credits"
                : null;
            const isLocked = lockReason !== null;
            const active = !isLocked && editOptions[key];

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
                      isLocked ? "text-zinc-400" : active ? activeTextColor : "text-zinc-700"
                    )}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-zinc-400">
                    {sublabel}
                  </span>

                  {/* Cost badge */}
                  <span
                    className={cn(
                      "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      isLocked ? "bg-zinc-200 text-zinc-400" : "bg-zinc-100 text-zinc-500"
                    )}
                  >
                    {cost} cr
                  </span>
                </button>

                {/* Hover tooltip for locked tools */}
                {isLocked && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                    <p className="text-[11px] font-medium text-zinc-700">{lockReason}</p>
                    <Link
                      href="/settings/billing"
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      {entitled ? "Buy more AI credits" : "View plans"}
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

      {/* Bottom hint */}
      {subscription && balance < 10 && (
        <p className="text-[10px] text-zinc-400">
          Running low —{" "}
          <Link href="/settings/billing" className="font-medium text-orange-500 hover:underline">
            {entitled ? "top up your AI credits" : "start your free trial"}
          </Link>
          . BG removal costs 1 credit; other tools cost 10.
        </p>
      )}
    </div>
  );
}
