"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { MarketplaceType } from "@repo/types";
import { getMarketplaceLabel } from "@repo/utils";

/**
 * Time-based publish progress.
 *
 * Publishing is not a request the browser waits on — for Mercari the API only queues a job and
 * the Chrome extension posts it from a real mercari.com tab, which takes ~25s end to end. The bar
 * is therefore an ESTIMATE, not a measurement: it eases toward 92% over the flow's estimate and
 * then creeps, never reaching 100% until the caller unmounts it — so it can't claim the listing
 * is live before it is.
 */

interface Flow {
  /** How long a typical publish takes on this marketplace. */
  durationMs: number;
  steps: string[];
}

const MERCARI_FLOW: Flow = {
  durationMs: 25_000,
  steps: [
    "Queued for the ReList extension",
    "Extension picked up the job",
    "Uploading photos to Mercari",
    "Creating the listing",
    "Waiting for Mercari to confirm",
  ],
};

const POSHMARK_FLOW: Flow = {
  durationMs: 25_000,
  steps: [
    "Queued for the ReList extension",
    "Extension picked up the job",
    "Uploading photos to Poshmark",
    "Creating the listing",
    "Waiting for Poshmark to confirm",
  ],
};

const EBAY_FLOW: Flow = {
  durationMs: 12_000,
  steps: ["Validating your listing", "Sending it to eBay", "Waiting for eBay to confirm"],
};

const DEFAULT_FLOW: Flow = {
  durationMs: 25_000,
  steps: ["Preparing your listing", "Sending it to the marketplace", "Waiting for confirmation"],
};

/** An extension round trip (Mercari or Poshmark) dominates whenever it's one of the targets. */
function resolveFlow(marketplaces: string[]): Flow {
  if (marketplaces.includes("MERCARI")) return MERCARI_FLOW;
  if (marketplaces.includes("POSHMARK")) return POSHMARK_FLOW;
  if (marketplaces.includes("EBAY")) return EBAY_FLOW;
  return DEFAULT_FLOW;
}

/**
 * Ease-out to 92% across the estimate, then an asymptotic creep to 98%. A publish that runs long
 * keeps moving instead of freezing, but the bar never fills before the work is actually done.
 */
function progressFor(elapsedMs: number, durationMs: number): number {
  const t = elapsedMs / durationMs;
  if (t < 1) return 92 * (1 - Math.pow(1 - t, 2.2));
  return Math.min(98, 92 + 6 * (1 - Math.exp(-(elapsedMs - durationMs) / 12_000)));
}

const TICK_MS = 250;

/** Elapsed-time ticker that resets every time `active` flips on. */
function useElapsed(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

interface Props {
  active: boolean;
  /** Targets being published to — drives the estimate, the step labels and the heading. */
  marketplaces: string[];
  /** "panel" for the sidebar action card, "compact" for the listings-table cell overlay. */
  variant?: "panel" | "compact";
}

export function PublishProgress({ active, marketplaces, variant = "panel" }: Props) {
  const flow = resolveFlow(marketplaces);
  const elapsed = useElapsed(active);

  if (!active) return null;

  const percent = progressFor(elapsed, flow.durationMs);
  const stepIndex = Math.min(
    flow.steps.length - 1,
    Math.floor((elapsed / flow.durationMs) * flow.steps.length)
  );
  const currentStep = flow.steps[stepIndex]!;
  const secondsLeft = Math.ceil((flow.durationMs - elapsed) / 1000);
  const remaining = secondsLeft > 0 ? `~${secondsLeft}s left` : "Almost there…";

  const labels = marketplaces.map((m) => getMarketplaceLabel(m as MarketplaceType));
  const heading = labels.length > 0 ? `Publishing to ${labels.join(" + ")}` : "Publishing";

  if (variant === "compact") {
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col justify-center gap-1.5 bg-white/95 px-2 py-2 backdrop-blur-[1px]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={heading}
      >
        <div className="flex items-start gap-1.5">
          <Loader2 className="mt-px h-3 w-3 shrink-0 animate-spin text-orange-500" />
          <span
            className="line-clamp-2 text-[10px] font-semibold leading-tight text-zinc-700"
            aria-live="polite"
          >
            {currentStep}
          </span>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[9px] font-medium text-zinc-400">{remaining}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-orange-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label={heading}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">{heading}</p>
        <span className="text-xs font-semibold tabular-nums text-zinc-400">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-[11px] font-medium text-zinc-400">{remaining}</p>

      <ol className="mt-4 space-y-2">
        {flow.steps.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
          return (
            <li
              key={step}
              className={`flex items-center gap-2 text-xs ${
                state === "done"
                  ? "text-zinc-400"
                  : state === "active"
                    ? "font-semibold text-zinc-900"
                    : "text-zinc-300"
              }`}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                )}
              </span>
              <span aria-live={state === "active" ? "polite" : undefined}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
