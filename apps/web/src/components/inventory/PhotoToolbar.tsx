"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Eraser,
  Layers,
  Sparkles,
  Lock,
  ShoppingCart,
  Ghost,
  Zap,
  Wand2,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/ui";
import type { SubscriptionInfo } from "@repo/types";

export interface EditOptions {
  removeBackground: boolean;
  flatLay: boolean;
  ironing: boolean;
  ghostMannequin: boolean;
}

export interface ToolConfig {
  key: keyof EditOptions;
  label: string;
  sublabel: string;
  /** Smart AI credit cost for this effect. */
  cost: number;
  Icon: React.ElementType;
  activeIconBg: string;
  activeTextColor: string;
  activeBorder: string;
  activeRing: string;
  activeBg: string;
  iconBg: string;
}

export const TOOLS: ToolConfig[] = [
  {
    key: "removeBackground",
    label: "BG Remove",
    sublabel: "Cut out backgrounds",
    cost: 1,
    Icon: Eraser,
    activeIconBg: "bg-orange-500",
    activeTextColor: "text-orange-700",
    activeBorder: "border-orange-200",
    activeRing: "ring-orange-200",
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
    activeRing: "ring-amber-200",
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
    activeRing: "ring-violet-200",
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
    activeRing: "ring-teal-200",
    activeBg: "bg-teal-50",
    iconBg: "bg-teal-100 text-teal-600",
  },
];

export function totalBalance(sub: SubscriptionInfo | undefined): number {
  if (!sub) return 0;
  return (sub.aiCredits ?? 0) + (sub.bonusAiCredits ?? 0);
}

export function toolLockReason(
  sub: SubscriptionInfo | undefined,
  cost: number
): string | null {
  const entitled = sub?.isActive ?? false;
  if (!entitled) return "Start your free trial";
  if (totalBalance(sub) < cost) return "Not enough credits";
  return null;
}

interface Props {
  subscription: SubscriptionInfo | undefined;
  editOptions: EditOptions;
  onToggle: (key: keyof EditOptions) => void;
}

export function PhotoToolbar({ subscription, editOptions, onToggle }: Props) {
  const entitled = subscription?.isActive ?? false;
  const balance = totalBalance(subscription);
  const anySelected = Object.values(editOptions).some(Boolean);

  return (
    <div className="mt-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            AI Photo Tools
          </p>
          <p className="mt-0.5 text-[10.5px] leading-tight text-zinc-400">
            {anySelected
              ? "Will auto-apply to photos you add next."
              : "Select a tool to auto-edit new photos as you add them."}
          </p>
        </div>
        {subscription && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 tabular-nums">
            <Zap className="h-3 w-3" />
            {balance.toLocaleString()}
          </span>
        )}
      </div>

      {/* Always 2 columns — this toolbar only ever sits in a ~380px sidebar column, never
          full page width, so a viewport-based sm:grid-cols-4 breakpoint just crams 4 cards
          into that narrow space and overflows (e.g. "Ghost Mannequin" + its cost badge). */}
      <div className="grid grid-cols-2 gap-2">
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
            activeRing,
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
                  aria-pressed={active}
                  onClick={() => !isLocked && onToggle(key)}
                  className={cn(
                    "relative flex w-full flex-col items-start rounded-xl border p-3 text-left transition-all",
                    isLocked
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
                      : active
                        ? cn("border shadow-sm ring-1", activeBorder, activeBg, activeRing)
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                  )}
                >
                  <div className="mb-2.5 flex w-full items-center justify-between">
                    {/* Icon */}
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
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

                    {/* Active checkmark — reinforces selection state beyond color alone */}
                    {active && (
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-white", activeIconBg)}>
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>

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

interface PhotoAIMenuProps {
  subscription: SubscriptionInfo | undefined;
  /** True while an AI tool is being applied to this specific photo. */
  applying: boolean;
  onSelect: (key: keyof EditOptions) => void;
}

/**
 * Compact "magic wand" menu meant to sit in a photo thumbnail's hover controls,
 * letting the user run any AI photo tool on that *specific* existing photo —
 * unlike {@link PhotoToolbar}, which only affects photos added afterwards.
 */
export function PhotoAIMenu({ subscription, applying, onSelect }: PhotoAIMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="Edit with AI"
        disabled={applying}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white transition-opacity",
          applying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          "disabled:cursor-wait"
        )}
      >
        {applying ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Wand2 className="h-3 w-3" />
        )}
      </button>

      {open && !applying && (
        <div className="absolute bottom-full left-0 z-30 mb-1.5 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          {TOOLS.map(({ key, label, cost, Icon, iconBg }) => {
            const lockReason = toolLockReason(subscription, cost);
            const isLocked = lockReason !== null;
            return (
              <button
                key={key}
                type="button"
                disabled={isLocked}
                title={lockReason ?? undefined}
                onClick={() => {
                  setOpen(false);
                  onSelect(key);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition-colors",
                  isLocked
                    ? "cursor-not-allowed text-zinc-300"
                    : "text-zinc-700 hover:bg-zinc-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                    isLocked ? "bg-zinc-100 text-zinc-300" : iconBg
                  )}
                >
                  {isLocked ? <Lock className="h-2.5 w-2.5" /> : <Icon className="h-2.5 w-2.5" />}
                </span>
                <span className="flex-1 truncate">{label}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">{cost}cr</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
