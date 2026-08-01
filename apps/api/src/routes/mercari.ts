import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import { markInventoryItemListed } from "../services/listing-state";

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}
import { getStaticShippingClasses } from "../services/mercari-shipping-static";
import { requireAuth } from "../middleware/auth";
import {
  getRootCategories,
  getChildCategories,
  searchCategories,
  getLeafCategories,
  getCategoryCount,
} from "../services/mercari-categories.service";
import {
  MercariBrowserlessService,
  CaptchaChallengeError,
  MercariLoginFailedError,
} from "../services/playwright/mercari-browserless.service";
import { recordExtensionHeartbeat } from "../services/mercari-presence";

/** How often a held-open /jobs/pending long poll re-checks for work. Sets pickup latency. */
const POLL_TICK_MS = 750;

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

    const userId = request.user!.id;

    // Publishing is extension-only — ZenRows server-side publishing is disabled (see the scope
    // note in jobs/mercari-zenrows.worker.ts). Every job is left for the extension, which
    // long-polls /jobs/pending and picks it up within ~1s.
    const job = await fastify.prisma.mercariJob.create({
      data: {
        userId,
        listingId: body.listingId ?? null,
        payload: body.payload,
        skipExtension: false,
      },
    });

    return reply.status(201).send({ success: true, data: job });
  });

  // GET /api/mercari/jobs/pending?wait=<seconds> — extension polls this to get the next job.
  // The poll doubles as a presence heartbeat: it proves the extension is online.
  //
  // LONG POLL: with `wait` set, the request is held open until a job appears (or the window
  // elapses) instead of returning an empty list immediately. That drops publish pickup latency
  // from "up to the client's poll interval" to ~POLL_TICK_MS, which is what keeps an
  // extension publish inside its end-to-end budget. `wait` is clamped so a client cannot pin a
  // connection open indefinitely, and the loop aborts as soon as the client disconnects.
  fastify.get("/jobs/pending", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { wait?: string };
    const waitSeconds = Math.min(Math.max(Number.parseInt(query.wait ?? "0", 10) || 0, 0), 30);
    const deadline = Date.now() + waitSeconds * 1000;

    await recordExtensionHeartbeat(request.user!.id);

    const findJobs = () =>
      fastify.prisma.mercariJob.findMany({
        where: { userId: request.user!.id, status: "PENDING", skipExtension: false },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

    let jobs = await findJobs();
    while (jobs.length === 0 && Date.now() < deadline) {
      // Stop early if the extension went away (tab closed, service worker evicted).
      if (request.socket.destroyed) return;
      await new Promise((r) => setTimeout(r, POLL_TICK_MS));
      jobs = await findJobs();
    }

    return reply.send({ success: true, data: jobs });
  });

  // POST /api/mercari/extension/heartbeat — explicit presence ping from the extension, so the
  // server knows it is online even when there are no pending jobs to poll for.
  fastify.post("/extension/heartbeat", { preHandler: [requireAuth] }, async (request, reply) => {
    await recordExtensionHeartbeat(request.user!.id);
    return reply.send({ success: true, data: { online: true } });
  });

  // GET /api/mercari/settings — per-user Mercari publishing preferences.
  // ZenRows publishing is disabled, so the transport is always the extension. Kept (rather than
  // removed) so older extension/web builds calling it keep working; `zenRowsAvailable` is
  // hard-false, which makes the web UI render the extension-only state.
  fastify.get("/settings", { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.send({
      success: true,
      data: { alwaysUseZenRows: false, zenRowsAvailable: false },
    });
  });

  // PATCH /api/mercari/settings — no longer configurable: there is only one publish transport.
  fastify.patch("/settings", { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.status(409).send({
      success: false,
      error: "Mercari publishing is extension-only — server-side (ZenRows) publishing is disabled",
    });
  });

  // GET /api/mercari/jobs/:jobId — fetch a single job by ID (used for polling)
  fastify.get("/jobs/:jobId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await fastify.prisma.mercariJob.findFirst({
      where: { id: jobId, userId: request.user!.id },
    });
    if (!job) return reply.status(404).send({ success: false, error: "Job not found" });
    return reply.send({ success: true, data: job });
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
  // On COMPLETED: marks the linked Listing as ACTIVE (publish jobs) or saves addresses (fetch-addresses jobs).
  // On FAILED: marks the Listing as FAILED and refunds the deducted credit (publish jobs only).
  fastify.patch("/jobs/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      externalId?: string;
      errorMessage?: string;
      addresses?: unknown[];
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

    // Handle fetch-addresses job: save addresses to the connection's metadata
    const payloadObj = (existing.payload ?? {}) as Record<string, unknown>;
    if (payloadObj.type === "fetch-addresses" && body.status === "COMPLETED" && Array.isArray(body.addresses)) {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true },
      });
      if (connection) {
        const existingMeta = parseMeta(connection.metadata);
        await fastify.prisma.marketplaceConnection.update({
          where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
          data: { metadata: { ...existingMeta, addresses: body.addresses } as any },
        });
      }
    }

    if (existing.listingId && isTerminal) {
      if (body.status === "COMPLETED") {
        const published = await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: {
            status: "ACTIVE",
            externalId: body.externalId ?? null,
            listedAt: now,
            lastSyncAt: now,
            syncError: null,
            publishAttempts: 0,
          },
        });
        await markInventoryItemListed(fastify.prisma, published.inventoryItemId);
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
      }
    }

    return reply.send({ success: true, data: job });
  });

  // POST /api/mercari/shipping/carriers — returns static shipping carriers filtered by weight/volume
  fastify.post("/shipping/carriers", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      categoryId?: number;
      packageWeight: number;
      dimension?: { length: number; width: number; height: number };
    };

    if (!body?.packageWeight || body.packageWeight <= 0) {
      return reply.status(400).send({ success: false, error: "packageWeight is required" });
    }

    const volumeCuIn = body.dimension
      ? body.dimension.length * body.dimension.width * body.dimension.height
      : 0;

    const shippingClasses = getStaticShippingClasses(body.packageWeight, volumeCuIn);

    return reply.send({
      success: true,
      data: { data: { availableShippingClassesV2: { shippingClasses } } },
    });
  });

  // POST /api/mercari/login/start — submits email/password via Browserless.
  // Returns { status: "success" } if that's all Mercari needed, or
  // { status: "otp_required" } if Mercari wants the emailed/texted verification code —
  // the client should prompt for it and call POST /api/mercari/login/verify next.
  fastify.post("/login/start", { preHandler: [requireAuth] }, async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return reply.status(400).send({ success: false, error: "email and password are required" });
    }

    try {
      const svc = new MercariBrowserlessService(fastify.prisma);
      const result = await svc.startLogin(request.user!.id, email.trim(), password);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof CaptchaChallengeError) {
        return reply.status(409).send({ success: false, error: err.message, code: "CAPTCHA_CHALLENGE" });
      }
      if (err instanceof MercariLoginFailedError) {
        return reply.status(400).send({ success: false, error: err.message });
      }
      const message = err instanceof Error ? err.message : "Mercari login failed";
      fastify.log.error({ err }, "Mercari Browserless login/start failed");
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/mercari/login/verify — completes login with the emailed/texted code
  // from a prior /login/start call that returned { status: "otp_required" }.
  fastify.post("/login/verify", { preHandler: [requireAuth] }, async (request, reply) => {
    const { code } = request.body as { code?: string };

    if (!code?.trim()) {
      return reply.status(400).send({ success: false, error: "code is required" });
    }

    try {
      const svc = new MercariBrowserlessService(fastify.prisma);
      await svc.submitOtp(request.user!.id, code.trim());
      return reply.send({ success: true, data: { connected: true } });
    } catch (err) {
      if (err instanceof MercariLoginFailedError) {
        return reply.status(400).send({ success: false, error: err.message });
      }
      const message = err instanceof Error ? err.message : "Mercari verification failed";
      fastify.log.error({ err }, "Mercari Browserless login/verify failed");
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
