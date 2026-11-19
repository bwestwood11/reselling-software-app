// Server-side Mercari publishing + delisting over the residential proxy — so users can cross-list
// to Mercari from any device without the Chrome extension.
//
// Coexists with the extension instead of replacing it (see services/automation-mode.ts):
//   • server mode (default): every new MercariJob runs right away; the extension's job poll is
//     told there is nothing to do.
//   • extension mode: scheduleMercariServerJob() checks whether the user's extension is online
//     (Redis presence key). Online → the job is delayed by a grace period so the extension gets
//     first go. Offline → the server runs it right away.
//   • The worker claims the job with the same PENDING → PROCESSING compare-and-set the extension
//     uses, so the two can never both run one job.
//   • `fetch-addresses` jobs read the user's Mercari addresses into the connection metadata.
//
// Cost guards: every byte through the proxy is metered into ProxyUsage, and publishes are capped
// per user per month (PROXY_CROSSPOST_MONTHLY_LIMIT, default 1,000). Over the cap the job is left
// PENDING for the extension when it's online, otherwise failed with a clear message.
//
// Enabled only when Bright Data env vars + MERCARI_SERVER_PUBLISH=true + REDIS_URL are all set.

import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { prisma } from "@repo/db";
import { getRedisConnection } from "../queues/redis";
import {
  MercariServerService,
  PermanentMercariError,
} from "../services/marketplace/mercari-server.service";
import type { MercariPublishPayload } from "../services/marketplace/mercari-graphql";
import { applyMercariPublishOutcome } from "../services/mercari-job-outcome";
import { completeExtensionDelist } from "../services/extension-delist.service";
import { isExtensionOnline } from "../services/mercari-presence";
import { checkCrossPostQuota } from "../services/proxy/proxy-usage.service";
import { getAutomationMode } from "../services/automation-mode";

const QUEUE_NAME = "mercari-server";
const GRACE_PERIOD_MS = Number(process.env.MERCARI_SERVER_GRACE_MS ?? 90_000);
const MAX_ATTEMPTS = Number(process.env.MERCARI_SERVER_ATTEMPTS ?? 3);
// Each attempt may open a headless browser (Cloudflare fallback) — keep this low.
const CONCURRENCY = Number(process.env.MERCARI_SERVER_CONCURRENCY ?? 2);

interface ServerJobData {
  mercariJobId: string;
}

let queue: Queue<ServerJobData> | null = null;

