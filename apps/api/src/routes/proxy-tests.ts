// Internal, token-protected endpoints that run the residential-proxy diagnostics FROM THE
// DEPLOYED SERVER — which is the only place the option-B (direct upload) test means anything.
//
// Registered only when PROXY_TEST_TOKEN is set. Every request must send it:
//   curl -X POST https://<api>/api/internal/proxy-tests/check \
//     -H "x-proxy-test-token: $PROXY_TEST_TOKEN"
// Remove PROXY_TEST_TOKEN from Railway once testing is done; the routes disappear with it.

import { timingSafeEqual } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  checkProxy,
  compressionTest,
  mercariCloudflareTest,
  mercariUploadTest,
  syntheticPhoto,
  usageReport,
} from "../services/proxy/proxy-diagnostics";
import type { MarketplaceType, PrismaClient } from "@repo/db";
import { currentUsageMonth } from "../services/proxy/proxy-usage.service";
import { MercariServerService } from "../services/marketplace/mercari-server.service";
import { PoshmarkServerService } from "../services/marketplace/poshmark-server.service";
import { EbayAdapter } from "../services/marketplace/ebay";
import { refreshConnectionIfNeeded } from "../services/marketplace/token-refresh";

/** Proxy bytes recorded for this user/marketplace this month — read before and after a test. */
async function usageBytes(db: PrismaClient, userId: string, marketplace: MarketplaceType): Promise<number> {
  const row = await db.proxyUsage.findUnique({
    where: { userId_marketplace_month: { userId, marketplace, month: currentUsageMonth() } },
    select: { bytes: true },
  });
  return Number(row?.bytes ?? 0);
}

async function activeExternalIds(db: PrismaClient, userId: string, marketplace: MarketplaceType) {
  const rows = await db.listing.findMany({
    where: { userId, marketplace, status: "ACTIVE", externalId: { not: null } },
    select: { externalId: true },
  });
  return rows.map((r) => r.externalId!);
}

