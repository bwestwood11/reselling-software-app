// Fallback publisher: publishes pending MercariJobs server-side via ZenRows when the Chrome
// extension (extension/background.js) hasn't picked them up.
//
// Uses BullMQ + Redis:
//   • scheduleMercariZenRowsFallback() enqueues a DELAYED BullMQ job (delay = grace period) when
//     a MercariJob is created. The delayed job lives in Redis, so it survives API restarts and is
//     shared across instances — and there is NO Postgres polling, so an idle database can scale
//     to zero.
//   • When the delayed job fires, the Worker re-checks the MercariJob: if the extension already
//     completed it, nothing happens; otherwise it publishes via ZenRows.
//   • BullMQ handles retries (transient Cloudflare/ZenRows failures) with exponential backoff.
//
// Enabled only when BOTH ZENROWS_API_KEY and REDIS_URL are set.

import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@repo/db";
import { getRedisConnection } from "../queues/redis";
import { markInventoryItemListed } from "../services/listing-state";
import {
  MercariZenRowsService,
  type MercariZenRowsJobPayload,
} from "../services/marketplace/mercari-zenrows.service";

const QUEUE_NAME = "mercari-zenrows-publish";
// How long to let the extension claim a job before the server takes over.
const GRACE_PERIOD_MS = Number(process.env.MERCARI_ZENROWS_GRACE_MS ?? 90_000);
const MAX_ATTEMPTS = Number(process.env.MERCARI_ZENROWS_ATTEMPTS ?? 3);
const CONCURRENCY = Number(process.env.MERCARI_ZENROWS_CONCURRENCY ?? 3);

interface FallbackJobData {
  mercariJobId: string;
}

let queue: Queue<FallbackJobData> | null = null;

