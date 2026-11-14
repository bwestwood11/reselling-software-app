// Residential proxy metering + the monthly fair-use cap on server-side cross-posts.
//
// Bright Data bills every byte in both directions, so we record what each user actually pushes
// through it (ProxyUsage rows, one per user × marketplace × UTC month). That turns the cost model
// in the pricing plan into real numbers, and backs the fair-use cap below.

import type { MarketplaceType, PrismaClient } from "@repo/db";

/** "YYYY-MM" for the current UTC month. */
export function currentUsageMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export interface UsageDelta {
  bytes?: number;
  requests?: number;
  crossPosts?: number;
}

/**
 * Add usage to this month's row. Never throws — metering must not break a publish — but logs
 * failures so a broken meter is visible.
 */
export async function recordProxyUsage(
  db: PrismaClient,
  userId: string,
  marketplace: MarketplaceType,
  delta: UsageDelta
): Promise<void> {
  const bytes = Math.max(0, Math.round(delta.bytes ?? 0));
  const requests = Math.max(0, delta.requests ?? 0);
  const crossPosts = Math.max(0, delta.crossPosts ?? 0);
  if (bytes === 0 && requests === 0 && crossPosts === 0) return;

  const month = currentUsageMonth();
  try {
    await db.proxyUsage.upsert({
      where: { userId_marketplace_month: { userId, marketplace, month } },
      create: { userId, marketplace, month, bytes: BigInt(bytes), requests, crossPosts },
      update: {
        bytes: { increment: BigInt(bytes) },
        requests: { increment: requests },
        crossPosts: { increment: crossPosts },
      },
    });
  } catch (err) {
    console.error(
      `[proxy-usage] failed to record usage for ${userId}/${marketplace}:`,
      (err as Error).message
    );
  }
}

/**
 * Monthly cap on server-side cross-posts per marketplace. Default 1,000 — light and typical users
 * never get near it; it exists to bound the worst case (bulk-posting an entire 1,500-item closet
 * in one month through the proxy). 0 disables the cap. Lift it once photo uploads are confirmed
 * to work without the proxy (see scripts/proxy/README.md).
 */
export function crossPostMonthlyLimit(): number {
  const raw = Number(process.env.PROXY_CROSSPOST_MONTHLY_LIMIT ?? 1000);
  return Number.isFinite(raw) && raw >= 0 ? raw : 1000;
}

export interface CrossPostQuota {
  allowed: boolean;
  used: number;
  /** 0 = unlimited */
  limit: number;
}

export async function checkCrossPostQuota(
  db: PrismaClient,
  userId: string,
  marketplace: MarketplaceType
): Promise<CrossPostQuota> {
  const limit = crossPostMonthlyLimit();
  const row = await db.proxyUsage.findUnique({
    where: {
      userId_marketplace_month: { userId, marketplace, month: currentUsageMonth() },
    },
    select: { crossPosts: true },
  });
  const used = row?.crossPosts ?? 0;
  return { allowed: limit === 0 || used < limit, used, limit };
}
