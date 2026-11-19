// Residential proxy configuration (Bright Data).
//
// Every server-side request to a marketplace that blocks datacenter IPs (Mercari, Poshmark) goes
// out through a US residential IP. Each (user, marketplace) pair gets its OWN sticky Bright Data
// session, so a user's account is always seen from the same IP rather than a new one per request —
// IP churn on a logged-in account is one of the fastest ways to get it flagged.
//
// Env (all optional — with none set, server-side proxying is simply off and nothing changes):
//   BRIGHTDATA_CUSTOMER_ID   e.g. hl_1a2b3c4d          (Bright Data → Proxies → zone → Access details)
//   BRIGHTDATA_ZONE          e.g. residential_omventa
//   BRIGHTDATA_PASSWORD      the zone password
//   BRIGHTDATA_HOST          default brd.superproxy.io
//   BRIGHTDATA_PORT          default 33335
//   BRIGHTDATA_COUNTRY       default us
//   BRIGHTDATA_CA_CERT       optional PEM (inline or a file path) — Bright Data's CA, needed only if
//                            your zone runs in SSL-interception mode (accounts without full KYC)
//   BRIGHTDATA_IGNORE_TLS_ERRORS=true  same situation, for Playwright (Chromium can't take a custom CA)
//
// Legacy per-marketplace vars (MERCARI_PROXY_SERVER/USERNAME/PASSWORD) are still honoured as a
// fallback so an existing deployment keeps working — but they share one IP across all users.

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { ProxyAgent } from "undici";
import type { MarketplaceType } from "@repo/db";

export interface PlaywrightProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

interface BrightDataConfig {
  customerId: string;
  zone: string;
  password: string;
  host: string;
  port: number;
  country: string;
}

function brightDataConfig(): BrightDataConfig | null {
  const customerId = process.env.BRIGHTDATA_CUSTOMER_ID?.trim();
  const zone = process.env.BRIGHTDATA_ZONE?.trim();
  const password = process.env.BRIGHTDATA_PASSWORD?.trim();
  if (!customerId || !zone || !password) return null;
  return {
    // Accept the id with or without Bright Data's "brd-customer-" prefix.
    customerId: customerId.replace(/^brd-customer-/, ""),
    zone,
    password,
    host: process.env.BRIGHTDATA_HOST?.trim() || "brd.superproxy.io",
    port: Number(process.env.BRIGHTDATA_PORT ?? 33335),
    country: (process.env.BRIGHTDATA_COUNTRY ?? "us").trim().toLowerCase(),
  };
}

/**
 * LOCAL TESTING ONLY: PROXY_LOCAL_DIRECT=true sends "proxied" traffic straight from this machine
 * (a home connection is itself a residential IP), so the server-side marketplace flows can be
 * exercised before Bright Data is bought. Ignored when NODE_ENV=production, so it can never send
 * marketplace traffic from a datacenter IP.
 */
export function isLocalDirectMode(): boolean {
  return process.env.PROXY_LOCAL_DIRECT === "true" && process.env.NODE_ENV !== "production";
}

/** True when Bright Data credentials are configured (or local-direct testing is on). */
export function isResidentialProxyConfigured(): boolean {
  return brightDataConfig() !== null || isLocalDirectMode();
}

/**
 * Stable Bright Data session id for one user on one marketplace. Bright Data keeps the same exit
 * IP for a session id for as long as that peer stays online; `rotation` lets us deliberately move
 * a user to a fresh IP (e.g. after the current one gets challenged) without changing the scheme.
 */
export function proxySessionId(userId: string, marketplace: MarketplaceType, rotation = 0): string {
  return createHash("sha256")
    .update(`${userId}:${marketplace}:${rotation}`)
    .digest("hex")
    .slice(0, 20);
}

