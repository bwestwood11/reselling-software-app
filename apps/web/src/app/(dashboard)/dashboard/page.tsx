"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";
import { useSession } from "@repo/auth/client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import {
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Boxes,
  Plus,
  Store,
  ChevronRight,
  BarChart3,
  Layers,
} from "lucide-react";
import type { DashboardStats, DashboardTrend, InventoryStatus, TrendPreset } from "@repo/types";

export default function DashboardPage(): import("react").JSX.Element {
  const { data: sessionData } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 60_000, // refresh every minute
  });

  const stats: DashboardStats | undefined = data?.data;
  const firstName = sessionData?.user?.name?.split(" ")[0];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-36 animate-pulse rounded-3xl bg-[#ece8e2]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#ece8e2]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-[#ece8e2]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="h-96 animate-pulse rounded-2xl bg-[#ece8e2]" />
          <div className="h-96 animate-pulse rounded-2xl bg-[#ece8e2]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_18%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_52%),radial-gradient(circle_at_88%_30%,_#f59e0b_0%,_#fbbf24_18%,_transparent_44%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)] lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/30" />
        <div className="pointer-events-none absolute bottom-4 right-8 h-24 w-24 rounded-full bg-orange-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100">
              Control Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {firstName ? `Welcome back, ${firstName}` : "Reselling Dashboard"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-orange-50">
              Track inventory, listings, and revenue from one place.
            </p>
          </div>
          <Link
            href="/inventory/new"
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Inventory
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inventory"
          value={stats?.totalInventory ?? 0}
          caption="In your catalog"
          Icon={Package}
          color="orange"
        />
        <StatCard
          title="Active Listings"
          value={stats?.activeListings ?? 0}
          caption="Currently live"
          Icon={Tag}
          color="amber"
        />
        <StatCard
          title="Sold This Month"
          value={stats?.soldThisMonth ?? 0}
          caption="Since the 1st"
          Icon={TrendingUp}
          color="gold"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          caption="All-time"
          Icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Sales trend */}
      <SalesTrendCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* Listings by marketplace */}
          <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
              <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
                <Boxes className="h-4 w-4 text-orange-700" />
                Listings by Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <MarketplaceBarChart data={stats?.listingsByMarketplace ?? []} />
            </CardContent>
          </Card>

          {/* Inventory pipeline */}
          <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
              <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
                <Layers className="h-4 w-4 text-orange-700" />
                Inventory Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <InventoryPipelineChart data={stats?.inventoryByStatus ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
              <Plus className="h-4 w-4 text-orange-700" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-5">
            <QuickAction
              href="/inventory/new"
              label="Add inventory"
              description="List a new item in your catalog"
              Icon={Package}
            />
            <QuickAction
              href="/listings/new"
              label="Create a listing"
              description="Publish an item to a marketplace"
              Icon={Tag}
            />
            <QuickAction
              href="/marketplaces"
              label="Connect a marketplace"
              description="Link eBay, Poshmark, Mercari and more"
              Icon={Store}
            />
            <QuickAction
              href="/dashboard/sync"
              label="Sync listings"
              description="Refresh status across marketplaces"
              Icon={RefreshCw}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Quick action row ──────────────────────────────────────────────────────────

function QuickAction({
  href,
  label,
  description,
  Icon,
}: {
  href: string;
  label: string;
  description: string;
  Icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-zinc-100 p-3 transition-all hover:border-orange-200 hover:bg-orange-50/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-orange-100 group-hover:text-orange-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <p className="truncate text-xs text-zinc-500">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
    </Link>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  caption,
  Icon,
  color,
}: {
  title: string;
  value: string | number;
  caption: string;
  Icon: React.ElementType;
  color: "orange" | "amber" | "gold";
}) {
  const colorMap = {
    orange: {
      icon: "bg-orange-100 text-orange-700",
      glow: "from-orange-500/20 to-amber-500/15",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700",
      glow: "from-amber-500/20 to-orange-500/12",
    },
    gold: {
      icon: "bg-yellow-100 text-yellow-700",
      glow: "from-yellow-400/22 to-orange-500/14",
    },
  };

  return (
    <Card className="relative overflow-hidden border-zinc-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${colorMap[color].glow}`}
      />
      <CardContent className="relative pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{caption}</p>
          </div>
          <div className={`rounded-xl p-3 ${colorMap[color].icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sales trend (line + area, single sequential hue) ──────────────────────────

/** Rounds up to a "clean" axis max: 1/2/5 × 10^n. */
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function fmtAxisCurrency(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `$${Math.round(v)}`;
}

function fmtShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Formats a bucket key for the x-axis / tooltip — an hour ("3 PM") or a day ("Aug 24"). */
function fmtBarLabel(key: string, granularity: "day" | "hour"): string {
  if (granularity === "hour") {
    const [datePart, hourPart] = key.split("T");
    const d = new Date(`${datePart}T${hourPart}:00:00`);
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  return fmtShortDate(key);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Builds a bar/column path: rounded top corners, square baseline — per the mark spec. */
function barPath(x: number, w: number, yTop: number, yBase: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, Math.max(yBase - yTop, 0)));
  if (yBase - yTop <= 0) return "";
  if (r === 0) {
    return `M${x},${yBase} L${x},${yTop} L${x + w},${yTop} L${x + w},${yBase} Z`;
  }
  return [
    `M${x},${yBase}`,
    `L${x},${yTop + r}`,
    `Q${x},${yTop} ${x + r},${yTop}`,
    `L${x + w - r},${yTop}`,
    `Q${x + w},${yTop} ${x + w},${yTop + r}`,
    `L${x + w},${yBase}`,
    "Z",
  ].join(" ");
}

type TrendMetric = "sales" | "listings";

const RANGE_PRESETS: { value: Exclude<TrendPreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
];

const MAX_CUSTOM_RANGE_DAYS = 90;

function SalesTrendCard() {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 52 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const [metric, setMetric] = useState<TrendMetric>("sales");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // ── Date range ──────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<TrendPreset>("14d");
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const customButtonRef = useRef<HTMLButtonElement>(null);

  function openCustomPopover() {
    if (!draftStart || !draftEnd) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 13);
      setDraftStart(dateKeyLocal(start));
      setDraftEnd(dateKeyLocal(end));
    }
    const rect = customButtonRef.current?.getBoundingClientRect();
    if (rect) setPopoverPos({ top: rect.bottom + 8, left: rect.left });
    setRangeError(null);
    setCustomOpen(true);
  }

  function applyCustomRange() {
    if (!draftStart || !draftEnd) {
      setRangeError("Pick both a start and end date");
      return;
    }
    if (draftStart > draftEnd) {
      setRangeError("Start date must be before end date");
      return;
    }
    const spanDays =
      Math.round((new Date(draftEnd).getTime() - new Date(draftStart).getTime()) / 86_400_000) + 1;
    if (spanDays > MAX_CUSTOM_RANGE_DAYS) {
      setRangeError(`Range can't exceed ${MAX_CUSTOM_RANGE_DAYS} days`);
      return;
    }
    setAppliedCustomRange({ start: draftStart, end: draftEnd });
    setPreset("custom");
    setCustomOpen(false);
    setHoverIndex(null);
  }

  const rangeLabel =
    preset === "today"
      ? "Today"
      : preset === "7d"
        ? "Last 7 days"
        : preset === "14d"
          ? "Last 14 days"
          : preset === "30d"
            ? "Last 30 days"
            : appliedCustomRange
              ? `${fmtShortDate(appliedCustomRange.start)} – ${fmtShortDate(appliedCustomRange.end)}`
              : "Custom range";

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: trendData, isFetching } = useQuery({
    queryKey: ["dashboard-trend", preset, preset === "custom" ? appliedCustomRange : null],
    queryFn: () =>
      dashboardApi.getTrend({
        preset,
        ...(preset === "custom" && appliedCustomRange
          ? { startDate: appliedCustomRange.start, endDate: appliedCustomRange.end }
          : {}),
      }) as Promise<{ data: DashboardTrend }>,
    enabled: preset !== "custom" || !!appliedCustomRange,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const granularity = trendData?.data.granularity ?? "day";
  const points = trendData?.data.points ?? [];

  const { totalRevenue, totalUnits, totalListings, maxValue, bars, slotWidth, barWidth, ticks, baseline } =
    useMemo(() => {
      const n = Math.max(points.length, 1);
      const valueOf = (d: DashboardTrend["points"][number]) =>
        metric === "sales" ? d.revenue : d.listingsCreated;
      const maxVal = niceMax(Math.max(...points.map(valueOf), 0));
      const slot = innerW / n;
      const bw = Math.min(24, slot * 0.6);
      const y = (v: number) => padding.top + innerH - (innerH * v) / maxVal;
      const base = y(0);

      const barList = points.map((d, i) => {
        const slotX = padding.left + slot * i;
        return {
          ...d,
          value: valueOf(d),
          slotX,
          slotCenter: slotX + slot / 2,
          barX: slotX + (slot - bw) / 2,
          barTop: y(valueOf(d)),
        };
      });

      const tickCount = 4;
      const tickVals = Array.from({ length: tickCount + 1 }, (_, i) => (maxVal * i) / tickCount);

      return {
        totalRevenue: points.reduce((s, d) => s + d.revenue, 0),
        totalUnits: points.reduce((s, d) => s + d.unitsSold, 0),
        totalListings: points.reduce((s, d) => s + d.listingsCreated, 0),
        maxValue: maxVal,
        bars: barList,
        slotWidth: slot,
        barWidth: bw,
        ticks: tickVals,
        baseline: base,
      };
    }, [points, metric, innerW, innerH, padding.left, padding.top]);

  const hovered = hoverIndex !== null ? bars[hoverIndex] : null;
  const isSales = metric === "sales";
  const isEmpty = bars.length > 0 && bars.every((b) => b.value === 0);
  const avgPerBucket = bars.length > 0 ? totalListings / bars.length : 0;
  const labelStep = Math.max(1, Math.ceil(bars.length / 6));

  return (
    <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
      <CardHeader className="space-y-3 border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
            <BarChart3 className="h-4 w-4 text-orange-700" />
            {isSales ? "Sales Trend" : "Listings Trend"}
            <span className="text-xs font-normal text-zinc-500">{rangeLabel}</span>
          </CardTitle>

          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            {/* Metric toggle */}
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
              {(
                [
                  { value: "sales" as const, label: "Sales" },
                  { value: "listings" as const, label: "Listings" },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setMetric(opt.value);
                    setHoverIndex(null);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    metric === opt.value
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Summary stats for the active metric */}
            <div className="flex items-center gap-4 text-sm">
              {isSales ? (
                <>
                  <div>
                    <span className="font-semibold text-zinc-900">{formatCurrency(totalRevenue)}</span>
                    <span className="ml-1 text-xs text-zinc-500">revenue</span>
                  </div>
                  <div className="h-4 w-px bg-orange-200" />
                  <div>
                    <span className="font-semibold text-zinc-900">{totalUnits}</span>
                    <span className="ml-1 text-xs text-zinc-500">sold</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold text-zinc-900">{totalListings}</span>
                    <span className="ml-1 text-xs text-zinc-500">listed</span>
                  </div>
                  <div className="h-4 w-px bg-orange-200" />
                  <div>
                    <span className="font-semibold text-zinc-900">{avgPerBucket.toFixed(1)}</span>
                    <span className="ml-1 text-xs text-zinc-500">
                      avg/{granularity === "hour" ? "hr" : "day"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date range presets */}
        <div className="relative flex flex-wrap items-center gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPreset(p.value);
                setHoverIndex(null);
                setCustomOpen(false);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                preset === p.value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            ref={customButtonRef}
            onClick={() => (customOpen ? setCustomOpen(false) : openCustomPopover())}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              preset === "custom"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {preset === "custom" && appliedCustomRange
              ? `${fmtShortDate(appliedCustomRange.start)} – ${fmtShortDate(appliedCustomRange.end)}`
              : "Custom"}
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {/* Fixed-aspect box: identical height across loading, empty, and every range/granularity —
            so switching presets or metrics never shifts the rest of the page. */}
        <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
          {!trendData ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-zinc-100" />
          ) : isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <BarChart3 className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                {isSales ? `No sales ${rangeLabel.toLowerCase()}` : `No listings published ${rangeLabel.toLowerCase()}`}
              </p>
            </div>
          ) : (
            <div className={`h-full transition-opacity ${isFetching ? "opacity-50" : ""}`}>
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="block h-full w-full"
                role="img"
                aria-label={
                  isSales
                    ? `Revenue for ${rangeLabel.toLowerCase()}, totaling ${formatCurrency(totalRevenue)}`
                    : `Listings published for ${rangeLabel.toLowerCase()}, totaling ${totalListings}`
                }
              >
                {/* Gridlines + y-axis labels */}
                {ticks.map((t, i) => {
                  const ty = padding.top + innerH - (innerH * t) / (maxValue || 1);
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={ty}
                        y2={ty}
                        stroke="#e1e0d9"
                        strokeWidth={1}
                      />
                      <text x={padding.left - 8} y={ty + 3} textAnchor="end" fontSize={10} fill="#898781">
                        {isSales ? fmtAxisCurrency(t) : Math.round(t).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Bars — one per bucket, rounded top / square baseline; each carries its own hit target */}
                {bars.map((b, i) => (
                  <g key={b.date}>
                    <path
                      d={barPath(b.barX, barWidth, b.barTop, baseline, 4)}
                      fill={hoverIndex === i ? "#ea580c" : "#f97316"}
                      className="transition-colors"
                    />
                    {/* Hit target: full column slot, taller than the bar itself */}
                    <rect
                      x={b.slotX}
                      y={padding.top}
                      width={slotWidth}
                      height={innerH}
                      fill="transparent"
                      onPointerEnter={() => setHoverIndex(i)}
                      onPointerLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
                    />
                  </g>
                ))}

                {/* Baseline (x-axis) */}
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={baseline}
                  y2={baseline}
                  stroke="#c3c2b7"
                  strokeWidth={1}
                />

                {/* X labels — thinned to keep roughly 6 on screen, whatever the bucket count */}
                {bars.map((b, i) =>
                  i % labelStep === 0 || i === bars.length - 1 ? (
                    <text
                      key={b.date}
                      x={b.slotCenter}
                      y={height - 8}
                      textAnchor="middle"
                      fontSize={10}
                      fill={hoverIndex === i ? "#0b0b0b" : "#898781"}
                      fontWeight={hoverIndex === i ? 600 : 400}
                    >
                      {fmtBarLabel(b.date, granularity)}
                    </text>
                  ) : null
                )}
              </svg>

              {hovered && (
                <div
                  className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md"
                  style={{ left: `${(hovered.slotCenter / width) * 100}%` }}
                >
                  <p className="font-medium text-zinc-500">{fmtBarLabel(hovered.date, granularity)}</p>
                  {isSales ? (
                    <>
                      <p className="mt-0.5 font-semibold text-zinc-900">{formatCurrency(hovered.revenue)}</p>
                      <p className="text-zinc-500">
                        {hovered.unitsSold} {hovered.unitsSold === 1 ? "item" : "items"} sold
                      </p>
                    </>
                  ) : (
                    <p className="mt-0.5 font-semibold text-zinc-900">
                      {hovered.listingsCreated} {hovered.listingsCreated === 1 ? "listing" : "listings"}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Custom range popover — fixed-positioned so it overlays without shifting any layout,
          and escapes the card's own clipping/rounded-corner boundary. */}
      {customOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCustomOpen(false)} />
          <div
            className="fixed z-50 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg"
            style={{ top: popoverPos?.top ?? 0, left: popoverPos?.left ?? 0 }}
          >
            <p className="mb-3 text-xs font-semibold text-zinc-700">Custom date range</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Start date</label>
                <input
                  type="date"
                  value={draftStart}
                  max={draftEnd || todayStr()}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">End date</label>
                <input
                  type="date"
                  value={draftEnd}
                  min={draftStart || undefined}
                  max={todayStr()}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              {rangeError && <p className="text-xs text-red-600">{rangeError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setCustomOpen(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCustomRange}
                  className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Listings by marketplace (horizontal bars, shared scale) ──────────────────

function MarketplaceBarChart({ data }: { data: DashboardStats["listingsByMarketplace"] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Store className="h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">No listings yet</p>
        <Link href="/listings/new" className="text-xs font-medium text-orange-600 hover:text-orange-700">
          Create your first listing
        </Link>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {sorted.map((mp) => {
        const pct = Math.max(4, Math.round((mp.count / maxCount) * 100));
        return (
          <div key={mp.marketplace}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900">
                {getMarketplaceLabel(mp.marketplace as any)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{mp.active} active</span>
                <Badge variant="secondary">{mp.count} total</Badge>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inventory pipeline (stacked bar, part-to-whole, categorical) ─────────────

const STATUS_ORDER: InventoryStatus[] = ["DRAFT", "ACTIVE", "SOLD", "ARCHIVED"];
const STATUS_LABEL: Record<InventoryStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Listed",
  SOLD: "Sold",
  ARCHIVED: "Archived",
};
// Fixed categorical order (slots 1-4 of the validated default palette) — never reordered per status.
const STATUS_COLOR: Record<InventoryStatus, string> = {
  DRAFT: "#2a78d6", // blue
  ACTIVE: "#eb6834", // orange
  SOLD: "#1baf7a", // aqua
  ARCHIVED: "#eda100", // yellow
};

function InventoryPipelineChart({ data }: { data: DashboardStats["inventoryByStatus"] }) {
  const countByStatus: Partial<Record<InventoryStatus, number>> = {};
  for (const row of data) countByStatus[row.status] = row.count;
  const total = STATUS_ORDER.reduce((s, status) => s + (countByStatus[status] ?? 0), 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Layers className="h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">No inventory yet</p>
        <Link href="/inventory/new" className="text-xs font-medium text-orange-600 hover:text-orange-700">
          Add your first item
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Stacked bar — 2px surface gaps between segments */}
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-lg bg-zinc-100">
        {STATUS_ORDER.map((status) => {
          const count = countByStatus[status] ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          const showLabel = pct >= 12;
          return (
            <div
              key={status}
              title={`${STATUS_LABEL[status]}: ${count} (${Math.round(pct)}%)`}
              className="flex h-full items-center justify-center first:rounded-l-lg last:rounded-r-lg"
              style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[status] }}
            >
              {showLabel && (
                <span className="px-1 text-[11px] font-semibold text-white">{count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            <span className="truncate text-xs text-zinc-600">
              {STATUS_LABEL[status]}{" "}
              <span className="font-semibold text-zinc-900">{countByStatus[status] ?? 0}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
