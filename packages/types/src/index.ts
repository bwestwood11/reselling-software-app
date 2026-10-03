export * from "./mercari-sizes";
export * from "./scanner";

// ─── Marketplace Types ────────────────────────────────────────────────────────

export type MarketplaceType =
  | "EBAY"
  | "FACEBOOK_MARKETPLACE"
  | "DEPOP"
  | "MERCARI"
  | "POSHMARK"
  | "ETSY"
  | "WHATNOT"
  | "GRAILED";

export type InventoryStatus = "DRAFT" | "ACTIVE" | "SOLD" | "ARCHIVED";

export type Condition =
  | "NEW_WITH_TAGS"
  | "NEW_WITHOUT_TAGS"
  | "VERY_GOOD"
  | "GOOD"
  | "SATISFACTORY";

export type ListingStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "SOLD"
  | "ENDED"
  | "FAILED";

export type SyncEventType =
  | "PUBLISH"
  | "UPDATE"
  | "DELIST"
  | "SOLD"
  | "RELIST"
  | "PRICE_UPDATE"
  | "STATUS_CHECK"
  | "ERROR";

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Inventory Types ──────────────────────────────────────────────────────────

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}



export interface SourceInfo {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  children?: SourceInfo[];
}

export interface SourceStats {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  children: SourceStats[];
}

export interface CreateInventoryItemInput {
  title: string;
  description?: string;
  sku?: string;
  condition: Condition;
  quantity: number;
  costPrice?: number;
  targetPrice?: number;
  brand?: string;
  category?: string;
  tags?: string[];
  weight?: number;
  dimensions?: Dimensions;
  notes?: string;
  attributes?: Array<{ name: string; value: string }>;
  sourceId?: string;
}

export interface UpdateInventoryItemInput
  extends Partial<CreateInventoryItemInput> {
  status?: InventoryStatus;
}

// ─── Listing Types ────────────────────────────────────────────────────────────

export interface CreateListingInput {
  inventoryItemId: string;
  marketplaceConnectionId: string;
  marketplace: MarketplaceType;
  price: number;
  title: string;
  description?: string;
  marketplaceData?: Record<string, unknown>;
}

export interface UpdateListingInput {
  price?: number;
  title?: string;
  description?: string;
  marketplaceData?: Record<string, unknown>;
}

// ─── Crosslist Types ──────────────────────────────────────────────────────────

export interface CrosslistMarketplaceInput {
  connectionId: string;
  marketplaceData?: Record<string, unknown>;
}

export interface CrosslistInput {
  inventoryItemId: string;
  price: number;
  title: string;
  description?: string;
  publishImmediately: boolean;
  marketplaces: CrosslistMarketplaceInput[];
}

export interface CrosslistResult {
  marketplace: MarketplaceType | string;
  listingId?: string;
  status: "DRAFT" | "ACTIVE" | "NEEDS_WEBVIEW" | "error";
  error?: string;
  /**
   * Set for NEEDS_WEBVIEW results (Mercari, Poshmark) — poll GET /api/mercari/jobs/:jobId or
   * GET /api/poshmark/jobs/:jobId (per `marketplace`) for the real outcome.
   */
  jobId?: string;
  /** Set once a NEEDS_WEBVIEW result resolves to ACTIVE — link to the live marketplace listing. */
  externalUrl?: string;
}

// ─── Marketplace Connection Types ─────────────────────────────────────────────

export interface MarketplaceOAuthCallbackInput {
  code: string;
  state: string;
  marketplace: MarketplaceType;
}

// ─── Dashboard Stats Types ────────────────────────────────────────────────────

export interface DashboardStats {
  totalInventory: number;
  activeListings: number;
  soldThisMonth: number;
  totalRevenue: number;
  /** Cost of goods sold (sum of costPrice × quantity across all-time SOLD items). */
  totalCost: number;
  /** totalRevenue − totalCost, all-time, across all SOLD items. */
  totalProfit: number;
  recentSyncEvents: SyncEventSummary[];
  listingsByMarketplace: MarketplaceCount[];
  /** Inventory item counts grouped by status — a part-to-whole breakdown of the catalog. */
  inventoryByStatus: InventoryStatusCount[];
}

/** Date-range presets for `GET /api/dashboard/trend`. */
export type TrendPreset = "today" | "7d" | "14d" | "30d" | "custom";

