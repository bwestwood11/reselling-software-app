// Shared Redis connection for BullMQ (queue + workers).
//
// BullMQ requires `maxRetriesPerRequest: null` on the ioredis connection. A single connection is
// reused across the queue and worker. Returns null when REDIS_URL is not configured so callers
// can degrade gracefully (fallback publishing simply stays disabled).

import { Redis } from "ioredis";

let connection: Redis | null = null;

export function getRedisConnection(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on("error", (err) => {
      console.error("[redis] connection error:", err.message);
    });
  }
  return connection;
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}
