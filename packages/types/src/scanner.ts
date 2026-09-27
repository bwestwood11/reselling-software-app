// Photo scanner: Gemini finds resellable products in a storehouse/garage photo and eBay prices them.
// Shared between the API (`/api/scan/*`) and the web scanner page.

export type ScanBox = {
  view: string; // view the box was drawn on; "original" once mapped back onto the photo
  box_2d: number[]; // [ymin, xmin, ymax, xmax], 0-1000
};

export type ScanProduct = {
  name: string;
  brand: string | null;
  model_number: string | null;
  category: string;
  quantity: number;
  condition: string;
  estimated_resale_low_usd: number;
  estimated_resale_high_usd: number;
  resale_potential: string;
  where_to_sell: string;
  confidence: number;
  notes: string | null;
  ebay_search_query: string | null;
  boxes: ScanBox[];
};

export type ScanAnalysis = {
  scene_description: string;
  products: ScanProduct[];
  total_estimated_low_usd: number;
  total_estimated_high_usd: number;
};

/** A product found by one pass (scene or a tile), boxes already mapped onto the original photo. */
export type ScanMergeCandidate = Omit<ScanProduct, "boxes"> & {
  id: string;
  source: string; // "scene" or "tile r,c"
  boxes: number[][];
  overlaps: string[]; // ids of other candidates whose boxes overlap this one
};

export type ScanMergedProduct = Omit<ScanProduct, "boxes"> & { source_ids: string[] };
export type ScanMergeResult = {
  scene_description: string;
  products: ScanMergedProduct[];
  dropped_ids?: string[];
};

export type ScanEbayListing = {
  title: string;
  price: number | null;
  currency: string | null;
  condition: string | null;
  image: string | null;
  url: string;
};

export type ScanPriceStats = { count: number; low: number; median: number; high: number; currency: string };

export type ScanEbayResult = {
  query: string;
  search_url: string; // active listings on eBay
  sold_url: string; // completed/sold listings: the best signal for real resale value
  listings: ScanEbayListing[];
  stats: ScanPriceStats | null;
  error: string | null;
};

/** Tokens billed for one Gemini request; output price applies to output + thinking. */
export type ScanUsage = {
  model: string;
  input: number;
  input_image: number;
  output: number;
  thinking: number;
  cost_usd: number | null;
};

export type ScanViewPayload = { label: string; data: string }; // data = base64 JPEG
export type ScanMode = "scene" | "tile";

/** How thoroughly a photo is scanned: the whole photo only, or also zoomed into a 2×2 / 3×3 grid. */
export type ScanTier = "quick" | "detailed" | "deep";

export type ScanConfig = {
  /** Smart AI credits charged per photo for each scan tier. */
  credits: Record<ScanTier, number>;
};

/** Returned by POST /api/scan/start; every analyze/merge call of that scan sends the scanId. */
export type ScanSession = { scanId: string; expiresAt: string };
