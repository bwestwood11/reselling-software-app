"use client";

import { useState } from "react";
import type { AnalyticsSeriesPoint } from "@repo/types";
import {
  VIZ,
  fmtBucket,
  fmtMoney,
  fmtMoneyCompact,
  niceScale,
  useElementWidth,
} from "./chart-utils";

const HEIGHT = 280;
const PAD = { top: 16, right: 64, bottom: 28, left: 52 };

const SERIES = [
  { key: "revenue", label: "Revenue", color: VIZ.series1 },
  { key: "profit", label: "Profit", color: VIZ.series2 },
] as const;

interface Props {
  points: AnalyticsSeriesPoint[];
  granularity: "day" | "week" | "month";
  view: "chart" | "table";
}

/** Revenue and profit over time — both in dollars, so one shared axis (never dual-axis). */
export function RevenueProfitChart({ points, granularity, view }: Props) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  if (view === "table") return <SeriesTable points={points} granularity={granularity} />;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const values = points.flatMap((p) => [p.revenue, p.profit]);
  const scale = niceScale(Math.min(...values, 0), Math.max(...values, 0));
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;
  const path = (key: "revenue" | "profit") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");

  // Keep roughly 6–8 x labels whatever the bucket count.
  const labelStep = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 80))));

  // End-of-line labels, nudged apart when the two lines finish close together.
  const last = points.length - 1;
  const endY = SERIES.map((s) => (last >= 0 ? y(points[last]![s.key]) : 0));
  if (Math.abs(endY[0]! - endY[1]!) < 14) {
    const mid = (endY[0]! + endY[1]!) / 2;
    const up = endY[0]! <= endY[1]! ? 0 : 1;
    endY[up] = mid - 7;
    endY[1 - up] = mid + 7;
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(last, Math.round(rel * last))));
  }

  const hovered = hover != null ? points[hover] : undefined;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Revenue and profit over time. Switch to the table view for exact values."
        >
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} />
              <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" fontSize={11} fill={VIZ.muted} className="tabular-nums">
                {fmtMoneyCompact(t)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            // The last bucket is always labelled, so drop a stepped label that would crowd it.
            (i % labelStep === 0 && last - i >= labelStep * 0.75) || i === last ? (
              <text
                key={p.date}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                fontSize={11}
                fill={hover === i ? VIZ.ink : VIZ.muted}
              >
                {fmtBucket(p.date, granularity)}
              </text>
            ) : null
          )}

          {/* A faint wash under revenue only; profit stays a bare line so the two never stack-read. */}
          <path
            d={`${path("revenue")}L${x(last).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`}
            fill={VIZ.series1}
            opacity={0.08}
          />
          {SERIES.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
          ))}

          {/* Direct labels at the line ends (legend above carries the same identity). */}
          {last >= 0 &&
            SERIES.map((s, i) => (
              <text key={s.key} x={x(last) + 8} y={endY[i]! + 4} fontSize={11} fontWeight={600} fill={VIZ.inkSecondary}>
                {s.label}
              </text>
            ))}

          {hovered && (
            <g pointerEvents="none">
              <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + innerH} stroke={VIZ.axis} />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover!)}
                  cy={y(hovered[s.key])}
                  r={4.5}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: x(hover!),
            transform: x(hover!) > width / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="mb-1 font-medium text-zinc-500">{fmtBucket(hovered.date, granularity, true)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900">{fmtMoney(hovered[s.key])}</span>
            </p>
          ))}
          <p className="mt-1 text-zinc-500">
            {hovered.unitsSold} sold · {hovered.unitsListed} listed
          </p>
        </div>
      )}
    </div>
  );
}

export function SeriesLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-zinc-600">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function SeriesTable({ points, granularity }: Omit<Props, "view">) {
  const rows = points.filter((p) => p.revenue || p.unitsSold || p.unitsListed);
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">No sales or new listings in this period.</p>;
  }
  return (
    <div className="max-h-[280px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-xs text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th className="py-2 text-left font-medium">{granularity === "day" ? "Date" : granularity === "week" ? "Week of" : "Month"}</th>
            <th className="py-2 text-right font-medium">Revenue</th>
            <th className="py-2 text-right font-medium">Profit</th>
            <th className="py-2 text-right font-medium">Sold</th>
            <th className="py-2 text-right font-medium">Listed</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((p) => (
            <tr key={p.date} className="border-b border-zinc-100 last:border-0">
              <td className="py-1.5 text-zinc-700">{fmtBucket(p.date, granularity, granularity === "month")}</td>
              <td className="py-1.5 text-right text-zinc-900">{fmtMoney(p.revenue)}</td>
              <td className="py-1.5 text-right text-zinc-900">{fmtMoney(p.profit)}</td>
              <td className="py-1.5 text-right text-zinc-700">{p.unitsSold}</td>
              <td className="py-1.5 text-right text-zinc-700">{p.unitsListed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
