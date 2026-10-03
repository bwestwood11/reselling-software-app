"use client";

import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AnalyticsReport } from "@repo/types";
import { analyticsApi } from "@/lib/api";
import { AnalyticsReportView, LoadingSkeleton } from "./_components/AnalyticsReportView";
import { parseDateKey, toDateKey } from "./_components/chart-utils";

type Preset = "7d" | "30d" | "90d" | "mtd" | "ytd" | "12m" | "custom";

const PRESETS: Array<{ value: Exclude<Preset, "custom">; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "12 months" },
];

/** Inclusive local-date range for a preset, ending today. */
function presetRange(preset: Exclude<Preset, "custom">): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "90d") start.setDate(start.getDate() - 89);
  if (preset === "mtd") start.setDate(1);
  if (preset === "ytd") start.setMonth(0, 1);
  if (preset === "12m") {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
  }
  return { start: toDateKey(start), end: toDateKey(today) };
}

const fmtRangeDate = (key: string) =>
  parseDateKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AnalyticsPage(): import("react").JSX.Element {
  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState(() => presetRange("30d"));
  const [draft, setDraft] = useState(custom);

  const range = useMemo(() => (preset === "custom" ? custom : presetRange(preset)), [preset, custom]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["analytics", range.start, range.end],
    queryFn: () => analyticsApi.getReport(range),
    placeholderData: keepPreviousData,
  });
  const report: AnalyticsReport | undefined = data?.data;

  const draftValid = draft.start && draft.end && draft.start <= draft.end;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {report
              ? `${fmtRangeDate(report.range.start)} – ${fmtRangeDate(report.range.end)}, compared with ${fmtRangeDate(report.range.previousStart)} – ${fmtRangeDate(report.range.previousEnd)}`
              : "Sales, profit and inventory performance"}
          </p>
        </div>
      </div>

      {/* One filter row scopes every chart below. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              aria-pressed={preset === p.value}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p.value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form
          className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-white p-1 pl-2 shadow-sm ${
            preset === "custom" ? "border-zinc-900" : "border-zinc-200"
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            if (!draftValid) return;
            setCustom(draft);
            setPreset("custom");
          }}
        >
          <label className="sr-only" htmlFor="analytics-start">Start date</label>
          <input
            id="analytics-start"
            type="date"
            value={draft.start}
            max={draft.end || undefined}
            onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
            className="rounded-md px-1 py-1 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-orange-300"
          />
          <span className="text-xs text-zinc-400">–</span>
          <label className="sr-only" htmlFor="analytics-end">End date</label>
          <input
            id="analytics-end"
            type="date"
            value={draft.end}
            min={draft.start || undefined}
            onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
            className="rounded-md px-1 py-1 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            type="submit"
            disabled={!draftValid}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Apply
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Couldn&apos;t load analytics: {(error as Error).message}
        </div>
      ) : isLoading || !report ? (
        <LoadingSkeleton />
      ) : (
        <AnalyticsReportView report={report} dimmed={isFetching} />
      )}
    </div>
  );
}
