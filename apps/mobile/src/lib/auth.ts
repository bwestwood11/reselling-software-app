import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { resolveApiBaseUrl } from "./config";

WebBrowser.maybeCompleteAuthSession();

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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SessionData = {
  user: AuthUser;
  session: { id: string; token: string; expiresAt: string };
};

type SocialSignInResponse = {
  redirect: boolean;
  url?: string;
  token?: string;
  user?: AuthUser;
};

function getTokenFromCallbackUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("token") ??
      parsed.searchParams.get("session_token") ??
      parsed.searchParams.get("access_token")
    );
  } catch {
    return null;
  }
}

export class AuthApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

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
    const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const message = "message" in record ? String(record["message"]) : raw || "Request failed";
    const code = "code" in record ? String(record["code"]) : undefined;
    throw new AuthApiError(`${message} (status ${res.status})`, code);
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

export async function signInWithGoogle(): Promise<AuthUser> {
  // Use a fixed deep link callback; Expo may still return exp:// URLs from createURL in dev.
  const callbackURL = "relist://oauth-callback";

  const data = await authRequest<SocialSignInResponse>("/sign-in/social", {
    provider: "google",
    callbackURL,
    errorCallbackURL: callbackURL,
    disableRedirect: true,
  });

  if (data.token) {
    await storeToken(data.token);
    return data.user ?? ((await getSession()) as AuthUser);
  }

  if (!data.url) {
    throw new Error("Google sign in could not be started.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, callbackURL);

  if (result.type !== "success") {
    throw new Error("Google sign in was cancelled.");
  }

  const token = getTokenFromCallbackUrl(result.url);
  if (token) {
    await storeToken(token);
  }

  const user = await getSession();
  if (!user) {
    throw new Error("Google sign in finished but no session was returned.");
  }

  return user;
}

export type SignUpResult = {
  user: AuthUser;
  // true when the account still needs to confirm the emailed verification code
  // before it has an active session (emailAndPassword.requireEmailVerification).
  requiresVerification: boolean;
};

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<SignUpResult> {
  const data = await authRequest<SessionData & { token?: string | null }>(
    "/sign-up/email",
    { name, email, password },
  );

  const token = data.token ?? data.session?.token;
  if (token) await storeToken(token);

  return { user: data.user, requiresVerification: !token };
}

// ─── Email verification (OTP) ──────────────────────────────────────────────────

export async function sendVerificationOtp(email: string): Promise<void> {
  await authRequest<{ success: boolean }>("/email-otp/send-verification-otp", {
    email,
    type: "email-verification",
  });
}

export async function verifyEmailOtp(email: string, otp: string): Promise<AuthUser> {
  const data = await authRequest<{ status: boolean; token: string | null; user: AuthUser }>(
    "/email-otp/verify-email",
    { email, otp },
  );

  if (data.token) await storeToken(data.token);

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
