import cron from "node-cron";
import { prisma } from "@repo/db";
import { SyncService } from "../services/sync.service";
import { EbayStatusService } from "../services/ebay-status.service";
import { ServerStatusSweepService } from "../services/server-status-sweep.service";
import { soldCheckIntervalMinutes } from "../config/sold-check";

export function startSyncJob() {
  const svc = new SyncService(prisma);
  const ebayStatus = new EbayStatusService(prisma);
  const serverSweep = new ServerStatusSweepService(prisma);

  // Run status sync every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("[sync-job] Running scheduled sync...");
    try {
      // Only marketplaces without their own sweep need the per-listing sync (see sync.service).
      const users = await prisma.user.findMany({
        where: {
          listings: {
            some: {
              status: "ACTIVE",
              externalId: { not: null },
              marketplace: { notIn: ["EBAY", "MERCARI", "POSHMARK"] },
            },
          },
        },
        select: { id: true },
      });

      for (const user of users) {
        try {
          const result = await svc.syncAll(user.id);
          console.log(
            `[sync-job] User ${user.id}: ${result.succeeded}/${result.total} synced`
          );
        } catch (err) {
          console.error(`[sync-job] Failed for user ${user.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[sync-job] Fatal error:", err);
    }
  });

  // eBay sold-detection sweep — the server-side counterpart of the Mercari/Poshmark sweeps.
  // Ticks every 15 minutes, but each user is only swept once per SOLD_CHECK_INTERVAL_MINUTES
  // (config/sold-check.ts): the claim inside sweep() answers "not due" in between, which costs
  // one DB read and no eBay calls. Each due sweep is ~2 GetMyeBaySelling calls.
  cron.schedule("10,25,40,55 * * * *", async () => {
    try {
      const users = await prisma.marketplaceConnection.findMany({
        where: { marketplace: "EBAY", isActive: true },
        select: { userId: true },
      });

      let totalSold = 0;
      for (const { userId } of users) {
        try {
          const result = await ebayStatus.sweep(userId);
          if (!result.due) continue;
          totalSold += result.sold;
          console.log(
            `[ebay-status] User ${userId}: ${result.checked} checked, ${result.sold} sold, ` +
              `${result.ended} ended, ${result.errors} error(s)`
          );
        } catch (err) {
          console.error(`[ebay-status] Sweep failed for user ${userId}:`, err);
        }
      }

      if (totalSold > 0) {
        console.log(`[ebay-status] ${totalSold} newly sold listing(s) reconciled`);
      }
    } catch (err) {
      console.error("[ebay-status] Fatal error:", err);
    }
  });

  // Mercari/Poshmark sold detection from the server, over Bright Data (no-op unless server
  // automation is enabled). Ticks every 15 minutes because each user's interval is counted from
  // their own last sweep — the claim inside sweep() keeps it to once per
  // SOLD_CHECK_INTERVAL_MINUTES per user.
  cron.schedule("5,20,35,50 * * * *", async () => {
    try {
      await serverSweep.sweepAll();
    } catch (err) {
      console.error("[server-sweep] Fatal error:", err);
    }
  });

  console.log(
    `[sync-job] Scheduled sync job started (sync every 30 minutes; sold check every ` +
      `${soldCheckIntervalMinutes()} min per user on eBay/Mercari/Poshmark — SOLD_CHECK_INTERVAL_MINUTES)`
  );
}
