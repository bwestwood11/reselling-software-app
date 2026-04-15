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

// ─── Subscription & Credits Types ─────────────────────────────────────────────

export type PlanType = "FREE" | "STARTER" | "PRO" | "PREMIUM";

export type SubscriptionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "TRIALING";

export interface SubscriptionInfo {
  plan: PlanType | null;
  status: SubscriptionStatus;
  credits: number;
  monthlyCredits: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
