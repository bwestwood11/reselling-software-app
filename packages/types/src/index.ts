export * from "./mercari-sizes";

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
  recentSyncEvents: SyncEventSummary[];
  listingsByMarketplace: MarketplaceCount[];
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

export interface InventoryPrefillData {
  title?: string;
  price?: number;
  description?: string;
  mercari?: InventoryPrefillMercari;
  ebay?: InventoryPrefillEbay;
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
