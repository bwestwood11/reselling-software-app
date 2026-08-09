import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth";
import { inventoryRoutes } from "./routes/inventory";
import { listingsRoutes } from "./routes/listings";
import { marketplacesRoutes } from "./routes/marketplaces";
import { dashboardRoutes } from "./routes/dashboard";
import { syncRoutes } from "./routes/sync";
import { uploadRoutes } from "./routes/upload";
import { subscriptionRoutes } from "./routes/subscriptions";
import { webhookRoutes } from "./routes/webhooks";
import { mercariRoutes } from "./routes/mercari";
import { poshmarkRoutes } from "./routes/poshmark";
import { aiRoutes } from "./routes/ai";
import { sourcesRoutes } from "./routes/sources";
import { prismaPlugin } from "./plugins/prisma";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...configuredOrigins,
  ]);

  const isAllowedOrigin = (origin?: string): boolean => {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    // Allow Chrome extension origins for the Mercari crosslisting extension
    if (/^chrome-extension:\/\/[a-z]{32}$/.test(origin)) return true;

    return (
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    );
  };

  // ── Security ──────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── Plugins ───────────────────────────────────────────────────────────────
  await app.register(prismaPlugin);
  await app.register(await import("@fastify/multipart").then((m) => m.default));

  // ── Better Auth handler (all /api/auth/* routes) ──────────────────────────
  // toNodeHandler writes directly to reply.raw, bypassing Fastify's onSend
  // hooks (where @fastify/cors normally injects response headers). We must
  // write CORS headers to reply.raw ourselves before handing off.
  app.all("/api/auth/*", async (request, reply) => {
    const origin = request.headers.origin;
    if (typeof origin === "string" && isAllowedOrigin(origin)) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader("Vary", "Origin");
    }

    // Handle CORS preflight — toNodeHandler does not respond to OPTIONS.
    if (request.method === "OPTIONS") {
      reply.raw.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      reply.raw.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie, X-Requested-With"
      );
      reply.raw.statusCode = 204;
      reply.raw.end();
      return;
    }

    // Fastify may consume/parse the body before handing off to node handlers.
    // Expose parsed body so Better Auth validation can read payloads.
    (request.raw as unknown as { body?: unknown }).body = request.body;

    const nodeHandler = toNodeHandler(auth);
    return nodeHandler(request.raw, reply.raw);
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(inventoryRoutes, { prefix: "/api/inventory" });
  await app.register(listingsRoutes, { prefix: "/api/listings" });
  await app.register(marketplacesRoutes, { prefix: "/api/marketplaces" });
  await app.register(syncRoutes, { prefix: "/api/sync" });
  await app.register(uploadRoutes, { prefix: "/api/upload" });
  await app.register(subscriptionRoutes, { prefix: "/api/subscriptions" });
  await app.register(mercariRoutes, { prefix: "/api/mercari" });
  await app.register(poshmarkRoutes, { prefix: "/api/poshmark" });
  await app.register(aiRoutes, { prefix: "/api/ai" });
  await app.register(sourcesRoutes, { prefix: "/api/sources" });
  // Webhook must be registered AFTER other routes so its content-type parser
  // override is scoped only to the webhook plugin.
  await app.register(webhookRoutes, { prefix: "/api/webhooks" });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
