import * as SecureStore from "expo-secure-store";
import { resolveApiBaseUrl } from "./config";

const API_BASE = resolveApiBaseUrl();
const TOKEN_KEY = "relist_session_token";
const AUTH_ORIGIN = process.env.EXPO_PUBLIC_AUTH_ORIGIN ?? "http://localhost:3000";

// ─── Token storage ────────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Auth API helpers ─────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SessionData = {
  user: AuthUser;
  session: { id: string; token: string; expiresAt: string };
};

async function authRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: AUTH_ORIGIN,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/auth${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as Record<string, unknown>)["message"])
        : raw || "Request failed";
    throw new Error(`${message} (status ${res.status})`);
  }

  return data as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const data = await authRequest<SessionData & { token?: string }>(
    "/sign-in/email",
    { email, password },
  );

  // Better Auth with bearer plugin returns the session token at data.token
  // or within data.session.token
  const token = data.token ?? data.session?.token;
  if (token) await storeToken(token);

  return data.user;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await authRequest<SessionData & { token?: string }>(
    "/sign-up/email",
    { name, email, password },
  );

  const token = data.token ?? data.session?.token;
  if (token) await storeToken(token);

  return data.user;
}

export async function signOut(): Promise<void> {
  const token = await getStoredToken();
  try {
    if (token) {
      await authRequest("/sign-out", {}, token);
    }
  } finally {
    await clearToken();
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const token = await getStoredToken();
  if (!token) return null;

  try {
    const data = await authRequest<{ user: AuthUser } | null>(
      "/get-session",
      undefined,
      token,
    );
    return data?.user ?? null;
  } catch {
    // Token is invalid or expired — clear it
    await clearToken();
    return null;
  }
}
