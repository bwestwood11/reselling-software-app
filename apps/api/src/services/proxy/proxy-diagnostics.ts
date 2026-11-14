// Diagnostics for the residential-proxy rollout. Each test answers one go/no-go question from the
// cost plan, and is reachable two ways:
//   • locally:   pnpm --filter @repo/api proxy:<name>   (scripts/proxy/*.ts)
//   • on Railway: POST /api/internal/proxy-tests/<name>  (routes/proxy-tests.ts, token-protected)
// Option B (direct photo upload) MUST be tested on Railway: from a home PC the "direct" request
// leaves from a residential IP and would pass for the wrong reason.
//
// Nothing here creates, edits or deletes anything on a marketplace account. The Mercari tests use
// a temporary photo upload (never attached to a listing) and a read of saved delivery addresses.

import type { PrismaClient } from "@repo/db";
import sharp from "sharp";
import { fetch as undiciFetch } from "undici";
import {
  describeProxyConfig,
  getProxyAgent,
  isResidentialProxyConfigured,
} from "./residential-proxy";
import { currentUsageMonth } from "./proxy-usage.service";
import { isCloudflareChallenge, proxiedFetch } from "./proxy-fetch";
import { prepareMarketplaceImage, type PreparedImage } from "../images/marketplace-image";
import { MercariServerService } from "../marketplace/mercari-server.service";

const kb = (n: number) => Math.round(n / 1024);

// ── 1. Is Bright Data wired up, and is each user's IP sticky? ────────────────────────────

export interface ProxyCheckResult {
  configured: boolean;
  config: string;
  userA?: { ips: string[]; sticky: boolean; country?: string | null };
  userB?: { ip: string | null };
  separateIpsPerUser?: boolean;
  mercariHome?: { status: number; challenged: boolean; kb: number } | { error: string };
  poshmarkHome?: { status: number; challenged: boolean; kb: number } | { error: string };
  error?: string;
}

async function exitIp(userId: string): Promise<{ ip: string | null; country: string | null }> {
  const agent = getProxyAgent({ userId, marketplace: "MERCARI" });
  if (!agent) throw new Error("proxy not configured");
  // Bright Data's own echo endpoint reports the exit IP and its geo.
  const res = await undiciFetch("https://geo.brdtest.com/mygeo.json", {
    dispatcher: agent,
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => null)) as {
    country?: string;
    ip?: string;
    ip_version?: string;
    geo?: { country?: string };
  } | null;
  return { ip: data?.ip ?? null, country: data?.country ?? data?.geo?.country ?? null };
}

export async function checkProxy(db: PrismaClient): Promise<ProxyCheckResult> {
  const result: ProxyCheckResult = {
    configured: isResidentialProxyConfigured(),
    config: describeProxyConfig(),
  };
  if (!result.configured) return result;

  try {
    const a1 = await exitIp("diagnostic-user-a");
    const a2 = await exitIp("diagnostic-user-a");
    const a3 = await exitIp("diagnostic-user-a");
    const b = await exitIp("diagnostic-user-b");
    const ips = [a1.ip, a2.ip, a3.ip].map((ip) => ip ?? "?");
    result.userA = { ips, sticky: new Set(ips).size === 1, country: a1.country };
    result.userB = { ip: b.ip };
    result.separateIpsPerUser = Boolean(b.ip && a1.ip && b.ip !== a1.ip);
  } catch (err) {
    result.error = `Exit-IP check failed: ${(err as Error).message}`;
    return result;
  }

  for (const [key, url] of [
    ["mercariHome", "https://www.mercari.com/"],
    ["poshmarkHome", "https://poshmark.com/"],
  ] as const) {
    try {
      const res = await proxiedFetch(
        { db, userId: "diagnostic-user-a", marketplace: key === "mercariHome" ? "MERCARI" : "POSHMARK" },
        url,
        {
          skipRecord: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept: "text/html",
          },
        }
      );
      result[key] = { status: res.status, challenged: isCloudflareChallenge(res), kb: kb(res.meteredBytes) };
    } catch (err) {
      result[key] = { error: (err as Error).message };
    }
  }
  return result;
}

// ── 2. How much does compression save? ───────────────────────────────────────────────────

export interface CompressionRow {
  source: string;
  originalKb: number;
  compressedKb: number;
  savedPct: number;
  dimensions: string;
}

export async function compressionTest(inputs: Array<{ source: string; buffer: Buffer }>): Promise<{
  rows: CompressionRow[];
  totalOriginalKb: number;
  totalCompressedKb: number;
}> {
  const rows: CompressionRow[] = [];
  for (const { source, buffer } of inputs) {
    const out = await prepareMarketplaceImage(buffer);
    rows.push({
      source,
      originalKb: kb(out.originalBytes),
      compressedKb: kb(out.bytes),
      savedPct: Math.round((1 - out.bytes / out.originalBytes) * 100),
      dimensions: `${out.width}x${out.height}`,
    });
  }
  return {
    rows,
    totalOriginalKb: rows.reduce((n, r) => n + r.originalKb, 0),
    totalCompressedKb: rows.reduce((n, r) => n + r.compressedKb, 0),
  };
}

