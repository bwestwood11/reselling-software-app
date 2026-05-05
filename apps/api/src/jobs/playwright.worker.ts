import cron from "node-cron";
import { prisma } from "@repo/db";
import {
  MercariPlaywrightService,
  type MercariJobPayload,
} from "../services/playwright/mercari.playwright";
import { browserManager } from "../services/playwright/browser-manager";

// Number of jobs to dequeue per tick — keep low to avoid opening too many
// parallel browser pages (each page has real memory overhead).
const BATCH_SIZE = 3;

export function startPlaywrightWorker() {
  const svc = new MercariPlaywrightService(prisma);

  // Run every 2 minutes. Jobs enqueued between ticks wait at most ~2 min.
  cron.schedule("*/2 * * * *", async () => {
    const jobs = await prisma.mercariJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) return;

    console.log(`[playwright-worker] Processing ${jobs.length} pending job(s)`);

    for (const job of jobs) {
      // Claim the job — prevents double-processing if the worker overlaps
      const claimed = await prisma.mercariJob.updateMany({
        where: { id: job.id, status: "PENDING" },
        data: { status: "PROCESSING" },
      });

      if (claimed.count === 0) continue; // another process got there first

      try {
        const payload = job.payload as unknown as MercariJobPayload;
        const result = await svc.processJob(job.id, payload, job.userId);

        const now = new Date();
        await prisma.mercariJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", externalId: result.externalId ?? null, completedAt: now },
        });

        if (job.listingId) {
          await prisma.listing.update({
            where: { id: job.listingId },
            data: {
              status: "ACTIVE",
              externalId: result.externalId ?? null,
              listedAt: now,
              lastSyncAt: now,
              syncError: null,
            },
          });
          await prisma.syncEvent.create({
            data: {
              listingId: job.listingId,
              type: "PUBLISH",
              status: "success",
              message: result.externalId
                ? `Published via Playwright — Mercari ID: ${result.externalId}`
                : "Published via Playwright",
            },
          });
        }

        console.log(
          `[playwright-worker] Job ${job.id} completed — externalId: ${result.externalId ?? "none"}`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`[playwright-worker] Job ${job.id} failed:`, errorMessage);

        const now = new Date();
        await prisma.mercariJob.update({
          where: { id: job.id },
          data: { status: "FAILED", errorMessage, completedAt: now },
        });

        if (job.listingId) {
          await prisma.listing.update({
            where: { id: job.listingId },
            data: { status: "FAILED", syncError: errorMessage, lastSyncAt: now },
          });
          await prisma.syncEvent.create({
            data: {
              listingId: job.listingId,
              type: "ERROR",
              status: "failed",
              message: errorMessage,
            },
          });
        }
      }
    }
  });

  // Clean up the shared browser on process exit
  process.once("SIGTERM", () => void browserManager.close());
  process.once("SIGINT", () => void browserManager.close());

  console.log("[playwright-worker] Started (runs every 2 minutes)");
}
