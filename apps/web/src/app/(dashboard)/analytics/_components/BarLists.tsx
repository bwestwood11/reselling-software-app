"use client";

import type { AnalyticsBreakdownRow, AnalyticsMarketplaceRow } from "@repo/types";
import { VIZ, fmtMoney, fmtMoneyCompact } from "./chart-utils";

/** A bar's width as a share of the row's track; tiny non-zero values still show a sliver. */
function pct(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "0%";
  return `${Math.max(1.5, (value / max) * 100)}%`;
}

/** Rounded data end, square at the baseline. */
const BAR_RADIUS = "0 4px 4px 0";

/**
 * Ranked units sold — one series, so one color for every bar (no darker-where-bigger ramp).
 * The value label sits past the bar end so it never clips inside a short bar.
 */
export function RankedBars({ rows, empty }: { rows: AnalyticsBreakdownRow[]; empty: string }) {
  if (rows.length === 0) return <EmptyNote text={empty} />;
  const max = Math.max(...rows.map((r) => r.unitsSold));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li
          key={r.key}
          className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3"
          title={`${r.label}: ${r.unitsSold} sold · ${fmtMoney(r.revenue)} revenue · ${fmtMoney(r.profit)} profit`}
        >
          <span className="truncate text-sm text-zinc-700">{r.label}</span>
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="h-4 shrink-0"
              style={{ width: pct(r.unitsSold, max), maxWidth: "calc(100% - 6.5rem)", background: VIZ.series1, borderRadius: BAR_RADIUS }}
            />
            <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
              <span className="font-semibold text-zinc-900">{r.unitsSold}</span> sold ·{" "}
              {fmtMoneyCompact(r.revenue)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Revenue vs profit per marketplace: two thin bars per row on one shared dollar scale. */
export function MarketplaceBars({ rows }: { rows: AnalyticsMarketplaceRow[] }) {
  if (rows.length === 0) return <EmptyNote text="No sales in this period." />;
  const max = Math.max(...rows.map((r) => Math.max(r.revenue, r.profit)));
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-zinc-800">{r.label}</span>
            <span className="shrink-0 text-xs text-zinc-500">
              {r.unitsSold} sold
            </span>
          </div>
          {/* 2px surface gap between the two bars of a row */}
          <div className="space-y-0.5">
            {(
              [
                ["Revenue", r.revenue, VIZ.series1],
                ["Profit", r.profit, VIZ.series2],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-2" title={`${label}: ${fmtMoney(value)}`}>
                <div
                  className="h-3 shrink-0"
                  style={{ width: pct(value, max), maxWidth: "calc(100% - 5rem)", background: color, borderRadius: BAR_RADIUS }}
                />
                <span className="whitespace-nowrap text-xs tabular-nums text-zinc-700">
                  <span className="sr-only">{label} </span>
                  {fmtMoneyCompact(value)}
                  {value < 0 && <span className="ml-1 text-zinc-500">(sold below cost)</span>}
                </span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{text}</p>;
}
