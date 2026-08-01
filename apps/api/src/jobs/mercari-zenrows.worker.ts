// Server-side fallback for MercariJobs the Chrome extension hasn't picked up.
//
// SCOPE — address jobs ONLY. ZenRows PUBLISHING IS DISABLED: Mercari listings are created solely
// by the extension (extension/background.js), which runs in the user's own browser and therefore
// has a real US residential IP plus Cloudflare clearance. Server-side publishing could not be made
// to work: createListing is behind Cloudflare's managed challenge and the photo upload is
// US-region-gated, and ZenRows proxy mode refuses to forward the multipart upload at all
// (HTTP 422 / RESP001 "Could not get content"). `fetch-addresses` jobs are unaffected — that is a
// plain GET the ZenRows scraper API handles fine.
//
// Uses BullMQ + Redis:
//   • scheduleMercariZenRowsFallback() enqueues a DELAYED BullMQ job (delay = grace period) when
//     an address MercariJob is created. The delayed job lives in Redis, so it survives API
//     restarts and is shared across instances — and there is NO Postgres polling, so an idle
//     database can scale to zero.
//   • When the delayed job fires, the Worker re-checks the MercariJob: if the extension already
//     completed it, nothing happens; otherwise it fetches the addresses via ZenRows.
//   • BullMQ handles retries (transient Cloudflare/ZenRows failures) with exponential backoff.
//
// Enabled only when BOTH ZENROWS_API_KEY and REDIS_URL are set.

import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@repo/db";
import { getRedisConnection } from "../queues/redis";
import { MercariZenRowsService } from "../services/marketplace/mercari-zenrows.service";

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
 * Enqueue a delayed ZenRows fallback for a newly-created ADDRESS MercariJob. No-op unless both
 * ZENROWS_API_KEY and REDIS_URL are configured. The BullMQ jobId is derived from the MercariJob
 * id so the same job is never enqueued twice. Fire-and-forget: enqueue failures are logged but
 * never block the request (the extension can still handle the job).
 *
 * Do NOT call this for publish jobs — the worker refuses them (see processFallback). Mercari
 * publishing is extension-only.
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

// Core processing: fetch addresses via ZenRows. Throws on failure so BullMQ retries; marks the
// MercariJob FAILED only once attempts are exhausted. Publish jobs are rejected outright — see the
// scope note at the top of this file.
async function processFallback(job: Job<FallbackJobData>): Promise<void> {
  const { mercariJobId } = job.data;
  const row = await prisma.mercariJob.findUnique({
    where: { id: mercariJobId },
    select: { id: true, userId: true, listingId: true, status: true, payload: true },
  });

  // Extension already handled it (or it's gone) — nothing to do.
  if (!row || row.status === "COMPLETED") return;

  // ZenRows publishing is disabled: leave publish jobs PENDING for the extension. Returning
  // (rather than failing) is deliberate — the extension is the only publisher, and marking the
  // Listing FAILED here would clobber a job the user's browser can still complete.
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  if (payload.type !== "fetch-addresses") {
    console.log(
      `[mercari-zenrows] Job ${row.id} is a publish job — ZenRows publishing is disabled, ` +
        `leaving it for the extension`
    );
    return;
  }

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
  const isLastAttempt = job.attemptsMade + 1 >= MAX_ATTEMPTS;

  try {
    // ── fetch-addresses job (the only kind this worker handles) ───────────────
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
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[mercari-zenrows] Job ${row.id} attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS} failed:`,
      errorMessage
    );

    // Address jobs have no Listing attached, so there is nothing else to mark.
    if (isLastAttempt) {
      await prisma.mercariJob.update({
        where: { id: row.id },
        data: { status: "FAILED", errorMessage, completedAt: new Date() },
      });
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
