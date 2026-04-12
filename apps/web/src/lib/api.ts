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
      "Content-Type": "application/json",
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
  markSold: (id: string) =>
    request<any>(`/api/listings/${id}/mark-sold`, { method: "POST" }),
};

// ─── Marketplaces ─────────────────────────────────────────────────────────────

export const marketplacesApi = {
  listConnections: () => request<any>("/api/marketplaces/connections"),
  deleteConnection: (id: string) =>
    request<any>(`/api/marketplaces/connections/${id}`, { method: "DELETE" }),
  getAuthUrl: (marketplace: string) =>
    request<any>(`/api/marketplaces/oauth/${marketplace}/authorize`),
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
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/sync/events${qs}`);
  },
};

export { ApiError };
