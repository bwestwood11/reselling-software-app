import { randomUUID } from "crypto";

// One photo scan is several requests (a scene pass, one per zoomed tile, then a merge), but it is billed
// once. POST /api/scan/start opens a session; every analyze/merge call of that scan must name it, and
// the session caps how many Gemini calls the scan may make, so tiles can't be requested for free
// outside a scan. Kept in memory: the API runs as a single instance, and a session only lives for
// a few minutes, so losing them on a restart just means the in-flight scan fails (uncharged).

const TTL_MS = 10 * 60 * 1000;

type ScanSessionState = {
  userId: string;
  expires: number;
  regionsLeft: number;
  mergesLeft: number;
  /** What the scan costs, fixed by its tier when it was opened. */
  credits: number;
  /** Set on the first successful region, so a scan that fails entirely is never charged. */
  charged: boolean;
};

const sessions = new Map<string, ScanSessionState>();

function sweep(now = Date.now()) {
  for (const [id, s] of sessions) if (s.expires <= now) sessions.delete(id);
}

export function openScanSession(userId: string, regions: number, credits: number) {
  sweep();
  const scanId = randomUUID();
  const expires = Date.now() + TTL_MS;
  sessions.set(scanId, { userId, expires, regionsLeft: regions, mergesLeft: 1, credits, charged: false });
  return { scanId, expiresAt: new Date(expires).toISOString() };
}

function activeSession(scanId: unknown, userId: string): ScanSessionState | null {
  if (typeof scanId !== "string") return null;
  const s = sessions.get(scanId);
  if (!s || s.userId !== userId) return null;
  if (s.expires <= Date.now()) {
    sessions.delete(scanId);
    return null;
  }
  return s;
}

/** Reserve one region of the scan; false when the session is unknown, expired or used up. */
export function takeScanRegion(scanId: unknown, userId: string): boolean {
  const s = activeSession(scanId, userId);
  if (!s || s.regionsLeft <= 0) return false;
  s.regionsLeft--;
  return true;
}

/** Reserve the scan's single merge call. */
export function takeScanMerge(scanId: unknown, userId: string): boolean {
  const s = activeSession(scanId, userId);
  if (!s || s.mergesLeft <= 0) return false;
  s.mergesLeft--;
  return true;
}

/** The scan's credit cost exactly once per scan (the caller deducts it), else null. */
export function claimScanCharge(scanId: string, userId: string): number | null {
  const s = activeSession(scanId, userId);
  if (!s || s.charged) return null;
  s.charged = true;
  return s.credits;
}
