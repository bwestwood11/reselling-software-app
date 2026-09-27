import type { ScanEbayListing, ScanEbayResult } from "@repo/types";

// Price lookups for the photo scanner via eBay's Browse API, using an application token
// (client_credentials) from the same EBAY_CLIENT_ID / EBAY_CLIENT_SECRET the OAuth flow uses —
// no connected seller account needed. EBAY_SANDBOX=true points it at the sandbox, which only
// returns test data. Without keys, only search links are returned.

const SITES: Record<string, string> = {
  EBAY_US: "www.ebay.com",
  EBAY_GB: "www.ebay.co.uk",
  EBAY_DE: "www.ebay.de",
  EBAY_CA: "www.ebay.ca",
  EBAY_AU: "www.ebay.com.au",
  EBAY_IN: "www.ebay.in",
};
const marketplace = () => process.env.EBAY_MARKETPLACE || "EBAY_US";

export const ebayBrowseEnabled = () =>
  Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
export const ebayBrowseSandbox = () => process.env.EBAY_SANDBOX === "true";

const apiBase = () => (ebayBrowseSandbox() ? "https://api.sandbox.ebay.com" : "https://api.ebay.com");

// module-level cache: reused for the token's lifetime (~2h)
let token: { value: string; expires: number } | null = null;

async function httpError(res: Response): Promise<Error> {
  // include eBay's own error text (e.g. "client authentication failed") rather than just the status code
  const body = (await res.json().catch(() => null)) as {
    error_description?: string;
    error?: string;
    errors?: { message?: string }[];
  } | null;
  const detail = body?.error_description || body?.error || body?.errors?.[0]?.message || res.statusText;
  return new Error(`HTTP ${res.status} from ${new URL(res.url).pathname}: ${detail}`);
}

async function getToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${apiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  if (!res.ok) throw await httpError(res);
  const body = (await res.json()) as { access_token: string; expires_in?: number };
  token = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 7200) * 1000 };
  return token.value;
}

function links(query: string) {
  const site = SITES[marketplace()] ?? "www.ebay.com";
  const q = encodeURIComponent(query).replace(/%20/g, "+");
  return {
    search_url: `https://${site}/sch/i.html?_nkw=${q}`,
    sold_url: `https://${site}/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const emptyResult = (query: string): ScanEbayResult => ({
  query,
  ...links(query),
  listings: [],
  stats: null,
  error: null,
});

type ItemSummary = {
  title?: string;
  price?: { value?: string; currency?: string };
  condition?: string;
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  itemWebUrl?: string;
};

export async function searchEbayListings(query: string, limit = 8): Promise<ScanEbayResult> {
  const result = emptyResult(query);
  if (!ebayBrowseEnabled()) return result;
  try {
    // fixed price only: auctions show partial bids
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      filter: "buyingOptions:{FIXED_PRICE}",
    });
    const res = await fetch(`${apiBase()}/buy/browse/v1/item_summary/search?${params}`, {
      headers: {
        authorization: `Bearer ${await getToken()}`,
        "x-ebay-c-marketplace-id": marketplace(),
      },
    });
    if (!res.ok) throw await httpError(res);
    const body = (await res.json()) as { itemSummaries?: ItemSummary[] };
    for (const item of body.itemSummaries ?? []) {
      const listing: ScanEbayListing = {
        title: item.title ?? "",
        price: item.price?.value ? Number(item.price.value) : null,
        currency: item.price?.currency ?? null,
        condition: item.condition ?? null,
        image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
        url: item.itemWebUrl ?? result.search_url,
      };
      result.listings.push(listing);
    }
    const prices = result.listings.map((l) => l.price).filter((p): p is number => p != null);
    if (prices.length) {
      result.stats = {
        count: prices.length,
        low: Math.min(...prices),
        median: median(prices),
        high: Math.max(...prices),
        currency: result.listings[0]?.currency ?? "USD",
      };
    }
  } catch (e) {
    result.error = `eBay search failed: ${e instanceof Error ? e.message : e}`;
  }
  return result;
}

export async function searchEbayListingsMany(queries: string[], limit = 8): Promise<ScanEbayResult[]> {
  if (ebayBrowseEnabled()) {
    try {
      await getToken(); // fetch once up front instead of racing in every search
    } catch (e) {
      // bad keys / eBay down: still return the search links
      const env = ebayBrowseSandbox() ? "sandbox" : "production";
      const error = `eBay auth failed (${env} API): ${e instanceof Error ? e.message : e}`;
      return queries.map((q) => ({ ...emptyResult(q), error }));
    }
  }
  return Promise.all(queries.map((q) => searchEbayListings(q, limit)));
}
