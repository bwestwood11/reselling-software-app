import type { MarketplaceType, Prisma, PrismaClient } from "@repo/db";
import {
  enqueueExtensionDelist,
  isExtensionDelistMarketplace,
  retireInventoryItemIfFullyDelisted,
} from "./extension-delist.service";
import { MarketplaceFactory } from "./marketplace/factory";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";

/**
 * Poshmark status polling — hourly sold-detection.
 *
 * Poshmark has no webhooks and no public API, so the only way to learn that a listing sold is
 * to read each post back through an authenticated poshmark.com tab (see extension/POSHMARK.md,
 * step 5 of the publish flow: `GET /vm-rest/posts/{id}`). The extension owns the browser session,
 * so it does the reading; this service owns the schedule, the audit trail, and everything that
 * has to happen when something turns out to be sold.
 *
 * Flow:
 *   1. extension (hourly alarm) → POST /api/poshmark/status-check/claim
 *      → this service decides whether a poll is due, stamps the claim, and hands back the
 *        listings to read plus a MarketplacePollRun id.
 *   2. extension reads each post from a poshmark.com tab.
 *   3. extension → POST /api/poshmark/status-check/:pollRunId/complete with per-listing results
 *      → this service records them, works out which are NEWLY sold, and calls onSold().
 *
 * The claim is stamped on `MarketplaceConnection.lastPolledAt` at step 1, not at step 3, so a
 * user running the extension in two browsers polls once per hour in total rather than twice.
 */

/** How often a user's Poshmark listings are swept. */
export const POSHMARK_POLL_INTERVAL_MS = 60 * 60 * 1000;

/** A claimed run that never reported back is written off after this long. */
const POLL_RUN_STALE_MS = 15 * 60 * 1000;

/**
 * Marketplaces whose adapter can genuinely delist from the server. Mercari and Poshmark are
 * driven from the browser extension (Cloudflare / cookie-session walls), so a sold-elsewhere
 * delist on those is queued as an extension job instead — see delistSiblings() and
 * extension-delist.service.ts.
 */
const SERVER_SIDE_DELIST_MARKETPLACES: MarketplaceType[] = ["EBAY", "DEPOP"];

/**
 * Taking the item off sale everywhere else is the whole point of sold detection, so it is ON by
 * default. It is still irreversible on the marketplace side, so the escape hatch stays: set
 * AUTO_DELIST_ON_SOLD=false to have sales recorded and the siblings only flagged, not delisted.
 */
const AUTO_DELIST_ON_SOLD = process.env.AUTO_DELIST_ON_SOLD !== "false";

/** What the extension reports back for one listing it read. */
export interface PoshmarkStatusResult {
  listingId: string;
  externalId?: string | null;
  /** sold = Poshmark says it's no longer available; active = still live; removed = gone/404. */
  status: "active" | "sold" | "removed" | "error";
  /** Poshmark's own raw signals, kept for debugging a sweep that looked wrong. */
  raw?: Prisma.InputJsonValue;
  error?: string;
}

export interface SiblingDelistOutcome {
  listingId: string;
  marketplace: MarketplaceType;
  /**
   * delisted        — removed server-side through the marketplace adapter, listing is ENDED
   * queued_extension — a delist job is waiting for the browser extension to run it
   * failed / skipped_disabled — see the messages written to SyncEvent
   */
  result: "delisted" | "failed" | "queued_extension" | "skipped_disabled";
  /** Job id when result is queued_extension, so a caller can follow the delist. */
  jobId?: string;
  error?: string;
}

export interface OnSoldOutcome {
  listingId: string;
  marketplace: MarketplaceType;
  alreadySold: boolean;
  siblings: SiblingDelistOutcome[];
}

export class PoshmarkStatusService {
  constructor(private db: PrismaClient) {}