function brightDataUsername(cfg: BrightDataConfig, sessionId: string | null): string {
  let user = `brd-customer-${cfg.customerId}-zone-${cfg.zone}`;
  if (cfg.country) user += `-country-${cfg.country}`;
  if (sessionId) user += `-session-${sessionId}`;
  return user;
}

export interface ProxyTarget {
  userId: string;
  marketplace: MarketplaceType;
  rotation?: number;
}

/** Proxy settings for a Playwright browser context, or undefined when no proxy is configured. */
export function getPlaywrightProxy(target: ProxyTarget): PlaywrightProxyConfig | undefined {
  const cfg = brightDataConfig();
  if (cfg) {
    return {
      server: `http://${cfg.host}:${cfg.port}`,
      username: brightDataUsername(
        cfg,
        proxySessionId(target.userId, target.marketplace, target.rotation)
      ),
      password: cfg.password,
    };
  }

  const server = process.env[`${target.marketplace}_PROXY_SERVER`];
  if (!server) return undefined;
  return {
    server,
    username: process.env[`${target.marketplace}_PROXY_USERNAME`] || undefined,
    password: process.env[`${target.marketplace}_PROXY_PASSWORD`] || undefined,
  };
}

/** Whether Playwright should ignore TLS errors (only for SSL-interception proxy zones). */
export function proxyIgnoresTlsErrors(): boolean {
  return process.env.BRIGHTDATA_IGNORE_TLS_ERRORS === "true";
}

let cachedCa: string | null | undefined;
function brightDataCa(): string | undefined {
  if (cachedCa !== undefined) return cachedCa ?? undefined;
  const raw = process.env.BRIGHTDATA_CA_CERT?.trim();
  if (!raw) {
    cachedCa = null;
  } else if (raw.includes("BEGIN CERTIFICATE")) {
    cachedCa = raw.replace(/\\n/g, "\n");
  } else if (existsSync(raw)) {
    cachedCa = readFileSync(raw, "utf8");
  } else {
    console.warn(`[proxy] BRIGHTDATA_CA_CERT is set but is neither a PEM nor a readable file`);
    cachedCa = null;
  }
  return cachedCa ?? undefined;
}

// One ProxyAgent per sticky session — reusing it keeps the CONNECT tunnel (and so the exit IP)
// warm across a job's several requests. Bounded so a long-running process doesn't grow forever.
const agents = new Map<string, ProxyAgent>();
const MAX_AGENTS = 500;

/**
 * An undici dispatcher that tunnels through this user's sticky residential IP, or null when no
 * Bright Data credentials are configured. Use with undici's OWN fetch (see proxy-fetch.ts).
 */
export function getProxyAgent(target: ProxyTarget): ProxyAgent | null {
  const cfg = brightDataConfig();
  if (!cfg) return null;

  const sessionId = proxySessionId(target.userId, target.marketplace, target.rotation);
  const existing = agents.get(sessionId);
  if (existing) return existing;

  if (agents.size >= MAX_AGENTS) {
    const oldestKey = agents.keys().next().value;
    if (oldestKey) {
      void agents.get(oldestKey)?.close().catch(() => {});
      agents.delete(oldestKey);
    }
  }

  const creds = `${brightDataUsername(cfg, sessionId)}:${cfg.password}`;
  const ca = brightDataCa();
  const agent = new ProxyAgent({
    uri: `http://${cfg.host}:${cfg.port}`,
    token: `Basic ${Buffer.from(creds).toString("base64")}`,
    ...(ca ? { requestTls: { ca } } : {}),
  });
  agents.set(sessionId, agent);
  return agent;
}

/** Human-readable summary for logs and test scripts — never includes the password. */
export function describeProxyConfig(): string {
  const cfg = brightDataConfig();
  if (!cfg) return "Bright Data not configured (BRIGHTDATA_CUSTOMER_ID/ZONE/PASSWORD unset)";
  return `Bright Data ${cfg.host}:${cfg.port} zone=${cfg.zone} country=${cfg.country || "any"}`;
}