function tokenOk(request: FastifyRequest): boolean {
  const expected = process.env.PROXY_TEST_TOKEN ?? "";
  const given = String(request.headers["x-proxy-test-token"] ?? "");
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function guard(request: FastifyRequest, reply: FastifyReply) {
  if (!tokenOk(request)) return reply.status(404).send({ success: false, error: "Not found" });
}

export async function proxyTestRoutes(fastify: FastifyInstance) {
  const opts = { preHandler: [guard] };

  fastify.post("/check", opts, async (_req, reply) => {
    return reply.send({ success: true, data: await checkProxy(fastify.prisma) });
  });

  fastify.post("/compression", opts, async (request, reply) => {
    const { urls = [] } = (request.body ?? {}) as { urls?: string[] };
    const inputs: Array<{ source: string; buffer: Buffer }> = [];
    for (const url of urls.slice(0, 10)) {
      if (!/^https:\/\//i.test(url)) continue;
      const res = await fetch(url);
      if (res.ok) inputs.push({ source: url, buffer: Buffer.from(await res.arrayBuffer()) });
    }
    if (inputs.length === 0) inputs.push({ source: "synthetic 3000x4000", buffer: await syntheticPhoto() });
    return reply.send({ success: true, data: await compressionTest(inputs) });
  });

  fastify.post("/mercari-upload", opts, async (request, reply) => {
    const { userId, modes } = (request.body ?? {}) as {
      userId?: string;
      modes?: Array<"direct" | "proxied">;
    };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    try {
      return reply.send({ success: true, data: await mercariUploadTest(fastify.prisma, userId, modes) });
    } catch (err) {
      return reply.status(500).send({ success: false, error: (err as Error).message });
    }
  });

  fastify.post("/mercari-cloudflare", opts, async (request, reply) => {
    const { userId } = (request.body ?? {}) as { userId?: string };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    return reply.send({ success: true, data: await mercariCloudflareTest(fastify.prisma, userId) });
  });

  fastify.post("/usage", opts, async (request, reply) => {
    const { month, pricePerGb } = (request.body ?? {}) as { month?: string; pricePerGb?: number };
    return reply.send({ success: true, data: await usageReport(fastify.prisma, { month, pricePerGb }) });
  });

  // ── Sale detection / delist readiness (read-only — nothing is changed on any account) ──

  // POST /poshmark-read { userId, postId? } — session over the proxy, the (inferred) sold feed,
  // and one confirmed per-post read. Shows whether server-side Poshmark works and what it costs.
  fastify.post("/poshmark-read", opts, async (request, reply) => {
    const { userId, postId } = (request.body ?? {}) as { userId?: string; postId?: string };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    const svc = new PoshmarkServerService(fastify.prisma);
    const before = await usageBytes(fastify.prisma, userId, "POSHMARK");
    const out: Record<string, unknown> = {};

    try {
      const session = await svc.getSession(userId);
      out.session = { ok: true, posherId: session.posherId, cookies: session.jar.size };

      const feedBefore = await usageBytes(fastify.prisma, userId, "POSHMARK");
      try {
        const ids = await svc.soldFeedPostIds(userId, 1, session);
        const active = new Set(await activeExternalIds(fastify.prisma, userId, "POSHMARK"));
        out.soldFeed = {
          ok: true,
          count: ids.length,
          sample: ids.slice(0, 5),
          matchesActiveListings: ids.filter((id) => active.has(id)),
          bytes: (await usageBytes(fastify.prisma, userId, "POSHMARK")) - feedBefore,
        };
      } catch (err) {
        out.soldFeed = { ok: false, error: (err as Error).message };
      }

      const target = postId ?? (await activeExternalIds(fastify.prisma, userId, "POSHMARK"))[0];
      if (target) {
        const readBefore = await usageBytes(fastify.prisma, userId, "POSHMARK");
        out.postRead = {
          postId: target,
          result: await svc.getPostStatus(userId, target, session),
          bytes: (await usageBytes(fastify.prisma, userId, "POSHMARK")) - readBefore,
        };
      }
    } catch (err) {
      out.error = (err as Error).message;
    }
    out.totalBytes = (await usageBytes(fastify.prisma, userId, "POSHMARK")) - before;
    return reply.send({ success: true, data: out });
  });

  // POST /mercari-sold-feed { userId } — run the configured sold-feed queries once.
  fastify.post("/mercari-sold-feed", opts, async (request, reply) => {
    const { userId } = (request.body ?? {}) as { userId?: string };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    const before = await usageBytes(fastify.prisma, userId, "MERCARI");
    try {
      const { ids, usedBrowser } = await new MercariServerService(fastify.prisma).soldFeedItemIds(userId);
      const active = new Set(await activeExternalIds(fastify.prisma, userId, "MERCARI"));
      return reply.send({
        success: true,
        data: {
          count: ids.size,
          sample: [...ids].slice(0, 10),
          matchesActiveListings: [...ids].filter((id) => active.has(id)),
          usedBrowser,
          bytes: (await usageBytes(fastify.prisma, userId, "MERCARI")) - before,
        },
      });
    } catch (err) {
      return reply.status(500).send({ success: false, error: (err as Error).message });
    }
  });

  // POST /ebay-activity { userId, days? } — the GetMyeBaySelling read the hourly sweep uses.
  fastify.post("/ebay-activity", opts, async (request, reply) => {
    const { userId, days = 7 } = (request.body ?? {}) as { userId?: string; days?: number };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    const connection = await fastify.prisma.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });
    if (!connection) return reply.status(404).send({ success: false, error: "eBay not connected" });
    try {
      const adapter = new EbayAdapter(await refreshConnectionIfNeeded(fastify.prisma, connection));
      const activity = await adapter.getRecentSellingActivity(days);
      const active = new Set(await activeExternalIds(fastify.prisma, userId, "EBAY"));
      return reply.send({
        success: true,
        data: {
          calls: activity.calls,
          sold: [...activity.sold.values()].slice(0, 20),
          unsoldCount: activity.unsold.size,
          soldButStillActiveHere: [...activity.sold.keys()].filter((id) => active.has(id)),
          unsoldButStillActiveHere: [...activity.unsold].filter((id) => active.has(id)),
        },
      });
    } catch (err) {
      return reply.status(500).send({ success: false, error: (err as Error).message });
    }
  });
}
