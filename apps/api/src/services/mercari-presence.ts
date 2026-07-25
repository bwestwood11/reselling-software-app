// Extension presence ("ping") tracking.
//
// The Chrome extension proves it is alive by (a) polling GET /api/mercari/jobs/pending every ~30s
// and (b) calling POST /api/mercari/extension/heartbeat. Both refresh a short-lived Redis key.
// At job-creation time the server checks this key to decide whether to let the extension try
// first (grace delay) or fall straight to ZenRows.
//
// Presence lives in Redis (not Postgres) because it is high-churn, ephemeral, and Redis is
// already required for the ZenRows fallback. When Redis is not configured the ZenRows fallback
// is disabled anyway, so the extension is the only publish path and presence is irrelevant.

import { getRedisConnection } from "../queues/redis";

// A little over two poll intervals (30s) so a single missed poll doesn't flip the extension
// to "offline". Overridable for tuning.
const PRESENCE_TTL_SECONDS = Number(process.env.MERCARI_EXTENSION_PRESENCE_TTL_SEC ?? 75);

function presenceKey(userId: string): string {
  return `mercari:ext:online:${userId}`;
}

/** Record that the extension for this user is currently online (refreshes the TTL). */
export async function recordExtensionHeartbeat(userId: string): Promise<void> {
  const redis = getRedisConnection();
  if (!redis) return;
  try {
    await redis.set(presenceKey(userId), Date.now().toString(), "EX", PRESENCE_TTL_SECONDS);
  } catch (err) {
    // Presence is best-effort — never fail the request over it.
    console.error("[mercari-presence] failed to record heartbeat:", (err as Error).message);
  }
}

/** Whether the extension for this user has pinged within the presence window. */
export async function isExtensionOnline(userId: string): Promise<boolean> {
  const redis = getRedisConnection();
  if (!redis) return false;
  try {
    return (await redis.exists(presenceKey(userId))) === 1;
  } catch (err) {
    console.error("[mercari-presence] failed to read presence:", (err as Error).message);
    // If we cannot tell, assume online so we don't spend ZenRows credits unnecessarily.
    return true;
  }
}
