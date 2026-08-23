import cron from "node-cron";
import { prisma } from "@repo/db";
import { SyncService } from "../services/sync.service";
import { EbayStatusService } from "../services/ebay-status.service";

export function startSyncJob() {
  const svc = new SyncService(prisma);
  const ebayStatus = new EbayStatusService(prisma);

  // Run status sync every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("[sync-job] Running scheduled sync...");
    try {
      const users = await prisma.user.findMany({
        where: {
          listings: { some: { status: "ACTIVE", externalId: { not: null } } },
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

  // Hourly eBay sold-detection sweep — the server-side counterpart of the extension's Mercari
  // and Poshmark sweeps. It is separate from the 30-minute sync above because it carries the
  // MarketplacePollRun audit trail and its own once-an-hour claim; running it on the sync tick
  // would either double-sweep or silently no-op every other tick.
  //
  // Users are swept one at a time on purpose: each sweep makes one eBay GetItem call per active
  // listing, and fanning that out across every user at once is what trips eBay's call limits.
  cron.schedule("15 * * * *", async () => {
    console.log("[ebay-status] Running hourly eBay sold-detection sweep...");
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

  console.log(
    "[sync-job] Scheduled sync job started (sync every 30 minutes, eBay sold-detection hourly)"
  );
}