export interface SalesTrendPoint {
  /** ISO date (YYYY-MM-DD) for day granularity, or ISO hour (YYYY-MM-DDTHH) for hour granularity. */
  date: string;
  revenue: number;
  unitsSold: number;
  /** Listings published (listedAt) in this bucket, across all marketplaces. */
  listingsCreated: number;
}

export interface DashboardTrend {
  /** "hour" only for the "today" preset — every other preset buckets by day. */
  granularity: "hour" | "day";
  points: SalesTrendPoint[];
}

// ─── Accountability ───────────────────────────────────────────────────────────

/** MANUAL tasks are checked/counted by hand; the rest count real activity on the account. */
export type AccountabilityMetric = "MANUAL" | "ITEMS_LISTED" | "ITEMS_ADDED" | "ITEMS_SOLD";
export type AccountabilitySchedule = "DAILY" | "WEEKDAYS" | "ONCE";
/** DAILY goals reset each day; a WEEKLY goal is one target per Monday–Sunday week. */
export type AccountabilityPeriod = "DAILY" | "WEEKLY";

/** A weekly goal's Monday–Sunday breakdown. */
export interface AccountabilityWeekProgress {
  start: string;
  end: string;
  /** Each day's count — logged by hand, or counted from account activity for automatic goals. */
  days: Array<{ date: string; progress: number }>;
  total: number;
}

export interface AccountabilityPerson {
  id: string;
  name: string;
  color: string;
}

/** A task as it stands on one day. */
export interface AccountabilityTaskView {
  id: string;
  title: string;
  notes: string | null;
  /** null = the account owner ("Me"). */
  personId: string | null;
  target: number | null;
  metric: AccountabilityMetric;
  period: AccountabilityPeriod;
  schedule: AccountabilitySchedule;
  startDate: string;
  onDate: string | null;
  /** Last day it runs (inclusive); null = continues indefinitely. */
  endDate: string | null;
  /** Count toward `target` on this day (for a WEEKLY goal: this day's own entry). */
  progress: number;
  /** DAILY: this day's goal is met. WEEKLY: the week's total has reached the target. */
  completed: boolean;
  /** WEEKLY goals only. */
  week: AccountabilityWeekProgress | null;
}

export interface AccountabilityDayStat {
  date: string;
  done: number;
  total: number;
  /** Keyed by person id, or "me" for the owner's own tasks. */
  byPerson: Record<string, { done: number; total: number }>;
}

export interface AccountabilityDay {
  date: string;
  /** The Monday–Sunday week containing `date`. */
  weekStart: string;
  weekEnd: string;
  people: AccountabilityPerson[];
  tasks: AccountabilityTaskView[];
  /** The 7 days ending on `date`, oldest first — daily goals only. */
  week: AccountabilityDayStat[];
}

export interface AccountabilityTaskInput {
  title: string;
  notes?: string | null;
  personId?: string | null;
  target?: number | null;
  metric?: AccountabilityMetric;
  period?: AccountabilityPeriod;
  schedule?: AccountabilitySchedule;
  /** YYYY-MM-DD: first day the task applies (defaults to today), and the day for ONCE tasks. */
  startDate: string;
  /** YYYY-MM-DD last day it runs (inclusive); null/omitted = continues indefinitely. */
  endDate?: string | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/** Sales totals for one period. Averages and rates are null when there is nothing to average. */
export interface AnalyticsTotals {
  revenue: number;
  /** Cost of goods sold — the sold items' costPrice × quantity. Items with no cost count as 0. */
  cost: number;
  /** revenue − cost. Marketplace fees are not recorded, so they are not deducted. */
  profit: number;
  unitsSold: number;
  /** Inventory items whose first listing went live in the period (cross-listings not counted twice). */
  unitsListed: number;
  /** Of the items first listed in the period, the share that has sold since (0–1). */
  sellThroughRate: number | null;
  avgSalePrice: number | null;
  avgProfit: number | null;
  /** profit / revenue (0–1). */
  profitMargin: number | null;
  /** Mean days from first listing (or creation, if never listed) to sale. */
  avgDaysToSell: number | null;
}

export interface AnalyticsSeriesPoint {
  /** Bucket start as YYYY-MM-DD (the first day of the week/month for coarser buckets). */
  date: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  unitsListed: number;
}

export interface AnalyticsBreakdownRow {
  /** Stable identity — a MarketplaceType, or a normalised free-text channel ("in person"). */
  key: string;
  label: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export interface AnalyticsMarketplaceRow extends AnalyticsBreakdownRow {
  cost: number;
  avgSalePrice: number | null;
  avgProfit: number | null;
  avgDaysToSell: number | null;
}

export interface AnalyticsInventorySnapshot {
  /** Unsold items (DRAFT + ACTIVE). */
  unsoldItems: number;
  /** Items with at least one live listing. */
  listedItems: number;
  /** Sum of costPrice × quantity over unsold items. */
  unsoldCost: number;
  /** Sum of each unsold item's asking price (its live listing price, else its target price). */
  unsoldListValue: number;
  /** Mean days since unsold items were added. */
  avgAgeDays: number | null;
}

export interface AnalyticsReport {
  range: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    granularity: "day" | "week" | "month";
  };
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  series: AnalyticsSeriesPoint[];
  byMarketplace: AnalyticsMarketplaceRow[];
  topBrands: AnalyticsBreakdownRow[];
  topCategories: AnalyticsBreakdownRow[];
  inventory: AnalyticsInventorySnapshot;
}

export interface InventoryStatusCount {
  status: InventoryStatus;
  count: number;
}

export interface SyncEventSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  marketplace: MarketplaceType;
  type: SyncEventType;
  status: string;
  createdAt: string;
}

