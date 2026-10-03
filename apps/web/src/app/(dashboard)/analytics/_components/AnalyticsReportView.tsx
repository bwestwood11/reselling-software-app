"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import type { AnalyticsReport, AnalyticsTotals } from "@repo/types";
import { StatTile } from "./StatTile";
import { RevenueProfitChart, SeriesLegend } from "./RevenueProfitChart";
import { EmptyNote, MarketplaceBars, RankedBars } from "./BarLists";
import { fmtDays, fmtMoney, fmtPct } from "./chart-utils";

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Everything below the filter row — pure presentation of one report. */
export function AnalyticsReportView({ report, dimmed }: { report: AnalyticsReport; dimmed?: boolean }) {
  const [chartView, setChartView] = useState<"chart" | "table">("chart");
  return (
    // Hold the previous render, dimmed, while a new range loads — no skeleton flash.
    <div className={`space-y-6 transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      <HeadlineTiles report={report} />
      <SecondaryTiles cur={report.current} prev={report.previous} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section
          title="Revenue vs. profit"
          action={
            <div className="flex items-center gap-3">
              {chartView === "chart" && <SeriesLegend />}
              <button
                type="button"
                onClick={() => setChartView((v) => (v === "chart" ? "table" : "chart"))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {chartView === "chart" ? <Table2 className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                {chartView === "chart" ? "Table" : "Chart"}
              </button>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
            <Headline label="Total revenue" value={fmtMoney(report.current.revenue)} />
            <Headline label="Total profit" value={fmtMoney(report.current.profit)} />
            <Headline label="Cost of goods" value={fmtMoney(report.current.cost)} />
          </div>
          {report.current.revenue === 0 && report.current.unitsListed === 0 && chartView === "chart" ? (
            <EmptyNote text="No sales or new listings in this period." />
          ) : (
            <RevenueProfitChart points={report.series} granularity={report.range.granularity} view={chartView} />
          )}
        </Section>

        <Section
          title="Sales by marketplace"
          action={<SeriesLegend />}
        >
          <MarketplaceBars rows={report.byMarketplace} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Top selling brands">
          <RankedBars rows={report.topBrands} empty="No brand data for sales in this period." />
        </Section>
        <Section title="Top selling categories">
          <RankedBars rows={report.topCategories} empty="No category data for sales in this period." />
        </Section>
      </div>

      <Section title="Averages by marketplace">
        <MarketplaceTable report={report} />
      </Section>

      <Section title="Current inventory">
        <InventoryStrip report={report} />
      </Section>

      <p className="text-xs text-zinc-400">
        Profit is sale price minus the item&apos;s cost. Marketplace fees and shipping aren&apos;t
        recorded on sales yet, so they aren&apos;t deducted. Items with no cost entered count as $0 cost.
      </p>
    </div>
  );
}

function Headline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

function HeadlineTiles({ report }: { report: AnalyticsReport }) {
  const { current: cur, previous: prev, series } = report;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Revenue"
        value={fmtMoney(cur.revenue)}
        current={cur.revenue}
        previous={prev.revenue}
        previousLabel={fmtMoney(prev.revenue)}
        spark={series.map((p) => p.revenue)}
      />
      <StatTile
        label="Profit"
        value={fmtMoney(cur.profit)}
        current={cur.profit}
        previous={prev.profit}
        previousLabel={fmtMoney(prev.profit)}
        spark={series.map((p) => p.profit)}
        hint="Sale price minus item cost"
      />
      <StatTile
        label="Units sold"
        value={cur.unitsSold.toLocaleString()}
        current={cur.unitsSold}
        previous={prev.unitsSold}
        previousLabel={prev.unitsSold.toLocaleString()}
        spark={series.map((p) => p.unitsSold)}
      />
      <StatTile
        label="Sell-through rate"
        value={fmtPct(cur.sellThroughRate)}
        current={cur.sellThroughRate}
        previous={prev.sellThroughRate}
        previousLabel={fmtPct(prev.sellThroughRate)}
        pointChange
        hint="Of the items first listed in this period, the share that has sold"
      />
    </div>
  );
}

function SecondaryTiles({ cur, prev }: { cur: AnalyticsTotals; prev: AnalyticsTotals }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <StatTile
        label="Units listed"
        value={cur.unitsListed.toLocaleString()}
        current={cur.unitsListed}
        previous={prev.unitsListed}
        previousLabel={prev.unitsListed.toLocaleString()}
        hint="Items that went live for the first time — cross-listings count once"
      />
      <StatTile
        label="Avg sale price"
        value={cur.avgSalePrice == null ? "—" : fmtMoney(cur.avgSalePrice)}
        current={cur.avgSalePrice}
        previous={prev.avgSalePrice}
        previousLabel={prev.avgSalePrice == null ? "—" : fmtMoney(prev.avgSalePrice)}
      />
      <StatTile
        label="Avg profit"
        value={cur.avgProfit == null ? "—" : fmtMoney(cur.avgProfit)}
        current={cur.avgProfit}
        previous={prev.avgProfit}
        previousLabel={prev.avgProfit == null ? "—" : fmtMoney(prev.avgProfit)}
      />
      <StatTile
        label="Profit margin"
        value={fmtPct(cur.profitMargin)}
        current={cur.profitMargin}
        previous={prev.profitMargin}
        previousLabel={fmtPct(prev.profitMargin)}
        pointChange
      />
      <StatTile
        label="Avg days to sell"
        value={fmtDays(cur.avgDaysToSell)}
        current={cur.avgDaysToSell}
        previous={prev.avgDaysToSell}
        previousLabel={fmtDays(prev.avgDaysToSell)}
        lowerIsBetter
        hint="From first listing to sale"
      />
    </div>
  );
}

function MarketplaceTable({ report }: { report: AnalyticsReport }) {
  const rows = report.byMarketplace;
  if (rows.length === 0) return <EmptyNote text="No sales in this period." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th className="py-2 text-left font-medium">Marketplace</th>
            <th className="py-2 text-right font-medium">Sold</th>
            <th className="py-2 text-right font-medium">Revenue</th>
            <th className="py-2 text-right font-medium">Profit</th>
            <th className="py-2 text-right font-medium">Avg sale price</th>
            <th className="py-2 text-right font-medium">Avg profit</th>
            <th className="py-2 text-right font-medium">Avg days to sell</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-zinc-100 last:border-0">
              <td className="py-2 font-medium text-zinc-800">{r.label}</td>
              <td className="py-2 text-right text-zinc-700">{r.unitsSold}</td>
              <td className="py-2 text-right text-zinc-900">{fmtMoney(r.revenue)}</td>
              <td className="py-2 text-right text-zinc-900">{fmtMoney(r.profit)}</td>
              <td className="py-2 text-right text-zinc-700">{r.avgSalePrice == null ? "—" : fmtMoney(r.avgSalePrice)}</td>
              <td className="py-2 text-right text-zinc-700">{r.avgProfit == null ? "—" : fmtMoney(r.avgProfit)}</td>
              <td className="py-2 text-right text-zinc-700">{fmtDays(r.avgDaysToSell)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryStrip({ report }: { report: AnalyticsReport }) {
  const inv = report.inventory;
  const items: Array<[string, string, string]> = [
    ["Unsold items", inv.unsoldItems.toLocaleString(), `${inv.listedItems.toLocaleString()} listed right now`],
    ["Inventory cost", fmtMoney(inv.unsoldCost), "What you paid for unsold items"],
    ["Asking value", fmtMoney(inv.unsoldListValue), "Unsold items at their list prices"],
    ["Avg item age", fmtDays(inv.avgAgeDays), "Since unsold items were added"],
  ];
  return (
    <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-zinc-200">
      {items.map(([label, value, caption]) => (
        <div key={label} className="sm:px-5 sm:first:pl-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{caption}</p>
        </div>
      ))}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#ece8e2]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-[#ece8e2]" />
        <div className="h-96 animate-pulse rounded-2xl bg-[#ece8e2]" />
      </div>
    </div>
  );
}
