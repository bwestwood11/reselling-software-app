import { getStoredToken } from "./auth";
import { resolveApiBaseUrl } from "./config";

const API_BASE = resolveApiBaseUrl();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as Record<string, unknown>).error)
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

async function uploadImage(
  uri: string,
  mimeType?: string
): Promise<{ url: string; key: string }> {
  const token = await getStoredToken();

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: `photo_${Date.now()}.jpg`,
    type: mimeType ?? "image/jpeg",
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers,
    body: formData as unknown as BodyInit_,
  });

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as Record<string, unknown>).error)
        : "Upload failed";
    throw new Error(message);
  }
  return (data as { data: { url: string; key: string } }).data;
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<any>("/api/dashboard/stats"),

  // Inventory
  getInventory: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/inventory${qs}`);
  },
  getInventoryItem: (id: string) => request<any>(`/api/inventory/${id}`),
  createInventoryItem: (body: unknown) =>
    request<any>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateInventoryItem: (id: string, body: unknown) =>
    request<any>(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteInventoryItem: (id: string) =>
    request<any>(`/api/inventory/${id}`, { method: "DELETE" }),
  updateInventoryStatus: (id: string, status: string) =>
    request<any>(`/api/inventory/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Listings
  getListings: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/listings${qs}`);
  },
  getListing: (id: string) => request<any>(`/api/listings/${id}`),
  createListing: (body: unknown) =>
    request<any>("/api/listings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  publishListing: (id: string) =>
    request<any>(`/api/listings/${id}/publish`, { method: "POST" }),
  crosslistListings: (body: unknown) =>
    request<any>("/api/listings/crosslist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  delistListing: (id: string) =>
    request<any>(`/api/listings/${id}/delist`, { method: "POST" }),
  markListingSold: (id: string) =>
    request<any>(`/api/listings/${id}/mark-sold`, { method: "POST" }),

  // Marketplaces
  getMarketplaceConnections: () => request<any>("/api/marketplaces/connections"),
  deleteMarketplaceConnection: (id: string) =>
    request<any>(`/api/marketplaces/connections/${id}`, { method: "DELETE" }),
  connectMercariToken: (accessToken: string, accountId?: string, accountName?: string) =>
    request<any>("/api/marketplaces/mercari/connect-token", {
      method: "POST",
      body: JSON.stringify({ accessToken, accountId, accountName }),
    }),
  getMercariToken: () => request<any>("/api/marketplaces/mercari/token"),
  getMercariCategories: (parentId?: string, search?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (parentId !== undefined) params.set("parentId", parentId);
    if (search) params.set("search", search);
    if (limit) params.set("limit", String(limit));
    return request<any>(`/api/mercari/categories?${params.toString()}`);
  },
  getMercariShippingCarriers: (params: {
    categoryId?: number;
    packageWeight: number;
    dimension?: { length: number; width: number; height: number };
  }) =>
    request<any>("/api/mercari/shipping/carriers", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  recordMercariPublished: (listingId: string, externalId: string) =>
    request<any>(`/api/listings/${listingId}/record-published`, {
      method: "POST",
      body: JSON.stringify({ externalId }),
    }),
  getEbayPolicies: () => request<any>("/api/marketplaces/ebay/policies"),
  getEbayCategorySuggestions: (q: string) =>
    request<any>(
      `/api/marketplaces/ebay/category-suggestions?q=${encodeURIComponent(q)}`
    ),
  getEbayCategoryAspects: (categoryId: string) =>
    request<any>(
      `/api/marketplaces/ebay/category-aspects?categoryId=${encodeURIComponent(categoryId)}`
    ),

  // Subscription
  getSubscription: () => request<any>("/api/subscriptions/current"),

  // Upload
  uploadImage,
};