export interface MarketplaceCount {
  marketplace: MarketplaceType;
  count: number;
  active: number;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

// ─── Prefill Types ────────────────────────────────────────────────────────────

export interface InventoryPrefillMercari {
  brandId?: string;
  sizeId?: string;
  /** The item's own size label (eBay "Size" specific, e.g. "L", "2XL", "38") — resolved on the
   *  client against the selected category's size schema with matchMercariSize. */
  sizeLabel?: string;
  zipCode?: string;
  addressId?: number;      // Mercari delivery address ID (from connection's synced address list)
  categorySuggestions?: string[];  // ordered Mercari category IDs, best first (from ebay-to-mercari mapping)
  categoryPath?: string[];         // human-readable path segments for display / live-search fallback
  shippingMethod: "SOYO" | "PREPAID";
  shippingPayerId?: 1 | 2;         // 1 = buyer pays, 2 = seller pays (PREPAID only)
  weightOz?: number;               // total oz
  dimL?: number;
  dimW?: number;
  dimH?: number;
}

export interface InventoryPrefillEbay {
  conditionId?: string;
  postalCode?: string;
  location?: string;
  weightLbs?: number;
  itemSpecifics: Record<string, string>;
  categorySearchTerm?: string;
}

export interface InventoryPrefillPoshmark {
  condition?: string;              // nwt | like_new | good | fair
  brand?: string;
  departmentId?: string;
  categoryId?: string;
  subcategoryId?: string;
  /** Size *label* (e.g. "M", "10"), not an ID — the client resolves it against the size list
   *  for the selected category, since Poshmark size IDs are category-scoped. */
  sizeLabel?: string;
  colors?: string[];               // up to 2 color names
  styleTags?: string[];            // up to 3
  originalPriceCents?: number;
  shippingDiscount?: string;
  /** Private "Listing SKU": a prior Poshmark listing's (even if cleared to ""), else the item's. */
  sku?: string;
}

export interface InventoryPrefillData {
  title?: string;
  price?: number;
  description?: string;
  mercari?: InventoryPrefillMercari;
  ebay?: InventoryPrefillEbay;
  poshmark?: InventoryPrefillPoshmark;
  source?: string;        // "EBAY", "MERCARI", "INVENTORY" etc.
  filledFields: string[];
}

// ─── Subscription & Credits Types ─────────────────────────────────────────────

export type PlanType = "FREE" | "SIDE_HUSTLE" | "FULL_TIME" | "ENTERPRISE";

export type SubscriptionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "TRIALING";

export type BillingInterval = "monthly" | "yearly";

export interface SubscriptionInfo {
  plan: PlanType | null;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  /** Remaining smart AI credits from the monthly allotment. */
  aiCredits: number;
  /** Remaining purchased top-up credits (never expire). */
  bonusAiCredits: number;
  /** Monthly smart AI credit allotment for the current plan/status. */
  monthlyAiCredits: number;
  /** Hard cap on distinct inventory items for the current plan/status. */
  inventoryLimit: number;
  /** How many inventory items the user currently holds. */
  inventoryUsed: number;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  isTrialing: boolean;
  isActive: boolean;
}
