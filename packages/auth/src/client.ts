import { createAuthClient } from "better-auth/react";

const authBaseUrl =
  process.env.NEXT_PUBLIC_AUTH_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

type AuthClient = ReturnType<typeof createAuthClient>;

export const authClient: AuthClient = createAuthClient({
  baseURL: authBaseUrl,
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
