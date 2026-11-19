// Server-side Poshmark publishing + delisting over the residential proxy — the Poshmark twin of
// jobs/mercari-server.worker.ts.
//
//   • server mode (default): a new PoshmarkJob runs right away; the extension's job poll doesn't
//     see it (routes/poshmark.ts).
//   • extension mode: the extension gets first go. The server takes the job if the extension is
//     offline, or after a grace period if it is online but hasn't picked it up.
//   • The PENDING → PROCESSING compare-and-set is the same one the extension uses, so the two can
//     never both run one job.
//
// Cost guards: every byte through the proxy is metered into ProxyUsage, and publishes are capped
// per user per month (PROXY_CROSSPOST_MONTHLY_LIMIT). Delists are exempt — after a sale they must
// always go through.
//
// Enabled only when Bright Data + POSHMARK_SERVER_AUTOMATION=true + REDIS_URL are all set.

import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { prisma } from "@repo/db";
import { getRedisConnection } from "../queues/redis";
import {
  PermanentPoshmarkError,
  PoshmarkServerService,
  type PoshmarkPublishPayload,
} from "../services/marketplace/poshmark-server.service";
import { applyPoshmarkPublishOutcome } from "../services/poshmark-job-outcome";
import { completeExtensionDelist } from "../services/extension-delist.service";
import { isExtensionOnline } from "../services/mercari-presence";
import { checkCrossPostQuota } from "../services/proxy/proxy-usage.service";
import { getAutomationMode } from "../services/automation-mode";

const QUEUE_NAME = "poshmark-server";
const GRACE_PERIOD_MS = Number(process.env.POSHMARK_SERVER_GRACE_MS ?? 90_000);
const MAX_ATTEMPTS = Number(process.env.POSHMARK_SERVER_ATTEMPTS ?? 3);
const CONCURRENCY = Number(process.env.POSHMARK_SERVER_CONCURRENCY ?? 4);

interface ServerJobData {
  poshmarkJobId: string;
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
 * Hand a newly created PoshmarkJob (publish or delist) to the server worker. No-op unless server
 * automation is enabled for Poshmark. Fire-and-forget: failures are logged, never thrown — the
 * extension can still pick the job up.
 */
export function schedulePoshmarkServerJob(poshmarkJobId: string, userId: string): void {
  if (!PoshmarkServerService.isEnabled()) return;
  const q = getQueue();
  if (!q) return;

  void (async () => {
    const mode = await getAutomationMode(prisma, userId, "POSHMARK");
    const delay = mode === "extension" && (await isExtensionOnline(userId)) ? GRACE_PERIOD_MS : 0;
    await q.add("run", { poshmarkJobId }, { delay, jobId: `poshmark-server-${poshmarkJobId}` });
  })().catch((err) =>
    console.error(`[poshmark-server] failed to enqueue ${poshmarkJobId}:`, (err as Error).message)
  );
}

/** Exported for scripts/proxy/local-check.ts; the BullMQ worker is the normal caller. */
export async function processJob(job: Pick<Job<ServerJobData>, "data" | "attemptsMade">): Promise<void> {
  const row = await prisma.poshmarkJob.findUnique({ where: { id: job.data.poshmarkJobId } });
  if (!row || row.status === "COMPLETED" || row.status === "FAILED") return;

  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const isDelist = payload.type === "delist";

  if (!isDelist) {
    const quota = await checkCrossPostQuota(prisma, row.userId, "POSHMARK");
    if (!quota.allowed) {
      if (await isExtensionOnline(row.userId)) {
        console.log(`[poshmark-server] ${row.userId} over monthly cap — leaving ${row.id} for extension`);
        return;
      }
      await failJob(
        row.id,
        row.listingId,
        `Monthly server cross-post limit reached (${quota.used}/${quota.limit}). ` +
          "Open the Omventa Chrome extension to keep posting to Poshmark this month.",
        false
      );
      return;
    }
  }

  // Claim: first attempt only from PENDING (the extension may have taken it); retries own it.
  if (job.attemptsMade === 0) {
    const claimed = await prisma.poshmarkJob.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) return;
  }

  const svc = new PoshmarkServerService(prisma);
  const isLastAttempt = job.attemptsMade + 1 >= MAX_ATTEMPTS;

  try {
    if (isDelist) {
      const externalId = String(payload.externalId ?? row.externalId ?? "");
      if (!externalId) throw new PermanentPoshmarkError("Delist job has no externalId");
      await svc.delist(row.userId, externalId);
      await prisma.poshmarkJob.update({
        where: { id: row.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (row.listingId) await completeExtensionDelist(prisma, row.listingId, { ok: true, via: "server" });
      console.log(`[poshmark-server] delist ${row.id} (${externalId}) completed`);
      return;
    }

    const typed = payload as unknown as PoshmarkPublishPayload;
    const externalId = await svc.publish(row.userId, typed);
    await prisma.poshmarkJob.update({
      where: { id: row.id },
      data: { status: "COMPLETED", externalId, completedAt: new Date() },
    });
    if (row.listingId) {
      await applyPoshmarkPublishOutcome(prisma, row.listingId, {
        ok: true,
        externalId,
        title: typed.title,
        via: "server",
      });
    }
    console.log(`[poshmark-server] publish ${row.id} → ${externalId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const permanent = err instanceof PermanentPoshmarkError;
    console.error(
      `[poshmark-server] ${row.id} attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS} failed` +
        `${permanent ? " (permanent — not retrying)" : ""}:`,
      errorMessage
    );
    if (permanent || isLastAttempt) await failJob(row.id, row.listingId, errorMessage, isDelist);
    if (permanent) throw new UnrecoverableError(errorMessage);
    throw err;
  }
}

async function failJob(
  jobId: string,
  listingId: string | null,
  errorMessage: string,
  isDelist: boolean
): Promise<void> {
  await prisma.poshmarkJob.update({
    where: { id: jobId },
    data: { status: "FAILED", errorMessage, completedAt: new Date() },
  });
  if (!listingId) return;
  if (isDelist) await completeExtensionDelist(prisma, listingId, { ok: false, errorMessage });
  else await applyPoshmarkPublishOutcome(prisma, listingId, { ok: false, errorMessage });
}

let worker: Worker<ServerJobData> | null = null;

export function startPoshmarkServerWorker(): void {
  if (!PoshmarkServerService.isEnabled()) {
    console.log(
      "[poshmark-server] disabled (needs BRIGHTDATA_* env vars, POSHMARK_SERVER_AUTOMATION=true and REDIS_URL)"
    );
    return;
  }
  const connection = getRedisConnection();
  if (!connection) return;

  worker = new Worker<ServerJobData>(QUEUE_NAME, processJob, { connection, concurrency: CONCURRENCY });
  worker.on("failed", (job, err) => {
    console.error(`[poshmark-server] job ${job?.id} failed:`, err.message);
  });

  const shutdown = () => void worker?.close();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log(
    `[poshmark-server] Started (${MAX_ATTEMPTS} attempts, concurrency ${CONCURRENCY}, ` +
      `grace ${Math.round(GRACE_PERIOD_MS / 1000)}s for users in extension mode)`
  );
}
