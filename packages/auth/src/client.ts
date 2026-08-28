import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const authBaseUrl =
  process.env.NEXT_PUBLIC_AUTH_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [emailOTPClient()],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  emailOtp,
} = authClient;
