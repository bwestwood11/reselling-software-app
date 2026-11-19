// Sold detection for Mercari and Poshmark (every SOLD_CHECK_INTERVAL_MINUTES), run by the SERVER over the user's sticky
// Bright Data residential IP — the no-extension counterpart of the extension's sweeps.
//
// It reuses MarketplaceStatusService for everything but the reading: the same interval claim on
// MarketplaceConnection.lastPolledAt (so the server and an extension can never both sweep the
// same hour), the same MarketplacePollRun audit trail, and the same complete() → handleSold()
// path that marks the sale and delists the item everywhere else.
//
// Cost is the whole point of how it reads. Reading every listing hourly through a paid proxy
// would be tens of GB per user per month, so both marketplaces read the seller's SOLD FEED
// instead — one small request per sweep — and only touch individual listings that show up in it:
//   • Mercari: the captured sold/in-progress GraphQL queries (MERCARI_SOLD_FEED_QUERIES).
//     Without them the run fails loudly rather than reporting "nothing sold".
//   • Poshmark: the closet's sold filter (INFERENCE), each hit confirmed through the confirmed
//     per-post GET. If the feed itself fails, a bounded number of per-post reads
//     (POSHMARK_SWEEP_MAX_POST_READS, oldest-checked first) keeps detection going at a capped cost.
//
// Who sweeps (services/automation-mode.ts): users in server mode are swept by this every interval;
// users in extension mode are swept by their extension, and by this only when the extension
// has missed its slot by an hour (browser closed — see config/sold-check.ts) — so a sale is never missed for long.

import type { MarketplaceConnection, Prisma, PrismaClient } from "@repo/db";
import {
  MarketplaceStatusService,
  type MarketplaceStatusResult,
} from "./marketplace-status.service";
import {
  AUTOMATION_MARKETPLACES,
  isServerSoldDetectionAvailable,
  preferredModeFromMetadata,
  type ExtensionMarketplace,
} from "./automation-mode";
import { MercariServerService } from "./marketplace/mercari-server.service";
import { PoshmarkServerService } from "./marketplace/poshmark-server.service";
import { extensionStaleMs } from "../config/sold-check";


/** Per-post reads allowed per sweep when the Poshmark sold feed is unavailable. */
const POSHMARK_MAX_POST_READS = Number(process.env.POSHMARK_SWEEP_MAX_POST_READS ?? 100);

/** Pages of the Poshmark sold feed read per sweep (48 posts each, newest first). */
const POSHMARK_FEED_PAGES = Number(process.env.POSHMARK_SOLD_FEED_PAGES ?? 2);

type ClaimedListing = { listingId: string; externalId: string; title: string };

export interface ServerSweepResult {
  marketplace: ExtensionMarketplace;
  swept: boolean;
  reason?: string;
  checked?: number;
  sold?: number;
  error?: string;
}

export class ServerStatusSweepService {
  private readonly status: Record<ExtensionMarketplace, MarketplaceStatusService>;
  private readonly mercari: MercariServerService;
  private readonly poshmark: PoshmarkServerService;

  constructor(private readonly db: PrismaClient) {
    this.status = {
      MERCARI: new MarketplaceStatusService(db, "MERCARI"),
      POSHMARK: new MarketplaceStatusService(db, "POSHMARK"),
    };
    this.mercari = new MercariServerService(db);
    this.poshmark = new PoshmarkServerService(db);
  }

  /** Whether the server should sweep this connection now (before the hourly claim check). */
  private shouldSweep(connection: Pick<MarketplaceConnection, "metadata" | "lastPolledAt">): boolean {
    if (preferredModeFromMetadata(connection.metadata) === "server") return true;
    const last = connection.lastPolledAt?.getTime() ?? 0;
    return Date.now() - last >= extensionStaleMs();
  }