/** Photo-like 3000×4000 test image (noise + gradient, so it compresses like a real photo). */
export async function syntheticPhoto(): Promise<Buffer> {
  const width = 3000;
  const height = 4000;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const n = (Math.random() * 40) | 0;
      raw[i] = ((x / width) * 200 + n) & 255;
      raw[i + 1] = ((y / height) * 200 + n) & 255;
      raw[i + 2] = (120 + n) & 255;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

// ── 3. Option B: does a photo upload work straight from this server? ───────────────────

export interface UploadAttempt {
  mode: "direct" | "proxied";
  ok: boolean;
  ms: number;
  uploadId?: string;
  proxyKb?: number;
  error?: string;
}

export async function mercariUploadTest(
  db: PrismaClient,
  userId: string,
  modes: Array<"direct" | "proxied"> = ["direct", "proxied"]
): Promise<{ photoKb: number; attempts: UploadAttempt[]; verdict: string }> {
  const svc = new MercariServerService(db);
  const session = await svc.getSession(userId);
  const image: PreparedImage = await prepareMarketplaceImage(await syntheticPhoto());

  const attempts: UploadAttempt[] = [];
  for (const mode of modes) {
    if (mode === "proxied" && !isResidentialProxyConfigured()) {
      attempts.push({ mode, ok: false, ms: 0, error: "Bright Data not configured — skipped" });
      continue;
    }
    const before = await usageBytes(db, userId);
    const started = Date.now();
    try {
      const uploadId = await svc.uploadPreparedPhoto(userId, session, image, {
        direct: mode === "direct",
      });
      attempts.push({
        mode,
        ok: true,
        ms: Date.now() - started,
        uploadId,
        proxyKb: kb((await usageBytes(db, userId)) - before),
      });
    } catch (err) {
      attempts.push({ mode, ok: false, ms: Date.now() - started, error: (err as Error).message });
    }
  }

  const direct = attempts.find((a) => a.mode === "direct");
  const proxied = attempts.find((a) => a.mode === "proxied");
  const verdict = direct?.ok
    ? "OPTION B WORKS from this host — set MERCARI_UPLOAD_DIRECT=true (only valid if this ran on the production server, not a home PC)."
    : proxied?.ok
      ? "Option B does NOT work here — keep uploads on the proxy (MERCARI_UPLOAD_DIRECT unset). Compression still applies."
      : "Neither upload worked — check the Mercari connection token and the proxy config.";

  return { photoKb: kb(image.bytes), attempts, verdict };
}

// ── 4. Does createListing/delist traffic get past Cloudflare from the residential IP? ──

export async function mercariCloudflareTest(
  db: PrismaClient,
  userId: string
): Promise<{
  ok: boolean;
  usedBrowser?: boolean;
  addresses?: number;
  ms: number;
  proxyKb: number;
  error?: string;
  verdict: string;
}> {
  const svc = new MercariServerService(db);
  const before = await usageBytes(db, userId);
  const started = Date.now();
  try {
    const { addresses, usedBrowser } = await svc.fetchDeliveryAddresses(userId);
    const proxyKb = kb((await usageBytes(db, userId)) - before);
    return {
      ok: true,
      usedBrowser,
      addresses: addresses.length,
      ms: Date.now() - started,
      proxyKb,
      verdict: usedBrowser
        ? "Cloudflare challenged plain HTTP; the browser cleared it. Run again — the second run should NOT need the browser (clearance cookie reuse)."
        : "Plain HTTP through the residential IP passed Cloudflare — the cheap path works.",
    };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - started,
      proxyKb: kb((await usageBytes(db, userId)) - before),
      error: (err as Error).message,
      verdict:
        "Blocked. If the error is a Cloudflare challenge, the next lever is Bright Data's Scraping Browser (solves challenges) for createListing only.",
    };
  }
}

// ── 5. What is it actually costing? ──────────────────────────────────────────────────────

async function usageBytes(db: PrismaClient, userId: string): Promise<number> {
  const rows = await db.proxyUsage.findMany({
    where: { userId, month: currentUsageMonth() },
    select: { bytes: true },
  });
  return rows.reduce((n, r) => n + Number(r.bytes), 0);
}

export async function usageReport(
  db: PrismaClient,
  opts: { month?: string; pricePerGb?: number } = {}
): Promise<{
  month: string;
  pricePerGb: number;
  users: number;
  totalGb: number;
  totalCost: number;
  avgCostPerUser: number;
  top: Array<{ userId: string; marketplace: string; mb: number; requests: number; crossPosts: number; cost: number }>;
}> {
  const month = opts.month ?? currentUsageMonth();
  const pricePerGb = opts.pricePerGb ?? Number(process.env.PROXY_PRICE_PER_GB ?? 8);
  const rows = await db.proxyUsage.findMany({ where: { month }, orderBy: { bytes: "desc" } });

  const GB = 1024 ** 3;
  const totalBytes = rows.reduce((n, r) => n + Number(r.bytes), 0);
  const users = new Set(rows.map((r) => r.userId)).size;
  const totalCost = (totalBytes / GB) * pricePerGb;

  return {
    month,
    pricePerGb,
    users,
    totalGb: Number((totalBytes / GB).toFixed(3)),
    totalCost: Number(totalCost.toFixed(2)),
    avgCostPerUser: users ? Number((totalCost / users).toFixed(2)) : 0,
    top: rows.slice(0, 25).map((r) => ({
      userId: r.userId,
      marketplace: r.marketplace,
      mb: Number((Number(r.bytes) / 1024 ** 2).toFixed(1)),
      requests: r.requests,
      crossPosts: r.crossPosts,
      cost: Number(((Number(r.bytes) / GB) * pricePerGb).toFixed(2)),
    })),
  };
}
