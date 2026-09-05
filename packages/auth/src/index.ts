import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { prisma } from "@repo/db";
import { sendVerificationOtpEmail } from "./email";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : undefined;

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultTrustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "relist://",
  "exp://*",
  "chrome-extension://*", // ReList Chrome extension (Mercari crosslister)
];

for (const origin of defaultTrustedOrigins) {
  if (!trustedOrigins.includes(origin)) {
    trustedOrigins.push(origin);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // must verify the emailed code before login is allowed
  },
  emailVerification: {
    sendOnSignIn: true, // resend a code if an unverified user tries to log in
    autoSignInAfterVerification: true,
  },
  user: {
    deleteUser: {
      enabled: true, // lets a signed-in user delete their own account (settings/profile page)
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.API_URL ?? "http://localhost:3001",
  ...(socialProviders ? { socialProviders } : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
  trustedOrigins,
    ...(process.env.COOKIE_DOMAIN
    ? {
        advanced: {
          crossSubDomainCookies: {
            enabled: true,
            domain: process.env.COOKIE_DOMAIN,
          },
        },
      }
    : {}),
  plugins: [
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      overrideDefaultEmailVerification: true, // route sign-up/sign-in verification through the OTP code below instead of a link
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          await sendVerificationOtpEmail(email, otp);
        }
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create an inactive subscription placeholder. There is no perpetual
          // free tier — the user activates a 7-day trial (card required) from the
          // billing page, which provisions credits via the Stripe webhook.
          try {
            await prisma.subscription.create({
              data: {
                userId: user.id,
                plan: "FREE",
                status: "INACTIVE",
              },
            });
          } catch (err) {
            // Non-fatal: log and continue so signup is never blocked
            console.error("[auth] Failed to provision subscription placeholder:", err);
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
