import type { PrismaClient } from "@repo/db";
import type {
  AnalyticsBreakdownRow,
  AnalyticsInventorySnapshot,
  AnalyticsMarketplaceRow,
  AnalyticsReport,
  AnalyticsSeriesPoint,
  AnalyticsTotals,
  MarketplaceType,
} from "@repo/types";
import { MARKETPLACE_LABELS } from "@repo/utils";

const DAY_MS = 86_400_000;
/** Longest range a report may span — about five years. */
export const MAX_ANALYTICS_RANGE_DAYS = 1830;
const TOP_N = 8;

/** YYYY-MM-DD in the server's local time zone (matches the dashboard's bucketing). */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Start of the bucket containing `d`: the day itself, its Monday, or the 1st of its month. */
function bucketStart(d: Date, granularity: AnalyticsReport["range"]["granularity"]): Date {
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (granularity === "week") b.setDate(b.getDate() - ((b.getDay() + 6) % 7));
  if (granularity === "month") b.setDate(1);
  return b;
}

function nextBucket(d: Date, granularity: AnalyticsReport["range"]["granularity"]): Date {
  if (granularity === "day") return addDays(d, 1);
  if (granularity === "week") return addDays(d, 7);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

const MARKETPLACE_KEYS = new Set(Object.keys(MARKETPLACE_LABELS));

/**
 * Where a sale happened. A sale through a tracked listing knows its marketplace; a manual sale
 * only has the free-text "sold via" the seller typed (which the server also fills with the
 * marketplace enum when it records a listing sale).
 */
function saleChannel(item: {
  soldVia: string | null;
  listings: Array<{ marketplace: string; status: string }>;
}): { key: string; label: string } {
  const soldListing = item.listings.find((l) => l.status === "SOLD");
  if (soldListing) {
    return {
      key: soldListing.marketplace,
      label: MARKETPLACE_LABELS[soldListing.marketplace as MarketplaceType] ?? soldListing.marketplace,
    };
  }
  const via = item.soldVia?.trim();
  if (!via) return { key: "UNRECORDED", label: "Not recorded" };
  const upper = via.toUpperCase().replace(/[\s-]+/g, "_");
  if (MARKETPLACE_KEYS.has(upper)) {
    return { key: upper, label: MARKETPLACE_LABELS[upper as MarketplaceType] };
  }
  const byLabel = Object.entries(MARKETPLACE_LABELS).find(
    ([, label]) => label.toLowerCase() === via.toLowerCase()
  );
  if (byLabel) return { key: byLabel[0], label: byLabel[1] };
  return { key: `channel:${via.toLowerCase()}`, label: via };
}

/** "Clothing, Shoes & Accessories:Men:Men's Clothing:Shirts:Polos" → "Polos". */
function categoryLeaf(category: string | null): string | null {
  const leaf = category?.split(":").pop()?.trim();
  return leaf || null;
}

interface Sale {
  soldAt: Date;
  revenue: number;
  cost: number;
  units: number;
  daysToSell: number;
  channel: { key: string; label: string };
  brand: string | null;
  category: string | null;
}

function emptyTotals(): AnalyticsTotals {
  return {
    revenue: 0,
    cost: 0,
    profit: 0,
    unitsSold: 0,
    unitsListed: 0,
    sellThroughRate: null,
    avgSalePrice: null,
    avgProfit: null,
    profitMargin: null,
    avgDaysToSell: null,
  };
}

function totalsFor(sales: Sale[], listedCohort: Array<{ sold: boolean }>): AnalyticsTotals {
  const t = emptyTotals();
  let days = 0;
  for (const s of sales) {
    t.revenue += s.revenue;
    t.cost += s.cost;
    t.unitsSold += s.units;
    days += s.daysToSell;
  }
  t.profit = t.revenue - t.cost;
  t.unitsListed = listedCohort.length;
  if (listedCohort.length > 0) {
    t.sellThroughRate = listedCohort.filter((c) => c.sold).length / listedCohort.length;
  }
  if (sales.length > 0) {
    t.avgSalePrice = t.revenue / sales.length;
    t.avgProfit = t.profit / sales.length;
    t.avgDaysToSell = days / sales.length;
  }
  if (t.revenue > 0) t.profitMargin = t.profit / t.revenue;
  return t;
}

function breakdown(
  sales: Sale[],
  pick: (s: Sale) => { key: string; label: string } | null
): Map<string, { row: AnalyticsBreakdownRow; cost: number; days: number; count: number }> {
  const map = new Map<string, { row: AnalyticsBreakdownRow; cost: number; days: number; count: number }>();
  for (const s of sales) {
    const id = pick(s);
    if (!id) continue;
    let entry = map.get(id.key);
    if (!entry) {
      entry = { row: { ...id, unitsSold: 0, revenue: 0, profit: 0 }, cost: 0, days: 0, count: 0 };
      map.set(id.key, entry);
    }
    entry.row.unitsSold += s.units;
    entry.row.revenue += s.revenue;
    entry.row.profit += s.revenue - s.cost;
    entry.cost += s.cost;
    entry.days += s.daysToSell;
    entry.count += 1;
  }
  return map;
}

const byUnitsThenRevenue = (a: AnalyticsBreakdownRow, b: AnalyticsBreakdownRow) =>
  b.unitsSold - a.unitsSold || b.revenue - a.revenue;

export class AnalyticsService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Sales analytics for [start, end] (inclusive local dates) compared against the equally long
   * period immediately before it.
   */
  async getReport(userId: string, start: Date, end: Date): Promise<AnalyticsReport> {
    const endExclusive = addDays(end, 1);
    const spanDays = Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS);
    const previousStart = addDays(start, -spanDays);
    const granularity: AnalyticsReport["range"]["granularity"] =
      spanDays <= 92 ? "day" : spanDays <= 731 ? "week" : "month";

    const [soldItems, firstListings, unsoldItems] = await Promise.all([
      // The inventory item is the canonical sold record — a manual sale has no Listing at all.
      this.db.inventoryItem.findMany({
        where: { userId, status: "SOLD", soldAt: { gte: previousStart, lt: endExclusive } },
        select: {
          soldAt: true,
          soldPrice: true,
          soldVia: true,
          costPrice: true,
          quantity: true,
          brand: true,
          category: true,
          createdAt: true,
          id: true,
          listings: { select: { marketplace: true, status: true } },
        },
      }),
      // When each item first went live anywhere — "units listed" counts an item once, not once
      // per marketplace it was cross-listed to.
      this.db.listing.groupBy({
        by: ["inventoryItemId"],
        where: { userId, listedAt: { not: null } },
        _min: { listedAt: true },
      }),
      this.db.inventoryItem.findMany({
        where: { userId, status: { in: ["DRAFT", "ACTIVE"] } },
        select: {
          costPrice: true,
          targetPrice: true,
          quantity: true,
          createdAt: true,
          listings: { where: { status: "ACTIVE" }, select: { price: true } },
        },
      }),
    ]);

    const firstListedAt = new Map<string, Date>();
    for (const row of firstListings) {
      if (row._min.listedAt) firstListedAt.set(row.inventoryItemId, row._min.listedAt);
    }

    const sales: Sale[] = soldItems
      .filter((i): i is typeof i & { soldAt: Date } => i.soldAt != null)
      .map((i) => {
        const listedAt = firstListedAt.get(i.id) ?? i.createdAt;
        const units = Math.max(1, i.quantity ?? 1);
        return {
          soldAt: i.soldAt,
          revenue: Number(i.soldPrice ?? 0),
          cost: Number(i.costPrice ?? 0) * units,
          units,
          daysToSell: Math.max(0, (i.soldAt.getTime() - listedAt.getTime()) / DAY_MS),
          channel: saleChannel(i),
          brand: i.brand?.trim() || null,
          category: categoryLeaf(i.category),
        };
      });

    const inCurrent = (d: Date) => d >= start && d < endExclusive;
    const inPrevious = (d: Date) => d >= previousStart && d < start;
    const currentSales = sales.filter((s) => inCurrent(s.soldAt));
    const previousSales = sales.filter((s) => inPrevious(s.soldAt));

    // Sell-through cohort: items first listed in the period, and whether each has sold since.
    const cohortIds = [...firstListedAt.entries()]
      .filter(([, at]) => at >= previousStart && at < endExclusive)
      .map(([id]) => id);
    const cohortStatus = cohortIds.length
      ? await this.db.inventoryItem.findMany({
          where: { id: { in: cohortIds }, userId },
          select: { id: true, status: true },
        })
      : [];
    const soldById = new Map(cohortStatus.map((c) => [c.id, c.status === "SOLD"]));
    const cohort = (inPeriod: (d: Date) => boolean) =>
      cohortIds
        .filter((id) => inPeriod(firstListedAt.get(id)!) && soldById.has(id))
        .map((id) => ({ sold: soldById.get(id)!, listedAt: firstListedAt.get(id)! }));
    const currentCohort = cohort(inCurrent);

    // Time series — every bucket present, so gaps read as zero rather than being skipped.
    const buckets = new Map<string, AnalyticsSeriesPoint>();
    for (let d = bucketStart(start, granularity); d < endExclusive; d = nextBucket(d, granularity)) {
      const key = dateKey(d);
      buckets.set(key, { date: key, revenue: 0, profit: 0, unitsSold: 0, unitsListed: 0 });
    }
    for (const s of currentSales) {
      const b = buckets.get(dateKey(bucketStart(s.soldAt, granularity)));
      if (!b) continue;
      b.revenue += s.revenue;
      b.profit += s.revenue - s.cost;
      b.unitsSold += s.units;
    }
    for (const c of currentCohort) {
      const b = buckets.get(dateKey(bucketStart(c.listedAt, granularity)));
      if (b) b.unitsListed += 1;
    }

    const byMarketplace: AnalyticsMarketplaceRow[] = [...breakdown(currentSales, (s) => s.channel).values()]
      .map(({ row, cost, days, count }) => ({
        ...row,
        cost,
        avgSalePrice: count ? row.revenue / count : null,
        avgProfit: count ? row.profit / count : null,
        avgDaysToSell: count ? days / count : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const top = (pick: (s: Sale) => string | null) =>
      [...breakdown(currentSales, (s) => {
        const name = pick(s);
        return name ? { key: name.toLowerCase(), label: name } : null;
      }).values()]
        .map((e) => e.row)
        .sort(byUnitsThenRevenue)
        .slice(0, TOP_N);

    const now = Date.now();
    const inventory: AnalyticsInventorySnapshot = {
      unsoldItems: unsoldItems.length,
      listedItems: unsoldItems.filter((i) => i.listings.length > 0).length,
      unsoldCost: unsoldItems.reduce(
        (sum, i) => sum + Number(i.costPrice ?? 0) * Math.max(1, i.quantity ?? 1),
        0
      ),
      unsoldListValue: unsoldItems.reduce((sum, i) => {
        // An item cross-listed to several marketplaces is one item — take its highest asking price.
        const listed = i.listings.length ? Math.max(...i.listings.map((l) => Number(l.price))) : null;
        return sum + (listed ?? Number(i.targetPrice ?? 0));
      }, 0),
      avgAgeDays: unsoldItems.length
        ? unsoldItems.reduce((sum, i) => sum + (now - i.createdAt.getTime()) / DAY_MS, 0) /
          unsoldItems.length
        : null,
    };

    return {
      range: {
        start: dateKey(start),
        end: dateKey(end),
        previousStart: dateKey(previousStart),
        previousEnd: dateKey(addDays(start, -1)),
        granularity,
      },
      current: totalsFor(currentSales, currentCohort),
      previous: totalsFor(previousSales, cohort(inPrevious)),
      series: [...buckets.values()],
      byMarketplace,
      topBrands: top((s) => s.brand),
      topCategories: top((s) => s.category),
      inventory,
    };
  }
}
