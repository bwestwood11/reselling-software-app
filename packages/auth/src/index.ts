import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "@repo/db";

const FREE_INVENTORY_CREDITS = 40; // max inventory items on free plan
const FREE_LISTING_CREDITS = 20; // max crosspost credits on free plan

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
    requireEmailVerification: false, // set to true in production with email provider
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
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Provision a free-tier subscription for every new account
          try {
            const subscription = await prisma.subscription.create({
              data: {
                userId: user.id,
                plan: "FREE",
                status: "ACTIVE",
                credits: FREE_LISTING_CREDITS,
                inventoryCredits: FREE_INVENTORY_CREDITS,
              },
            });
            await prisma.creditTransaction.create({
              data: {
                subscriptionId: subscription.id,
                userId: user.id,
                amount: FREE_LISTING_CREDITS,
                description: `Free tier — ${FREE_INVENTORY_CREDITS} inventory slots, ${FREE_LISTING_CREDITS} listing credits`,
              },
            });
          } catch (err) {
            // Non-fatal: log and continue so signup is never blocked
            console.error("[auth] Failed to provision free subscription:", err);
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