function getQueue(): Queue<FallbackJobData> | null {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue<FallbackJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

/**
 * Enqueue a delayed ZenRows fallback for a newly-created MercariJob. No-op unless both
 * ZENROWS_API_KEY and REDIS_URL are configured. The BullMQ jobId is derived from the MercariJob
 * id so the same job is never enqueued twice. Fire-and-forget: enqueue failures are logged but
 * never block the request (the extension can still handle the job).
 */
export function scheduleMercariZenRowsFallback(
  jobId: string,
  delayMs: number = GRACE_PERIOD_MS
): void {
  if (!MercariZenRowsService.isConfigured()) return;
  const q = getQueue();
  if (!q) return;
  // BullMQ custom jobIds may not contain ":". The MercariJob id is a cuid, so a "mercari-" prefix
  // keeps it unique and dedups repeat enqueues of the same job.
  q.add("publish", { mercariJobId: jobId }, { delay: delayMs, jobId: `mercari-${jobId}` }).catch(
    (err) => console.error(`[mercari-zenrows] failed to enqueue fallback for ${jobId}:`, err)
  );
}

// Core processing: publish (or fetch addresses) via ZenRows. Throws on failure so BullMQ retries;
// marks the MercariJob/Listing FAILED only once attempts are exhausted.
async function processFallback(job: Job<FallbackJobData>): Promise<void> {
  const { mercariJobId } = job.data;
  const row = await prisma.mercariJob.findUnique({
    where: { id: mercariJobId },
    select: { id: true, userId: true, listingId: true, status: true, payload: true },
  });

  // Extension already handled it (or it's gone) — nothing to do.
  if (!row || row.status === "COMPLETED") return;

  // On the first attempt, only take over if the job is still PENDING — if the extension has
  // claimed it (PROCESSING) we leave it alone. On retries we already own it, so proceed.
  if (job.attemptsMade === 0) {
    const claimed = await prisma.mercariJob.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) return; // extension owns it
  } else {
    await prisma.mercariJob.update({
      where: { id: row.id },
      data: { status: "PROCESSING" },
    });
  }

  const svc = new MercariZenRowsService(prisma);
  const payloadObj = (row.payload ?? {}) as Record<string, unknown>;
  const isLastAttempt = job.attemptsMade + 1 >= MAX_ATTEMPTS;

  try {
    // ── fetch-addresses job ──────────────────────────────────────────────────
    if (payloadObj.type === "fetch-addresses") {
      const addresses = await svc.fetchDeliveryAddresses(row.userId);
      const connection = await prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: row.userId, marketplace: "MERCARI" } },
        select: { metadata: true },
      });
      const meta =
        connection?.metadata && typeof connection.metadata === "object"
          ? (connection.metadata as Record<string, unknown>)
          : {};
      await prisma.marketplaceConnection.update({
        where: { userId_marketplace: { userId: row.userId, marketplace: "MERCARI" } },
        data: { metadata: { ...meta, addresses } as any },
      });
      await prisma.mercariJob.update({
        where: { id: row.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      console.log(`[mercari-zenrows] Job ${row.id} (fetch-addresses) completed`);
      return;
    }

    // ── publish job ────────────────────────────────────────────────────────────
    const externalId = await svc.publish(
      row.payload as unknown as MercariZenRowsJobPayload,
      row.userId
    );

    const now = new Date();
    await prisma.mercariJob.update({
      where: { id: row.id },
      data: { status: "COMPLETED", externalId: externalId ?? null, completedAt: now },
    });

    if (row.listingId) {
      const published = await prisma.listing.update({
        where: { id: row.listingId },
        data: {
          status: "ACTIVE",
          externalId: externalId ?? null,
          listedAt: now,
          lastSyncAt: now,
          syncError: null,
          publishAttempts: 0,
        },
      });
      await markInventoryItemListed(prisma, published.inventoryItemId);
      await prisma.syncEvent.create({
        data: {
          listingId: row.listingId,
          type: "PUBLISH",
          status: "success",
          message: externalId
            ? `Published via ZenRows — Mercari ID: ${externalId}`
            : "Published via ZenRows",
        },
      });
    }

    console.log(`[mercari-zenrows] Job ${row.id} completed — externalId: ${externalId ?? "none"}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[mercari-zenrows] Job ${row.id} attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS} failed:`,
      errorMessage
    );

    if (isLastAttempt) {
      const now = new Date();
      await prisma.mercariJob.update({
        where: { id: row.id },
        data: { status: "FAILED", errorMessage, completedAt: now },
      });
      if (row.listingId) {
        await prisma.listing.update({
          where: { id: row.listingId },
          data: { status: "FAILED", syncError: errorMessage, lastSyncAt: now },
        });
        await prisma.syncEvent.create({
          data: {
            listingId: row.listingId,
            type: "ERROR",
            status: "failed",
            message: errorMessage,
          },
        });
      }
    }

    // Re-throw so BullMQ records the failure and schedules a retry (until attempts run out).
    throw err;
  }
}

let worker: Worker<FallbackJobData> | null = null;

export function startMercariZenRowsWorker(): void {
  if (!MercariZenRowsService.isConfigured()) {
    console.log("[mercari-zenrows] ZENROWS_API_KEY not set — server-side fallback disabled");
    return;
  }
  const connection = getRedisConnection();
  if (!connection) {
    console.log("[mercari-zenrows] REDIS_URL not set — server-side fallback disabled");
    return;
  }

  worker = new Worker<FallbackJobData>(QUEUE_NAME, processFallback, {
    connection,
    concurrency: CONCURRENCY,
  });
  worker.on("failed", (job, err) => {
    console.error(`[mercari-zenrows] job ${job?.id} failed:`, err.message);
  });

  const shutdown = () => void worker?.close();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log(
    `[mercari-zenrows] Started — BullMQ worker (grace ${Math.round(GRACE_PERIOD_MS / 1000)}s, ` +
      `${MAX_ATTEMPTS} attempts, concurrency ${CONCURRENCY})`
  );
}
