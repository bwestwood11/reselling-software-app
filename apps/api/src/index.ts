import "dotenv/config";
import { buildApp } from "./app";
import { startSyncJob } from "./jobs/sync.job";
// import { startPlaywrightWorker } from "./jobs/playwright.worker";
import { startMercariZenRowsWorker } from "./jobs/mercari-zenrows.worker";
import { seedMercariCategories } from "./jobs/mercari-categories.worker";
import { prisma } from "@repo/db";
import { MercariPlaywrightService } from "./services/playwright/mercari.playwright";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  startSyncJob();
  // startPlaywrightWorker();
  // Server-side Mercari publish fallback (only active when ZENROWS_API_KEY is set).
  startMercariZenRowsWorker();
}

// MercariPlaywrightService.testBrowser()
main();
