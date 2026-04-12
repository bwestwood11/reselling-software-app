import cron from "node-cron";
import { prisma } from "@repo/db";
import { SyncService } from "../services/sync.service";

export function startSyncJob() {
  const svc = new SyncService(prisma);

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

  console.log("[sync-job] Scheduled sync job started (every 30 minutes)");
}
