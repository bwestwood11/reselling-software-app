const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      // Only send Content-Type when there is a body to avoid Fastify's FST_ERR_CTP_EMPTY_JSON_BODY
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Request failed", data);
  }

  return data as T;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/inventory${qs}`);
  },
  get: (id: string) => request<any>(`/api/inventory/${id}`),
  create: (body: unknown) =>
    request<any>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: unknown) =>
    request<any>(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<any>(`/api/inventory/${id}`, { method: "DELETE" }),
  updateStatus: (id: string, status: string) =>
    request<any>(`/api/inventory/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  markSold: (
    id: string,
    body: { soldPrice: number; soldVia?: string | null; soldNote?: string | null; soldAt?: string }
  ) =>
    request<any>(`/api/inventory/${id}/mark-sold`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPrefill: (id: string, marketplace: string) =>
    request<any>(`/api/inventory/${id}/prefill?marketplace=${encodeURIComponent(marketplace)}`),
};

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listingsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/listings${qs}`);
  },
  get: (id: string) => request<any>(`/api/listings/${id}`),
  create: (body: unknown) =>
    request<any>("/api/listings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  crosslist: (body: unknown) =>
    request<any>("/api/listings/crosslist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: unknown) =>
    request<any>(`/api/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<any>(`/api/listings/${id}`, { method: "DELETE" }),
  publish: (id: string) =>
    request<any>(`/api/listings/${id}/publish`, { method: "POST" }),
  delist: (id: string) =>
    request<any>(`/api/listings/${id}/delist`, { method: "POST" }),
  markSold: (id: string, soldPrice?: number) =>
    request<any>(`/api/listings/${id}/mark-sold`, {
      method: "POST",
      body: JSON.stringify(soldPrice != null ? { soldPrice } : {}),
    }),
};

// ─── Marketplaces ─────────────────────────────────────────────────────────────

export const marketplacesApi = {
  listConnections: () => request<any>("/api/marketplaces/connections"),
  deleteConnection: (id: string) =>
    request<any>(`/api/marketplaces/connections/${id}`, { method: "DELETE" }),
  getAuthUrl: (marketplace: string) =>
    request<any>(`/api/marketplaces/oauth/${marketplace}/authorize`),
  getEbayPolicies: () => request<any>("/api/marketplaces/ebay/policies"),
  setupEbayPolicies: () =>
    request<any>("/api/marketplaces/ebay/setup-policies", { method: "POST" }),
  getEbayCategorySuggestions: (q: string) =>
    request<any>(`/api/marketplaces/ebay/category-suggestions?q=${encodeURIComponent(q)}`),
  getEbayCategoryAspects: (categoryId: string) =>
    request<any>(`/api/marketplaces/ebay/category-aspects?categoryId=${encodeURIComponent(categoryId)}`),
  // Store a captured Mercari token (does NOT call Mercari — just stores in DB)
  connectMercariToken: (accessToken: string, accountId?: string, accountName?: string) =>
    request<any>("/api/marketplaces/mercari/connect-token", {
      method: "POST",
      body: JSON.stringify({ accessToken, accountId, accountName }),
    }),
  getMercariAddresses: () => request<any>("/api/marketplaces/mercari/addresses"),
  // Returns { jobId } when dispatching to the extension, or { data: addresses[] } when called
  // from mobile (body contains addresses). Web always gets a jobId back.
  triggerRefreshMercariAddresses: () =>
    request<any>("/api/marketplaces/mercari/refresh-addresses", { method: "POST" }),
  setMercariPreferredAddress: (addressId: number) =>
    request<any>("/api/marketplaces/mercari/preferred-address", {
      method: "PATCH",
      body: JSON.stringify({ addressId }),
    }),
  setMercariPreferredShippingMethod: (method: "SOYO" | "PREPAID") =>
    request<any>("/api/marketplaces/mercari/preferred-shipping-method", {
      method: "PATCH",
      body: JSON.stringify({ method }),
    }),
  // Mercari publishing preferences (always-use-ZenRows toggle, ZenRows availability)
  getMercariSettings: () =>
    request<{
      success: boolean;
      data: { alwaysUseZenRows: boolean; zenRowsAvailable: boolean };
    }>("/api/mercari/settings"),
  setMercariAlwaysUseZenRows: (alwaysUseZenRows: boolean) =>
    request<any>("/api/mercari/settings", {
      method: "PATCH",
      body: JSON.stringify({ alwaysUseZenRows }),
    }),
};

