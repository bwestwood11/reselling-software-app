// All endpoints confirmed via live network traffic from mercari.com (2025-04).
// Base URL: https://www.mercari.com/v1
// - Google login:         POST /v1/login_google   { idToken }
// - Email/password login: POST /v1/login          { email_address, password, recaptchaEnterpriseToken }
// Both return:            { accessToken, user: { userId, name, ... } }

const MERCARI_BASE = "https://www.mercari.com/v1";

// Confirmed from live JWT aud claim
export const MERCARI_GOOGLE_CLIENT_ID =
  "900288721633-70umose0g8lcfh663hhjpj8q3rk9tud4.apps.googleusercontent.com";

const MERCARI_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
};

export interface MercariTokens {
  accessToken: string;
  accountId?: string;
  accountName?: string;
}

// ─── Google SSO login (confirmed) ────────────────────────────────────────────

export async function loginWithGoogleToken(googleIdToken: string): Promise<MercariTokens> {
  const res = await fetch(`${MERCARI_BASE}/login_google`, {
    method: "POST",
    headers: MERCARI_HEADERS,
    body: JSON.stringify({ idToken: googleIdToken }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (body.message as string) ?? `Mercari Google login failed (${res.status})`
    );
  }

  return extractTokens(body);
}

// ─── Email/password login (confirmed) ────────────────────────────────────────
// recaptchaEnterpriseToken is generated in the browser using Mercari's reCAPTCHA
// Enterprise site key and forwarded here — it is NOT generated server-side.

export async function loginWithEmail(
  email: string,
  password: string,
  recaptchaEnterpriseToken: string
): Promise<MercariTokens> {
  const res = await fetch(`${MERCARI_BASE}/login`, {
    method: "POST",
    headers: MERCARI_HEADERS,
    body: JSON.stringify({
      email_address: email,
      password,
      recaptchaEnterpriseToken,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (body.message as string) ?? `Mercari email login failed (${res.status})`
    );
  }

  return extractTokens(body);
}

// ─── Token refresh ────────────────────────────────────────────────────────────
// Mercari's accessToken JWT contains exp ~30 days out (confirmed from decoded JWT).
// There is no explicit refresh endpoint in observed traffic — the token is
// long-lived. If a 401 is encountered, prompt the user to reconnect.

export async function refreshMercariToken(_refreshToken: string): Promise<MercariTokens> {
  // No refresh endpoint confirmed — callers should surface a re-auth prompt on 401
  throw new Error("Mercari token refresh not available — please reconnect your account");
}

// ─── Response parsing (confirmed field names) ─────────────────────────────────
// Confirmed shape: { accessToken: string, user: { userId: number, name: string, ... } }

function extractTokens(body: Record<string, unknown>): MercariTokens {
  const accessToken = body.accessToken as string | undefined;
  if (!accessToken) {
    throw new Error("Mercari response did not include an accessToken");
  }

  const user = (body.user ?? {}) as Record<string, unknown>;

  return {
    accessToken,
    accountId: user.userId != null ? String(user.userId) : undefined,
    // Prefer the display name; fall back to username or email
    accountName:
      ((user.name as string) || (user.username as string) || (user.email as string)) ?? undefined,
  };
}
