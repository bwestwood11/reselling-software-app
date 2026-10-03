"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { VIZ } from "./chart-utils";

interface Props {
  label: string;
  value: string;
  /** Current and previous raw values, for the change line. Omit to hide it. */
  current?: number | null;
  previous?: number | null;
  /** How the previous value reads ("$1,203.85", "12.5%"). */
  previousLabel?: string;
  /** For "days to sell", a drop is the good direction. */
  lowerIsBetter?: boolean;
  /** Percentage-point change instead of relative change (for rates like sell-through). */
  pointChange?: boolean;
  spark?: number[];
  hint?: string;
}

/** Headline figure + change vs the previous period + optional sparkline. */
export function StatTile({
  label,
  value,
  current,
  previous,
  previousLabel,
  lowerIsBetter,
  pointChange,
  spark,
  hint,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500" title={hint}>
        {label}
      </p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
        {spark && spark.some((v) => v !== 0) && <Sparkline values={spark} />}
      </div>
      {current !== undefined && (
        <Change
          current={current ?? null}
          previous={previous ?? null}
          previousLabel={previousLabel}
          lowerIsBetter={lowerIsBetter}
          pointChange={pointChange}
        />
      )}
    </div>
  );
}

function Change({
  current,
  previous,
  previousLabel,
  lowerIsBetter,
  pointChange,
}: {
  current: number | null;
  previous: number | null;
  previousLabel?: string;
  lowerIsBetter?: boolean;
  pointChange?: boolean;
}) {
  const prevText = <span className="text-zinc-500">{previousLabel ?? "—"} previous period</span>;
  if (current == null || previous == null) return <p className="text-xs">{prevText}</p>;

  const diff = current - previous;
  let changeText: string;
  if (pointChange) {
    changeText = `${diff >= 0 ? "+" : "−"}${Math.abs(diff * 100).toFixed(1)} pts`;
  } else if (previous === 0) {
    changeText = diff === 0 ? "0%" : "New";
  } else {
    const rel = Math.abs((diff / Math.abs(previous)) * 100);
    // A one-decimal figure under 10% so a small real change never reads as "+0%".
    changeText = `${diff >= 0 ? "+" : "−"}${rel < 10 ? rel.toFixed(1) : rel.toFixed(0)}%`;
  }

  const flat = Math.abs(diff) < 1e-9;
  const good = flat ? null : (diff > 0) !== !!lowerIsBetter;
  const Icon = flat ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  const color = good == null ? VIZ.muted : good ? VIZ.good : VIZ.critical;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color }}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {changeText}
        <span className="sr-only">{good == null ? "no change" : good ? "improvement" : "decline"}</span>
      </span>
      {prevText}
    </p>
  );
}

/** A 2px trend line with no axes — the tile's title names the series, the number is the value. */
function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 32;
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1e-9);
  const x = (i: number) => (values.length <= 1 ? w / 2 : (i / (values.length - 1)) * (w - 2) + 1);
  const y = (v: number) => h - 2 - ((v - min) / (max - min)) * (h - 4);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={VIZ.series1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
