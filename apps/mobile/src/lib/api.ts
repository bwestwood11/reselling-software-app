import { getStoredToken } from "./auth";
import { resolveApiBaseUrl } from "./config";

const API_BASE = resolveApiBaseUrl();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

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

export const api = {
  getDashboardStats: () => request<any>("/api/dashboard/stats"),
  getInventory: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/inventory${qs}`);
  },
  getListings: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any>(`/api/listings${qs}`);
  },
  getSubscription: () => request<any>("/api/subscriptions/current"),
};
