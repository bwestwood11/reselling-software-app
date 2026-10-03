"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Chart colors — the validated reference palette (slots 1–2 pass every categorical check on the
 * white card surface) plus the chrome/ink roles the dashboard's charts already use.
 */
export const VIZ = {
  series1: "#2a78d6", // revenue / single-series bars
  series2: "#eb6834", // profit
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
  inkSecondary: "#52514e",
  good: "#006300",
  critical: "#d03b3b",
} as const;

/** Width of an element, tracked across resizes — SVG charts draw at real pixel size. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** "Nice" axis maximum and tick step for a value range that may dip below zero. */
export function niceScale(min: number, max: number, targetTicks = 4) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const span = hi - lo || 1;
  const rough = span / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const niceLo = Math.floor(lo / step) * step;
  const niceHi = Math.ceil(hi / step) * step || step;
  const ticks: number[] = [];
  for (let t = niceLo; t <= niceHi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { min: niceLo, max: niceHi, ticks };
}

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function fmtMoney(n: number): string {
  return usd2.format(n);
}

/** Compact money for axes and tight labels: $950, $1.2K, $14K. */
export function fmtMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${n < 0 ? "−" : ""}$${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return usd0.format(n).replace("-", "−");
}

export function fmtPct(n: number | null, digits = 1): string {
  return n == null ? "—" : `${(n * 100).toFixed(digits)}%`;
}

export function fmtDays(n: number | null): string {
  if (n == null) return "—";
  const d = Math.round(n);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/** Parse a YYYY-MM-DD key as a local date (not UTC midnight). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtBucket(key: string, granularity: "day" | "week" | "month", long = false): string {
  const d = parseDateKey(key);
  if (granularity === "month") {
    return d.toLocaleDateString("en-US", { month: long ? "long" : "short", year: "numeric" });
  }
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return granularity === "week" && long ? `Week of ${label}` : label;
}
