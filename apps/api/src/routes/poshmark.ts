import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import { slugify } from "@repo/utils";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { completeExtensionDelist } from "../services/extension-delist.service";
import { markInventoryItemListed } from "../services/listing-state";
import { recordExtensionHeartbeat } from "../services/mercari-presence";
import {
  MarketplaceStatusService,
  type MarketplaceStatusResult,
} from "../services/marketplace-status.service";

/**
 * Poshmark listing URLs are `/listing/{title-slug}-{postId}` — the slug is
 * decorative (Poshmark resolves by the trailing id) but real URLs always have
 * one, so a placeholder keeps the dash-separated shape intact when the title
 * doesn't slugify to anything (e.g. all punctuation/emoji).
 */
function buildPoshmarkListingUrl(postId: string, title: string | undefined): string {
  const slug = (title && slugify(title)) || "listing";
  return `https://poshmark.com/listing/${slug}-${postId}`;
}

/** How often a held-open /jobs/pending long poll re-checks for work. Sets pickup latency. */
const POLL_TICK_MS = 750;

export async function poshmarkRoutes(fastify: FastifyInstance) {
  const statusService = new MarketplaceStatusService(fastify.prisma, "POSHMARK");

  // POST /api/poshmark/jobs — enqueue a new Poshmark crosslisting job
  fastify.post("/jobs", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const body = request.body as {
      listingId?: string;
      payload: Prisma.InputJsonValue;
    };

    if (!body?.payload) {
      return reply.status(400).send({ success: false, error: "payload is required" });
    }

    const job = await fastify.prisma.poshmarkJob.create({
      data: {
        userId: request.user!.id,
        listingId: body.listingId ?? null,
        payload: body.payload,
      },
    });

    return reply.status(201).send({ success: true, data: job });
  });

  // GET /api/poshmark/jobs/pending?wait=<seconds> — extension polls this to get the next job.
  // The poll doubles as a presence heartbeat: it proves the extension is online.
  //
  // LONG POLL: mirrors /api/mercari/jobs/pending. With `wait` set the request is held open until
  // a job appears (or the window elapses) instead of returning an empty list immediately, which
  // drops publish pickup latency to ~POLL_TICK_MS. `wait` is clamped so a client cannot pin a
  // connection open indefinitely, and the loop aborts as soon as the client disconnects.
  fastify.get("/jobs/pending", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const query = request.query as { wait?: string };
    const waitSeconds = Math.min(Math.max(Number.parseInt(query.wait ?? "0", 10) || 0, 0), 30);
    const deadline = Date.now() + waitSeconds * 1000;

    await recordExtensionHeartbeat(request.user!.id);

    const findJobs = () =>
      fastify.prisma.poshmarkJob.findMany({
        where: { userId: request.user!.id, status: "PENDING" },
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

  // GET /api/poshmark/jobs/:jobId — fetch a single job (used for status polling)
  fastify.get("/jobs/:jobId", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await fastify.prisma.poshmarkJob.findFirst({
      where: { id: jobId, userId: request.user!.id },
    });
    if (!job) return reply.status(404).send({ success: false, error: "Job not found" });
    return reply.send({ success: true, data: job });
  });

  // GET /api/poshmark/jobs — list all jobs with optional status filter
  fastify.get("/jobs", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "50", 10), 100);

    const jobs = await fastify.prisma.poshmarkJob.findMany({
      where: {
        userId: request.user!.id,
        ...(query.status ? { status: query.status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return reply.send({ success: true, data: jobs });
  });

  // PATCH /api/poshmark/jobs/:id — extension reports job outcome
  // On COMPLETED: marks the linked Listing ACTIVE and the inventory item as listed.
  // On FAILED: marks the Listing FAILED. No credit refund — cross-listing is never charged.
  // Delist jobs (payload.type === "delist") take a separate path — see extension-delist.service.
  fastify.patch("/jobs/:id", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      externalId?: string;
      errorMessage?: string;
    };

    const existing = await fastify.prisma.poshmarkJob.findFirst({
      where: { id, userId: request.user!.id },
    });
    if (!existing) {
      return reply.status(404).send({ success: false, error: "Job not found" });
    }

    const now = new Date();
    const isTerminal = body.status === "COMPLETED" || body.status === "FAILED";

    const job = await fastify.prisma.poshmarkJob.update({
      where: { id },
      data: {
        status: body.status,
        externalId: body.externalId ?? existing.externalId,
        errorMessage: body.errorMessage ?? null,
        completedAt: isTerminal ? now : existing.completedAt,
      },
    });

    const payloadObj = (existing.payload ?? {}) as Record<string, unknown>;

    // A delist job must never run the publish path below — that would mark the listing ACTIVE,
    // which is exactly backwards for a listing we just removed from Poshmark.
    if (payloadObj.type === "delist" && existing.listingId && isTerminal) {
      await completeExtensionDelist(fastify.prisma, existing.listingId, {
        ok: body.status === "COMPLETED",
        errorMessage: body.errorMessage,
      });
      return reply.send({ success: true, data: job });
    }

    if (existing.listingId && isTerminal) {
      if (body.status === "COMPLETED") {
        const published = await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: {
            status: "ACTIVE",
            externalId: body.externalId ?? null,
            externalUrl: body.externalId
              ? buildPoshmarkListingUrl(body.externalId, payloadObj.title as string | undefined)
              : null,
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
              ? `Published to Poshmark — listing ID: ${body.externalId}`
              : "Published to Poshmark",
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

  // ─── Status checking (hourly sold detection) ────────────────────────────────
  //
  // Poshmark has no webhooks, so the extension sweeps the user's active listings once an hour
  // from an authenticated poshmark.com tab. The server owns the schedule and the audit trail:
  // it decides whether a sweep is due (so two browsers don't both poll), opens a
  // MarketplacePollRun, and runs onSold() for whatever came back sold.

  // POST /api/poshmark/status-check/claim — extension asks whether a sweep is due.
  // Returns { due: false, ... } when the last poll was under an hour ago, or the listings to
  // read plus a pollRunId to report against. `force: true` skips the interval check.
  fastify.post("/status-check/claim", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const body = (request.body ?? {}) as { force?: boolean };

    await recordExtensionHeartbeat(request.user!.id);

    const result = await statusService.claim(request.user!.id, { force: body.force === true });
    return reply.send({ success: true, data: result });
  });

  // POST /api/poshmark/status-check/:pollRunId/complete — extension reports what it read.
  // The server works out which listings are NEWLY sold (sold on Poshmark, still ACTIVE for us)
  // and runs the sold-item handling, including delisting the item elsewhere.
  fastify.post(
    "/status-check/:pollRunId/complete",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { pollRunId } = request.params as { pollRunId: string };
      const body = request.body as { results?: MarketplaceStatusResult[] };

      if (!Array.isArray(body?.results)) {
        return reply.status(400).send({ success: false, error: "results[] is required" });
      }

      try {
        const result = await statusService.complete(request.user!.id, pollRunId, body.results);
        return reply.send({ success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to record status check";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // POST /api/poshmark/status-check/:pollRunId/fail — extension could not run the sweep
  // (no Poshmark tab, session expired, ...). Closes the run out so it isn't left RUNNING.
  fastify.post(
    "/status-check/:pollRunId/fail",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { pollRunId } = request.params as { pollRunId: string };
      const body = (request.body ?? {}) as { errorMessage?: string };

      const closed = await statusService.fail(request.user!.id, pollRunId, body.errorMessage);

      if (!closed) {
        return reply.status(404).send({ success: false, error: "Poll run not found" });
      }
      return reply.send({ success: true });
    }
  );

  // GET /api/poshmark/status-check/runs — recent sweeps, newest first.
  fastify.get("/status-check/runs", { preHandler: [requireAuth, requireActiveSubscription] }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Number.parseInt(query.limit ?? "20", 10) || 20, 100);
    const runs = await statusService.listRuns(request.user!.id, limit);
    return reply.send({ success: true, data: runs });
  });
}