function getQueue(): Queue<ServerJobData> | null {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue<ServerJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

/**
 * Hand a newly created MercariJob (publish or delist) to the server worker. No-op unless
 * server publishing is enabled. Fire-and-forget: enqueue failures are logged, never thrown —
 * the extension can still pick the job up.
 */
export function scheduleMercariServerJob(mercariJobId: string, userId: string): void {
  if (!MercariServerService.isEnabled()) return;
  const q = getQueue();
  if (!q) return;

  void (async () => {
    const mode = await getAutomationMode(prisma, userId, "MERCARI");
    const delay = mode === "extension" && (await isExtensionOnline(userId)) ? GRACE_PERIOD_MS : 0;
    await q.add("run", { mercariJobId }, { delay, jobId: `mercari-server-${mercariJobId}` });
  })().catch((err) =>
    console.error(`[mercari-server] failed to enqueue ${mercariJobId}:`, (err as Error).message)
  );
}

/** Exported for scripts/proxy/local-check.ts; the BullMQ worker is the normal caller. */
export async function processJob(job: Pick<Job<ServerJobData>, "data" | "attemptsMade">): Promise<void> {
  const row = await prisma.mercariJob.findUnique({ where: { id: job.data.mercariJobId } });
  if (!row || row.status === "COMPLETED" || row.status === "FAILED") return;

  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const isDelist = payload.type === "delist";
  const isFetchAddresses = payload.type === "fetch-addresses";

  // Fair-use cap (publishes only — delists are tiny and must always go through after a sale).
  if (!isDelist && !isFetchAddresses) {
    const quota = await checkCrossPostQuota(prisma, row.userId, "MERCARI");
    if (!quota.allowed) {
      if (await isExtensionOnline(row.userId)) {
        console.log(`[mercari-server] ${row.userId} over monthly cap — leaving ${row.id} for extension`);
        return;
      }
      const errorMessage =
        `Monthly server cross-post limit reached (${quota.used}/${quota.limit}). ` +
        `Open the Omventa Chrome extension to keep posting to Mercari this month.`;
      await failJob(row.id, row.listingId, errorMessage, false);
      return;
    }
  }

  // Claim: first attempt only from PENDING (the extension may have taken it); retries own it.
  if (job.attemptsMade === 0) {
    const claimed = await prisma.mercariJob.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) return;
  }

  const svc = new MercariServerService(prisma);
  const isLastAttempt = job.attemptsMade + 1 >= MAX_ATTEMPTS;

  try {
    if (isFetchAddresses) {
      const { addresses } = await svc.fetchDeliveryAddresses(row.userId);
      const connection = await prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: row.userId, marketplace: "MERCARI" } },
        select: { metadata: true },
      });
      if (connection) {
        const meta =
          connection.metadata && typeof connection.metadata === "object" && !Array.isArray(connection.metadata)
            ? (connection.metadata as Record<string, unknown>)
            : {};
        await prisma.marketplaceConnection.update({
          where: { userId_marketplace: { userId: row.userId, marketplace: "MERCARI" } },
          data: { metadata: { ...meta, addresses } as object },
        });
      }
      await prisma.mercariJob.update({
        where: { id: row.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      console.log(`[mercari-server] fetch-addresses ${row.id} completed (${addresses.length})`);
      return;
    }

    if (isDelist) {
      const externalId = String(payload.externalId ?? "");
      if (!externalId) throw new PermanentMercariError("Delist job has no externalId");
      await svc.delist(row.userId, externalId);
      await prisma.mercariJob.update({
        where: { id: row.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (row.listingId) await completeExtensionDelist(prisma, row.listingId, { ok: true, via: "server" });
      console.log(`[mercari-server] delist ${row.id} (${externalId}) completed`);
      return;
    }

    const result = await svc.publish(row.userId, payload as unknown as MercariPublishPayload);
    await prisma.mercariJob.update({
      where: { id: row.id },
      data: { status: "COMPLETED", externalId: result.externalId, completedAt: new Date() },
    });
    if (row.listingId) {
      await applyMercariPublishOutcome(prisma, row.listingId, {
        ok: true,
        externalId: result.externalId,
        via: "server",
      });
    }
    console.log(
      `[mercari-server] publish ${row.id} → ${result.externalId} ` +
        `(photos ${Math.round(result.photoBytesOriginal / 1024)}KB → ` +
        `${Math.round(result.photoBytesUploaded / 1024)}KB, browser=${result.usedBrowser})`
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const permanent = err instanceof PermanentMercariError;
    console.error(
      `[mercari-server] ${row.id} attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS} failed` +
        `${permanent ? " (permanent — not retrying)" : ""}:`,
      errorMessage
    );
    if (permanent || isLastAttempt) {
      if (isFetchAddresses) {
        await prisma.mercariJob.update({
          where: { id: row.id },
          data: { status: "FAILED", errorMessage, completedAt: new Date() },
        });
      } else {
        await failJob(row.id, row.listingId, errorMessage, isDelist);
      }
    }
    // A retry can't fix a permanent error and would re-upload the photos through the proxy.
    if (permanent) throw new UnrecoverableError(errorMessage);
    throw err; // let BullMQ schedule the retry
  }
}

async function failJob(
  jobId: string,
  listingId: string | null,
  errorMessage: string,
  isDelist: boolean
): Promise<void> {
  await prisma.mercariJob.update({
    where: { id: jobId },
    data: { status: "FAILED", errorMessage, completedAt: new Date() },
  });
  if (!listingId) return;
  if (isDelist) await completeExtensionDelist(prisma, listingId, { ok: false, errorMessage });
  else await applyMercariPublishOutcome(prisma, listingId, { ok: false, errorMessage });
}

let worker: Worker<ServerJobData> | null = null;

export function startMercariServerWorker(): void {
  if (!MercariServerService.isEnabled()) {
    console.log(
      "[mercari-server] disabled (needs BRIGHTDATA_* env vars and MERCARI_SERVER_PUBLISH=true)"
    );
    return;
  }
  const connection = getRedisConnection();
  if (!connection) {
    console.log("[mercari-server] REDIS_URL not set — server-side Mercari publishing disabled");
    return;
  }

  worker = new Worker<ServerJobData>(QUEUE_NAME, processJob, { connection, concurrency: CONCURRENCY });
  worker.on("failed", (job, err) => {
    console.error(`[mercari-server] job ${job?.id} failed:`, err.message);
  });

  const shutdown = () => void worker?.close();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log(
    `[mercari-server] Started (grace ${Math.round(GRACE_PERIOD_MS / 1000)}s when extension online, ` +
      `${MAX_ATTEMPTS} attempts, concurrency ${CONCURRENCY})`
  );
}