  /**
   * Sweep one user's listings on one marketplace. `force` skips the hourly interval and the
   * extension-mode check (the manual "check now" path).
   */
  async sweep(
    userId: string,
    marketplace: ExtensionMarketplace,
    opts: { force?: boolean } = {}
  ): Promise<ServerSweepResult> {
    // Not ready (e.g. Mercari without its captured sold feed): don't claim the hour, so the
    // extension's sweep stays free to run.
    if (!isServerSoldDetectionAvailable(marketplace)) {
      return {
        marketplace,
        swept: false,
        reason: "server_sold_detection_unavailable",
        ...(opts.force
          ? { error: `Server sale detection isn't set up for ${marketplace} yet` }
          : {}),
      };
    }

    if (!opts.force) {
      const connection = await this.db.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId, marketplace } },
        select: { metadata: true, lastPolledAt: true },
      });
      if (connection && !this.shouldSweep(connection)) {
        return { marketplace, swept: false, reason: "extension_mode" };
      }
    }

    const svc = this.status[marketplace];
    const claim = await svc.claim(userId, { force: opts.force });
    if (!claim.due) return { marketplace, swept: false, reason: claim.reason };
    if (claim.listings.length === 0) return { marketplace, swept: true, checked: 0, sold: 0 };

    try {
      const results =
        marketplace === "MERCARI"
          ? await this.readMercari(userId, claim.listings)
          : await this.readPoshmark(userId, claim.listings);
      const { newlySold } = await svc.complete(userId, claim.pollRunId, results);
      return { marketplace, swept: true, checked: results.length, sold: newlySold.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server status sweep failed";
      await svc.fail(userId, claim.pollRunId, `Server sweep: ${message}`);
      return { marketplace, swept: true, error: message };
    }
  }

  private async readMercari(userId: string, listings: ClaimedListing[]): Promise<MarketplaceStatusResult[]> {
    const { ids, usedBrowser } = await this.mercari.soldFeedItemIds(userId);
    return listings.map((l) => ({
      listingId: l.listingId,
      externalId: l.externalId,
      status: ids.has(l.externalId) ? ("sold" as const) : ("active" as const),
      raw: { source: "sold_feed", usedBrowser },
    }));
  }

  private async readPoshmark(userId: string, listings: ClaimedListing[]): Promise<MarketplaceStatusResult[]> {
    const session = await this.poshmark.getSession(userId);

    let feedIds: Set<string> | null = null;
    let feedError: string | null = null;
    try {
      feedIds = new Set(await this.poshmark.soldFeedPostIds(userId, POSHMARK_FEED_PAGES, session));
    } catch (err) {
      feedError = err instanceof Error ? err.message : String(err);
      console.warn(`[server-sweep] Poshmark sold feed unavailable for ${userId}: ${feedError}`);
    }

    // Feed path: only listings that appear in the sold feed are read individually (to confirm).
    // Fallback path: read the oldest-checked listings one by one, up to the per-sweep cap; the
    // rest aren't reported, so they stay oldest-checked and go first next hour.
    const toRead = feedIds
      ? listings.filter((l) => feedIds!.has(l.externalId))
      : listings.slice(0, Math.max(0, POSHMARK_MAX_POST_READS));

    const results: MarketplaceStatusResult[] = [];
    for (const l of toRead) {
      try {
        const s = await this.poshmark.getPostStatus(userId, l.externalId, session);
        results.push({
          listingId: l.listingId,
          externalId: l.externalId,
          status: s.status,
          raw: { source: feedIds ? "sold_feed_confirmed" : "post_read", ...s.raw } as Prisma.InputJsonValue,
          ...(s.status === "error" ? { error: s.error } : {}),
        });
      } catch (err) {
        results.push({
          listingId: l.listingId,
          externalId: l.externalId,
          status: "error",
          error: err instanceof Error ? err.message : "Poshmark read failed",
        });
      }
    }

    if (feedIds) {
      const read = new Set(toRead.map((l) => l.listingId));
      for (const l of listings) {
        if (!read.has(l.listingId)) {
          results.push({
            listingId: l.listingId,
            externalId: l.externalId,
            status: "active",
            raw: { source: "sold_feed" },
          });
        }
      }
    }
    return results;
  }

  private running = false;

  /** Cron entry point: sweep every connected Mercari/Poshmark account that is due. */
  async sweepAll(): Promise<void> {
    // A slow run must not overlap the next tick (the hourly claim would stop double sweeps, but
    // two loops would still double the DB work).
    if (this.running) return;
    this.running = true;
    try {
      await this.sweepAllMarketplaces();
    } finally {
      this.running = false;
    }
  }

  private async sweepAllMarketplaces(): Promise<void> {
    for (const marketplace of AUTOMATION_MARKETPLACES) {
      if (!isServerSoldDetectionAvailable(marketplace)) continue;

      const connections = await this.db.marketplaceConnection.findMany({
        where: {
          marketplace,
          isActive: true,
          user: { listings: { some: { marketplace, status: "ACTIVE", externalId: { not: null } } } },
        },
        select: { userId: true, metadata: true, lastPolledAt: true },
      });

      let sold = 0;
      let swept = 0;
      for (const c of connections) {
        if (!this.shouldSweep(c)) continue;
        try {
          const result = await this.sweep(c.userId, marketplace);
          if (result.swept) swept++;
          sold += result.sold ?? 0;
          if (result.error) {
            console.error(`[server-sweep] ${marketplace} ${c.userId}: ${result.error}`);
          }
        } catch (err) {
          console.error(`[server-sweep] ${marketplace} ${c.userId} failed:`, err);
        }
      }
      if (swept > 0) console.log(`[server-sweep] ${marketplace}: ${swept} swept, ${sold} newly sold`);
    }
  }
}
