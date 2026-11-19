// Who does the marketplace work for Mercari and Poshmark: our server (over the user's sticky
// Bright Data residential IP) or the user's Chrome extension.
//
// SERVER is the default whenever server automation is switched on for that marketplace. The
// user can opt back into the EXTENSION per marketplace (Settings → Marketplaces), e.g. to keep
// traffic on their own home IP. Either way the other side is a safety net:
//
//   mode       | publishes / delists                          | hourly sold check
//   -----------+----------------------------------------------+----------------------------------
//   server     | server runs the job immediately; the         | server cron sweeps; the
//              | extension's job poll is told there's nothing | extension's claim is told
//              | to do                                        | "server_mode" and skips
//   extension  | extension first; server takes over if the    | extension sweeps; the server
//              | extension is offline, or after a grace       | sweeps only if the extension
//              | period (mercari-server / poshmark-server     | hasn't for 2+ hours (browser
//              | workers)                                     | closed)
//
// The preference lives in MarketplaceConnection.metadata.automationMode, so it needs no
// migration and disappears with the connection.

import type { MarketplaceType, PrismaClient } from "@repo/db";
import { isRedisConfigured } from "../queues/redis";
import { isResidentialProxyConfigured } from "./proxy/residential-proxy";
import { mercariSoldFeedQueries } from "./marketplace/mercari-graphql";

export type AutomationMode = "server" | "extension";

export type ExtensionMarketplace = Extract<MarketplaceType, "MERCARI" | "POSHMARK">;

export const AUTOMATION_MARKETPLACES: ExtensionMarketplace[] = ["MERCARI", "POSHMARK"];

export function isAutomationMarketplace(m: MarketplaceType): m is ExtensionMarketplace {
  return (AUTOMATION_MARKETPLACES as MarketplaceType[]).includes(m);
}

/**
 * Whether the server can do this marketplace's work at all: Bright Data configured, the
 * per-marketplace switch on, and Redis for the job queue.
 */
export function isServerAutomationEnabled(marketplace: MarketplaceType): boolean {
  if (!isResidentialProxyConfigured() || !isRedisConfigured()) return false;
  if (marketplace === "MERCARI") return process.env.MERCARI_SERVER_PUBLISH === "true";
  if (marketplace === "POSHMARK") return process.env.POSHMARK_SERVER_AUTOMATION === "true";
  return false;
}

/**
 * Whether the server can also run the hourly SOLD CHECK for this marketplace. Mercari needs the
 * captured sold-feed queries (MERCARI_SOLD_FEED_QUERIES); until they're set, the extension keeps
 * sweeping Mercari even for users in server mode, so sales are never left unchecked.
 */
export function isServerSoldDetectionAvailable(marketplace: MarketplaceType): boolean {
  if (!isServerAutomationEnabled(marketplace)) return false;
  if (marketplace === "MERCARI") return mercariSoldFeedQueries().length > 0;
  return true;
}

function readMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** The user's stored preference, ignoring whether the server path is available. */
export function preferredModeFromMetadata(metadata: unknown): AutomationMode {
  return readMeta(metadata).automationMode === "extension" ? "extension" : "server";
}

/** The mode actually in effect: the user's preference, unless the server path is off. */
export function effectiveMode(marketplace: MarketplaceType, metadata: unknown): AutomationMode {
  if (!isServerAutomationEnabled(marketplace)) return "extension";
  return preferredModeFromMetadata(metadata);
}

export async function getAutomationMode(
  db: PrismaClient,
  userId: string,
  marketplace: MarketplaceType
): Promise<AutomationMode> {
  if (!isServerAutomationEnabled(marketplace)) return "extension";
  const connection = await db.marketplaceConnection.findUnique({
    where: { userId_marketplace: { userId, marketplace } },
    select: { metadata: true },
  });
  return preferredModeFromMetadata(connection?.metadata);
}

export async function setAutomationMode(
  db: PrismaClient,
  userId: string,
  marketplace: ExtensionMarketplace,
  mode: AutomationMode
): Promise<boolean> {
  const connection = await db.marketplaceConnection.findUnique({
    where: { userId_marketplace: { userId, marketplace } },
    select: { metadata: true },
  });
  if (!connection) return false;
  const meta = readMeta(connection.metadata);
  await db.marketplaceConnection.update({
    where: { userId_marketplace: { userId, marketplace } },
    data: { metadata: { ...meta, automationMode: mode } as object },
  });
  return true;
}
