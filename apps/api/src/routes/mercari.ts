import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import { browserManager } from "../services/playwright/browser-manager";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import {
  getRootCategories,
  getChildCategories,
  searchCategories,
  getLeafCategories,
  getCategoryCount,
} from "../services/mercari-categories.service";

export async function mercariRoutes(fastify: FastifyInstance) {
  // GET /api/mercari/categories — browse categories (served from in-memory JSON, no DB)
  // ?parentId=        direct children of this id (pass "root" for top-level)
  // ?search=          case-insensitive label search across all categories
  // ?isLeaf=true      only leaf (selectable) nodes
  // ?limit=100
  fastify.get("/categories", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      parentId?: string;
      search?: string;
      isLeaf?: string;
      limit?: string;
    };
    const limit = Math.min(Number.parseInt(query.limit ?? "100", 10), 500);

    let categories;

    if (query.search?.trim()) {
      categories = searchCategories(query.search.trim(), limit);
    } else if (query.isLeaf === "true") {
      categories = getLeafCategories(limit);
    } else if (query.parentId === undefined) {
      categories = getRootCategories().slice(0, limit);
    } else {
      const raw =
        query.parentId === "root"
          ? getRootCategories()
          : getChildCategories(query.parentId);
      categories = raw.slice(0, limit);
    }

    return reply.send({ success: true, data: categories });
  });

  // GET /api/mercari/categories/count — total number of categories in the JSON
  fastify.get("/categories/count", { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.send({ success: true, data: { total: getCategoryCount() } });
  });

  // POST /api/mercari/jobs — enqueue a new crosslisting job
  fastify.post("/jobs", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      listingId?: string;
      payload: Prisma.InputJsonValue;
    };

    if (!body?.payload) {
      return reply.status(400).send({ success: false, error: "payload is required" });
    }

    const job = await fastify.prisma.mercariJob.create({
      data: {
        userId: request.user!.id,
        listingId: body.listingId ?? null,
        payload: body.payload,
      },
    });

    return reply.status(201).send({ success: true, data: job });
  });

  // GET /api/mercari/jobs/pending — extension polls this to get the next job
  fastify.get("/jobs/pending", { preHandler: [requireAuth] }, async (request, reply) => {
    const jobs = await fastify.prisma.mercariJob.findMany({
      where: { userId: request.user!.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return reply.send({ success: true, data: jobs });
  });

  // GET /api/mercari/jobs — list all jobs with optional status filter
  fastify.get("/jobs", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    const limit = Math.min(Number.parseInt(query.limit ?? "50", 10), 100);

    const jobs = await fastify.prisma.mercariJob.findMany({
      where: {
        userId: request.user!.id,
        ...(query.status ? { status: query.status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return reply.send({ success: true, data: jobs });
  });

  // PATCH /api/mercari/jobs/:id — extension reports job outcome
  // On COMPLETED: marks the linked Listing as ACTIVE with the Mercari listing ID.
  // On FAILED: marks the Listing as FAILED and refunds the deducted credit.
  fastify.patch("/jobs/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      externalId?: string;
      errorMessage?: string;
    };

    const existing = await fastify.prisma.mercariJob.findFirst({
      where: { id, userId: request.user!.id },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: "Job not found" });
    }

    const now = new Date();
    const isTerminal = body.status === "COMPLETED" || body.status === "FAILED";

    const job = await fastify.prisma.mercariJob.update({
      where: { id },
      data: {
        status: body.status,
        externalId: body.externalId ?? existing.externalId,
        errorMessage: body.errorMessage ?? null,
        completedAt: isTerminal ? now : existing.completedAt,
      },
    });

    if (existing.listingId && isTerminal) {
      if (body.status === "COMPLETED") {
        await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: {
            status: "ACTIVE",
            externalId: body.externalId ?? null,
            listedAt: now,
            lastSyncAt: now,
            syncError: null,
          },
        });
        await fastify.prisma.syncEvent.create({
          data: {
            listingId: existing.listingId,
            type: "PUBLISH",
            status: "success",
            message: body.externalId
              ? `Published to Mercari — listing ID: ${body.externalId}`
              : "Published to Mercari",
          },
        });
      } else {
        const errorMsg = body.errorMessage ?? "Extension job failed";
        await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: { status: "FAILED", syncError: errorMsg, lastSyncAt: now },
        });
        await fastify.prisma.syncEvent.create({
          data: {
            listingId: existing.listingId,
            type: "ERROR",
            status: "failed",
            message: errorMsg,
          },
        });
        try {
          const subscriptionSvc = new SubscriptionService(fastify.prisma);
          await subscriptionSvc.refundCredit(
            request.user!.id,
            existing.listingId,
            "MERCARI"
          );
        } catch {
          fastify.log.error("Failed to refund Mercari credit for job %s", id);
        }
      }
    }

    return reply.send({ success: true, data: job });
  });

  // POST /api/mercari/shipping/carriers — proxy Mercari availableShippingClassesV2
  fastify.post("/shipping/carriers", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      categoryId?: number;
      packageWeight: number;
      dimension?: { length: number; width: number; height: number };
    };

    if (!body?.packageWeight || body.packageWeight <= 0) {
      return reply.status(400).send({ success: false, error: "packageWeight is required" });
    }

    const connection = await fastify.prisma.marketplaceConnection.findFirst({
      where: { userId: request.user!.id, marketplace: "MERCARI", isActive: true },
      select: { id: true, accessToken: true, refreshToken: true },
    });

    if (!connection) {
      return reply
        .status(422)
        .send({ success: false, error: "No active Mercari connection. Connect your Mercari account first." });
    }

    const packageSize = body.dimension
      ? body.dimension.length * body.dimension.width * body.dimension.height
      : 0;

    const gqlBody = {
      operationName: "availableShippingClassesV2",
      variables: {
        input: {
          ...(body.categoryId ? { categoryId: body.categoryId } : {}),
          packageSize,
          ...(body.dimension ? { dimension: body.dimension } : {}),
          packageWeight: body.packageWeight,
        },
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: "032c65b73bb96c49c78809a6155de5a56d9d967956c448c6cca5f81defbfd690",
        },
      },
    };

    // Cloudflare blocks both Node.js fetch (TLS fingerprint) and curl (datacenter IP) on Railway.
    // Route through the Playwright Chromium browser — Chrome's TLS fingerprint and same-origin
    // fetch pass Cloudflare without challenge.
    const browser = await browserManager.getBrowser();
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "en-US",
    });

    // Restore stored browser session cookies (written by MercariPlaywrightService after each job)
    if (connection.refreshToken) {
      try {
        const cookies = JSON.parse(connection.refreshToken) as Parameters<
          typeof context.addCookies
        >[0];
        await context.addCookies(cookies);
      } catch {
        // malformed — proceed without; may hit Cloudflare challenge
      }
    }

    const page = await context.newPage();
    let json: any;

    try {
      // Navigate to Mercari to establish Cloudflare clearance before making the API call
      await page.goto("https://www.mercari.com/", {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });

      // Run fetch from inside Chrome — same-origin, real browser TLS fingerprint
      const result = await page.evaluate(
        async ({ token, payload }: { token: string; payload: object }) => {
          const res = await fetch("/v1/api", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          });
          return { status: res.status, text: await res.text() };
        },
        { token: connection.accessToken, payload: gqlBody }
      );

      if (result.status === 401 || result.status === 403) {
        fastify.log.warn("Mercari shipping: auth error %d", result.status);
        return reply.status(422).send({
          success: false,
          error: "Mercari session expired. Please reconnect your Mercari account.",
        });
      }

      try {
        json = JSON.parse(result.text);
      } catch {
        fastify.log.warn("Mercari returned non-JSON (status %d): %s", result.status, result.text.slice(0, 300));
        return reply.status(502).send({ success: false, error: "Unexpected response from Mercari" });
      }

      // Persist any new Cloudflare cookies for the next request
      const updatedCookies = await context.cookies();
      await fastify.prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { refreshToken: JSON.stringify(updatedCookies) },
      });
    } catch (err) {
      fastify.log.warn("Mercari browser request failed: %s", (err as Error).message);
      return reply.status(502).send({ success: false, error: "Failed to reach Mercari shipping API" });
    } finally {
      await context.close();
    }

    // GraphQL always returns HTTP 200; real errors live inside the body
    if (json?.errors?.length) {
      const msg: string = json.errors[0]?.message ?? "Mercari API error";
      fastify.log.warn("Mercari shipping API error: %s", msg);
      return reply.status(502).send({ success: false, error: `Mercari: ${msg}` });
    }

    return reply.send({ success: true, data: json });
  });
}