  /**
   * Decide whether a sweep is due and, if so, open a MarketplacePollRun and hand back the
   * listings to read. `force` bypasses the interval (used by the manual "check now" path).
   */
  async claim(userId: string, opts: { force?: boolean } = {}) {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "POSHMARK" } },
    });

    if (!connection || !connection.isActive) {
      return { due: false as const, reason: "not_connected" as const, listings: [] };
    }

    await this.reapStaleRuns(userId);

    const nextDueAt = connection.lastPolledAt
      ? new Date(connection.lastPolledAt.getTime() + POSHMARK_POLL_INTERVAL_MS)
      : new Date(0);

    if (!opts.force && nextDueAt.getTime() > Date.now()) {
      return { due: false as const, reason: "not_due" as const, nextDueAt, listings: [] };
    }

    const listings = await this.db.listing.findMany({
      where: {
        userId,
        marketplace: "POSHMARK",
        status: "ACTIVE",
        externalId: { not: null },
      },
      select: { id: true, externalId: true, title: true },
      orderBy: { lastStatusCheckAt: { sort: "asc", nulls: "first" } },
    });

    // Stamp the claim and open the run together — the stamp is what stops a second browser
    // (or a retrying alarm) from starting the same sweep a moment later.
    const [, pollRun] = await this.db.$transaction([
      this.db.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastPolledAt: new Date() },
      }),
      this.db.marketplacePollRun.create({
        data: {
          userId,
          marketplace: "POSHMARK",
          status: "RUNNING",
          requestedCount: listings.length,
        },
      }),
    ]);

    // Nothing to read — close the run out now so the audit trail still shows the poll happened.
    if (listings.length === 0) {
      await this.db.marketplacePollRun.update({
        where: { id: pollRun.id },
        data: { status: "SUCCESS", finishedAt: new Date() },
      });
    }

    return {
      due: true as const,
      pollRunId: pollRun.id,
      intervalMs: POSHMARK_POLL_INTERVAL_MS,
      listings: listings.map((l) => ({
        listingId: l.id,
        externalId: l.externalId!,
        title: l.title,
      })),
    };
  }

  /**
   * Record one sweep's results. Returns the listings that turned out to be NEWLY sold — sold on
   * Poshmark while we still had them ACTIVE — along with what onSold() did about each.
   */
  async complete(userId: string, pollRunId: string, results: PoshmarkStatusResult[]) {
    const run = await this.db.marketplacePollRun.findFirst({
      where: { id: pollRunId, userId, marketplace: "POSHMARK" },
    });
    if (!run) throw new Error("Poll run not found");

    const listings = await this.db.listing.findMany({
      where: {
        userId,
        marketplace: "POSHMARK",
        id: { in: results.map((r) => r.listingId) },
      },
      select: { id: true, status: true },
    });
    const statusById = new Map(listings.map((l) => [l.id, l.status]));

    const known = results.filter((r) => statusById.has(r.listingId));
    const checkedAt = new Date();

    await this.db.listing.updateMany({
      where: { id: { in: known.map((r) => r.listingId) } },
      data: { lastStatusCheckAt: checkedAt, statusCheckCount: { increment: 1 } },
    });

    // "Newly sold" = Poshmark says sold AND we still had it ACTIVE. Anything we already marked
    // SOLD (manually, or by a previous sweep) is skipped so onSold() never fires twice.
    const newlySoldIds = known
      .filter((r) => r.status === "sold" && statusById.get(r.listingId) === "ACTIVE")
      .map((r) => r.listingId);

    const outcomes = await this.onSold(newlySoldIds);

    const errorCount = known.filter((r) => r.status === "error").length;

    await this.db.marketplacePollRun.update({
      where: { id: run.id },
      data: {
        status: errorCount === known.length && known.length > 0 ? "FAILED" : "SUCCESS",
        finishedAt: new Date(),
        checkedCount: known.filter((r) => r.status !== "error").length,
        soldCount: newlySoldIds.length,
        errorCount,
        soldListingIds: newlySoldIds,
        data: { results: known as unknown as Prisma.InputJsonValue },
      },
    });

    return { newlySold: outcomes };
  }

  /**
   * Everything that must happen when Poshmark listings turn out to be sold while we still had
   * them listed. Idempotent: a listing already marked SOLD is reported back and otherwise left
   * alone, so replaying a sweep is harmless.
   *
   * Per listing:
   *   1. mark the Listing SOLD (soldAt, soldPrice falls back to the listed price)
   *   2. mark the InventoryItem SOLD once no other listing of it is still ACTIVE
   *   3. write a SOLD SyncEvent
   *   4. take the sibling listings on other marketplaces off sale (see delistSiblings)
   */
  async onSold(listingIds: string[]): Promise<OnSoldOutcome[]> {
    const outcomes: OnSoldOutcome[] = [];

    for (const listingId of listingIds) {
      const listing = await this.db.listing.findUnique({ where: { id: listingId } });
      if (!listing) continue;

      if (listing.status === "SOLD") {
        outcomes.push({
          listingId,
          marketplace: listing.marketplace,
          alreadySold: true,
          siblings: [],
        });
        continue;
      }

      const soldAt = new Date();
      const salePrice = Number(listing.price);

      await this.db.listing.update({
        where: { id: listingId },
        data: { status: "SOLD", soldAt, soldPrice: salePrice, lastSyncAt: soldAt, syncError: null },
      });

      await this.db.syncEvent.create({
        data: {
          listingId,
          type: "SOLD",
          status: "success",
          message: "Detected as sold on Poshmark by the hourly status check",
        },
      });

      const siblings = await this.delistSiblings(listing.id, listing.inventoryItemId, listing.userId);

      // Only retire the inventory item once nothing else is still live for it. Siblings whose
      // delist is queued for the extension are still ACTIVE here, so this is a no-op for them —
      // completeExtensionDelist() calls the same helper again when the last one comes back.
      await retireInventoryItemIfFullyDelisted(this.db, listing.inventoryItemId);

      outcomes.push({
        listingId,
        marketplace: listing.marketplace,
        alreadySold: false,
        siblings,
      });
    }

    return outcomes;
  }

  /**
   * Take the same inventory item off sale everywhere else. Gated behind AUTO_DELIST_ON_SOLD
   * because it is irreversible on the marketplace side.
   *
   * eBay and Depop are delisted directly through their adapters. Mercari and Poshmark can only
   * be delisted from the browser extension, so those are recorded as a pending DELIST event and
   * reported back as `needs_extension` rather than being silently dropped.
   */
  private async delistSiblings(
    soldListingId: string,
    inventoryItemId: string,
    userId: string
  ): Promise<SiblingDelistOutcome[]> {
    const siblings = await this.db.listing.findMany({
      where: {
        userId,
        inventoryItemId,
        status: "ACTIVE",
        id: { not: soldListingId },
      },
      include: { marketplaceConnection: true },
    });

    const outcomes: SiblingDelistOutcome[] = [];

    for (const sibling of siblings) {
      if (!AUTO_DELIST_ON_SOLD) {
        await this.db.syncEvent.create({
          data: {
            listingId: sibling.id,
            type: "DELIST",
            status: "pending",
            message:
              "Item sold on Poshmark — auto-delist is disabled (set AUTO_DELIST_ON_SOLD=true)",
          },
        });
        outcomes.push({
          listingId: sibling.id,
          marketplace: sibling.marketplace,
          result: "skipped_disabled",
        });
        continue;
      }

      // Mercari and Poshmark cannot be delisted from here — hand them to the extension, which
      // holds the logged-in browser session. enqueueExtensionDelist writes the pending
      // SyncEvent; the listing is marked ENDED when the extension reports the job COMPLETED.
      if (isExtensionDelistMarketplace(sibling.marketplace)) {
        if (!sibling.externalId) {
          const error = `${sibling.marketplace} listing has no marketplace id — cannot delist`;
          await this.db.syncEvent.create({
            data: { listingId: sibling.id, type: "DELIST", status: "failed", message: error },
          });
          outcomes.push({
            listingId: sibling.id,
            marketplace: sibling.marketplace,
            result: "failed",
            error,
          });
          continue;
        }

        try {
          const { jobId } = await enqueueExtensionDelist(
            this.db,
            sibling,
            "Item sold on Poshmark"
          );
          outcomes.push({
            listingId: sibling.id,
            marketplace: sibling.marketplace,
            result: "queued_extension",
            jobId,
          });
        } catch (err) {
          const error = err instanceof Error ? err.message : "Could not queue extension delist";
          await this.db.syncEvent.create({
            data: { listingId: sibling.id, type: "DELIST", status: "failed", message: error },
          });
          outcomes.push({
            listingId: sibling.id,
            marketplace: sibling.marketplace,
            result: "failed",
            error,
          });
        }
        continue;
      }

      if (!SERVER_SIDE_DELIST_MARKETPLACES.includes(sibling.marketplace)) {
        const error = `${sibling.marketplace} has no automated delist path`;
        await this.db.syncEvent.create({
          data: { listingId: sibling.id, type: "DELIST", status: "failed", message: error },
        });
        outcomes.push({
          listingId: sibling.id,
          marketplace: sibling.marketplace,
          result: "failed",
          error,
        });
        continue;
      }

      try {
        if (sibling.externalId) {
          const connection = await refreshConnectionIfNeeded(this.db, sibling.marketplaceConnection);
          const adapter = MarketplaceFactory.create(sibling.marketplace, connection);
          await adapter.delist(sibling.externalId);
        }

        const endedAt = new Date();
        await this.db.listing.update({
          where: { id: sibling.id },
          data: { status: "ENDED", endedAt, lastSyncAt: endedAt },
        });
        await this.db.syncEvent.create({
          data: {
            listingId: sibling.id,
            type: "DELIST",
            status: "success",
            message: "Delisted automatically — item sold on Poshmark",
          },
        });
        outcomes.push({
          listingId: sibling.id,
          marketplace: sibling.marketplace,
          result: "delisted",
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Delist failed";
        await this.db.syncEvent.create({
          data: {
            listingId: sibling.id,
            type: "DELIST",
            status: "failed",
            message: `Auto-delist after Poshmark sale failed: ${error}`,
          },
        });
        outcomes.push({
          listingId: sibling.id,
          marketplace: sibling.marketplace,
          result: "failed",
          error,
        });
      }
    }

    return outcomes;
  }

  /** Recent sweeps, newest first — powers a "last checked" readout in the dashboard. */
  async listRuns(userId: string, limit = 20) {
    return this.db.marketplacePollRun.findMany({
      where: { userId, marketplace: "POSHMARK" },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  /**
   * A claimed run whose extension never reported back (browser closed, worker evicted) would sit
   * at RUNNING forever. Write those off so the run table stays an honest record.
   */
  private async reapStaleRuns(userId: string) {
    await this.db.marketplacePollRun.updateMany({
      where: {
        userId,
        marketplace: "POSHMARK",
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - POLL_RUN_STALE_MS) },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Extension never reported results for this poll",
      },
    });
  }
}
