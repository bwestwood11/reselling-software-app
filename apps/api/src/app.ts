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

  // ── Security ──────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── Plugins ───────────────────────────────────────────────────────────────
  await app.register(prismaPlugin);

  // ── Better Auth handler (all /api/auth/* routes) ──────────────────────────
  app.all("/api/auth/*", async (request, reply) => {
    const nodeHandler = toNodeHandler(auth);
    return nodeHandler(request.raw, reply.raw);
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(inventoryRoutes, { prefix: "/api/inventory" });
  await app.register(listingsRoutes, { prefix: "/api/listings" });
  await app.register(marketplacesRoutes, { prefix: "/api/marketplaces" });
  await app.register(syncRoutes, { prefix: "/api/sync" });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