// ─── eBay Import ──────────────────────────────────────────────────────────────

export const importApi = {
  getImportableListings: (params?: {
    status?: string;
    showImported?: boolean;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)] as [string, string]);
    const qs = entries.length > 0 ? `?${new URLSearchParams(entries).toString()}` : "";
    return request<any>(`/api/marketplaces/ebay/importable-listings${qs}`);
  },

  importItems: (ebayItemIds: string[]) =>
    request<any>("/api/marketplaces/ebay/import", {
      method: "POST",
      body: JSON.stringify({ ebayItemIds }),
    }),
};

// ─── Mercari jobs ─────────────────────────────────────────────────────────────

export const mercariApi = {
  listJobs: (params?: { status?: string; limit?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
    return request<any>(`/api/mercari/jobs${qs}`);
  },
  getJob: (jobId: string) => request<any>(`/api/mercari/jobs/${jobId}`),
  getJobForListing: (listingId: string) =>
    request<any>(`/api/mercari/jobs?listingId=${listingId}&limit=1`),
  getCategories: (parentId?: string, search?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (parentId !== undefined) params.set("parentId", parentId);
    if (search) params.set("search", search);
    if (limit) params.set("limit", String(limit));
    return request<any>(`/api/mercari/categories?${params.toString()}`);
  },
  getShippingCarriers: (params: {
    categoryId?: number;
    packageWeight: number;
    dimension?: { length: number; width: number; height: number };
  }) =>
    request<any>("/api/mercari/shipping/carriers", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  // Server-side (Browserless + CapSolver) credential login — see
  // apps/api/src/services/playwright/mercari-browserless.service.ts.
  loginStart: (email: string, password: string) =>
    request<{ success: true; data: { status: "success" | "otp_required" } }>(
      "/api/mercari/login/start",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  loginVerify: (code: string) =>
    request<{ success: true; data: { connected: boolean } }>("/api/mercari/login/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => request<any>("/api/dashboard/stats"),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncApi = {
  syncAll: () => request<any>("/api/sync/all", { method: "POST" }),
  syncListing: (id: string) =>
    request<any>(`/api/sync/listing/${id}`, { method: "POST" }),
  importFromEbay: () => request<any>("/api/sync/import-ebay", { method: "POST" }),
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/sync/events${qs}`);
  },
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadImage: async (
    file: File,
    options?: { removeBackground?: boolean; flatLay?: boolean; ironing?: boolean; ghostMannequin?: boolean }
  ): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    if (options?.removeBackground) params.set("removeBackground", "true");
    if (options?.flatLay) params.set("flatLay", "true");
    if (options?.ironing) params.set("ironing", "true");
    if (options?.ghostMannequin) params.set("ghostMannequin", "true");
    const qs = params.size ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/upload${qs}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(res.status, data.error ?? "Upload failed", data);
    }

    return (data as { data: { url: string; key: string } }).data;
  },
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptionApi = {
  getCurrent: () => request<any>("/api/subscriptions/current"),
  createCheckout: (plan: string, interval: "monthly" | "yearly" = "monthly") =>
    request<any>("/api/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, interval }),
    }),
  createTopupCheckout: (packs = 1) =>
    request<any>("/api/subscriptions/topup-checkout", {
      method: "POST",
      body: JSON.stringify({ packs }),
    }),
  verifySession: (sessionId: string) =>
    request<any>("/api/subscriptions/verify-session", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),
  createPortal: () =>
    request<any>("/api/subscriptions/portal", { method: "POST" }),
};

// ─── Sources ─────────────────────────────────────────────────────────────────

export const sourcesApi = {
  list: () => request<any>("/api/sources"),
  getStats: () => request<any>("/api/sources/stats"),
  get: (id: string) => request<any>(`/api/sources/${id}`),
  create: (body: { name: string; parentId?: string }) =>
    request<any>("/api/sources", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; parentId?: string | null }) =>
    request<any>(`/api/sources/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<any>(`/api/sources/${id}`, { method: "DELETE" }),
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  generateDescription: (imageUrls: string[], title?: string) =>
    request<{ success: true; data: { description: string } }>("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ imageUrls, title }),
    }),
};

export { ApiError };
