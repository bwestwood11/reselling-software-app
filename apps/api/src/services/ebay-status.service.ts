import type { Prisma, PrismaClient } from "@repo/db";
import { EbayAdapter } from "./marketplace/ebay";
import { soldCheckIntervalMs } from "../config/sold-check";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";
import { handleSold, type OnSoldOutcome } from "./sold-detection.service";

/**
 * eBay status polling — scheduled sold detection (SOLD_CHECK_INTERVAL_MINUTES), run entirely on the server.
 *
 * Reads the whole store's recent activity with GetMyeBaySelling (SoldList + UnsoldList, 200
 * entries per page) instead of one GetItem per active listing. A 1,500-item store costs about
 * 2 calls an hour instead of 1,500, which keeps every user well inside the Trading API's daily
 * call limit. GetItem is only used to double-check a sale of a multi-quantity listing, where a
 * SoldList entry alone can't say whether the listing sold out.
 *
 * This is the eBay half of the same pattern Mercari and Poshmark use (see
 * marketplace-status.service.ts). The difference is who reads the marketplace: eBay has a real
 * API, so there is no extension in the loop and no claim/complete handshake — one call sweeps,
 * records and reconciles. Everything downstream of "this one sold" is the shared
 * handleSold(), so an eBay sale delists the Mercari/Poshmark/Depop copies of the same item
 * exactly the way a Poshmark sale does.
 *
 * Each sweep is still recorded as a MarketplacePollRun so the audit trail and the dashboard's
 * "last checked" readout work the same across all three marketplaces.
 */

/** How often a user's eBay listings are swept — SOLD_CHECK_INTERVAL_MINUTES (config/sold-check.ts). */
export const ebayPollIntervalMs = soldCheckIntervalMs;

/** Pause between the (rare) GetItem confirmations, so a burst of sales doesn't burst eBay. */
const EBAY_STATUS_GAP_MS = 250;

/** How far back to read on a user's first sweep — eBay's maximum. */
const FIRST_SWEEP_LOOKBACK_DAYS = 60;

/**
 * Days of SoldList/UnsoldList to read so this sweep overlaps the previous one: the time since
 * the last sweep plus a day of slack (eBay counts days in its own timezone).
 */
function lookbackDays(previousPollAt: Date | null): number {
  if (!previousPollAt) return FIRST_SWEEP_LOOKBACK_DAYS;
  const elapsedDays = (Date.now() - previousPollAt.getTime()) / 86_400_000;
  return Math.min(FIRST_SWEEP_LOOKBACK_DAYS, Math.max(2, Math.ceil(elapsedDays) + 1));
}

/** Per-listing outcome, recorded on the poll run for debugging a sweep that looked wrong. */
interface EbayStatusResult {
  listingId: string;
  externalId: string;
  status: "active" | "sold" | "ended" | "unknown" | "error";
  soldPrice?: number;
  error?: string;
}

export interface EbaySweepResult {
  /** false when eBay isn't connected, or the last sweep was under an hour ago. */
  due: boolean;
  reason?: "not_connected" | "not_due";
  nextDueAt?: Date;
  pollRunId?: string;
  checked: number;
  sold: number;
  ended: number;
  errors: number;
  newlySold: OnSoldOutcome[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class EbayStatusService {
  constructor(private db: PrismaClient) {}

  /**
   * Sweep one user's active eBay listings. `force` bypasses the once-an-hour interval, which is
   * what the manual "check now" button uses.
   */
  async sweep(userId: string, opts: { force?: boolean } = {}): Promise<EbaySweepResult> {
    const empty = { checked: 0, sold: 0, ended: 0, errors: 0, newlySold: [] };

    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });
    if (!connection || !connection.isActive) {
      return { due: false, reason: "not_connected", ...empty };
    }

    const nextDueAt = connection.lastPolledAt
      ? new Date(connection.lastPolledAt.getTime() + soldCheckIntervalMs())
      : new Date(0);
    if (!opts.force && nextDueAt.getTime() > Date.now()) {
      return { due: false, reason: "not_due", nextDueAt, ...empty };
    }

    const listings = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", status: "ACTIVE", externalId: { not: null } },
      select: { id: true, externalId: true, inventoryItem: { select: { quantity: true } } },
      orderBy: { lastStatusCheckAt: { sort: "asc", nulls: "first" } },
    });
    // Read before the claim below overwrites it — it sets how far back this sweep must look.
    const previousPollAt = connection.lastPolledAt;

    // Stamp the claim before doing any work, exactly as the extension-driven sweeps do: it is
    // what stops the cron tick and a manual "check now" from sweeping the same store twice.
    const [, pollRun] = await this.db.$transaction([
      this.db.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastPolledAt: new Date() },
      }),
      this.db.marketplacePollRun.create({
        data: {
          userId,
          marketplace: "EBAY",
          status: "RUNNING",
          requestedCount: listings.length,
        },
      }),
    ]);

    try {
      const results = await this.readListings(connection, listings, lookbackDays(previousPollAt));
      return { due: true, pollRunId: pollRun.id, ...(await this.reconcile(pollRun.id, results)) };
    } catch (err) {
      // A whole-sweep failure (expired refresh token, eBay outage) — close the run out rather
      // than leaving it RUNNING, and do not swallow it: the caller logs it.
      const message = err instanceof Error ? err.message : "eBay status sweep failed";
      await this.db.marketplacePollRun.update({
        where: { id: pollRun.id },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
      });
      throw err;
    }
  }

  /**
   * Work out each active listing's status from the store's recent SoldList/UnsoldList. One token
   * refresh and ~2 calls serve the whole sweep, however many listings the user has.
   */
  private async readListings(
    connection: Prisma.MarketplaceConnectionGetPayload<object>,
    listings: Array<{
      id: string;
      externalId: string | null;
      inventoryItem: { quantity: number } | null;
    }>,
    days: number
  ): Promise<EbayStatusResult[]> {
    if (listings.length === 0) return [];

    const fresh = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(fresh);
    const activity = await adapter.getRecentSellingActivity(days);

    const results: EbayStatusResult[] = [];
    for (const listing of listings) {
      const externalId = listing.externalId!;
      const sale = activity.sold.get(externalId);

      if (!sale) {
        results.push({
          listingId: listing.id,
          externalId,
          status: activity.unsold.has(externalId) ? "ended" : "active",
        });
        continue;
      }

      // Units left on the listing after the sale: a partial sale of a multi-quantity listing
      // leaves it live, and must not delist the copies elsewhere.
      if (sale.quantityAvailable !== undefined) {
        results.push({
          listingId: listing.id,
          externalId,
          ...(sale.quantityAvailable > 0
            ? { status: "active" as const }
            : { status: "sold" as const, soldPrice: sale.price }),
        });
        continue;
      }

      // Single-unit listing (the normal case): one sale means it's gone.
      if ((listing.inventoryItem?.quantity ?? 1) <= 1) {
        results.push({ listingId: listing.id, externalId, status: "sold", soldPrice: sale.price });
        continue;
      }

      // Multi-quantity and eBay didn't say what's left — ask about this one listing.
      try {
        const status = await adapter.checkStatus(externalId);
        results.push({
          listingId: listing.id,
          externalId,
          ...status,
          soldPrice: status.status === "sold" ? (sale.price ?? status.soldPrice) : undefined,
        });
      } catch (err) {
        results.push({
          listingId: listing.id,
          externalId,
          status: "error",
          error: err instanceof Error ? err.message : "GetItem failed",
        });
      }
      await sleep(EBAY_STATUS_GAP_MS);
    }
    return results;
  }

  /**
   * Apply what eBay said. Sold listings go through the shared handleSold() (which delists the
   * siblings); ended ones are just closed locally — an ended listing is not a sale, so it must
   * not retire the inventory item or take the copies elsewhere off sale.
   */
  private async reconcile(pollRunId: string, results: EbayStatusResult[]) {
    const checkedAt = new Date();
    if (results.length > 0) {
      await this.db.listing.updateMany({
        where: { id: { in: results.map((r) => r.listingId) } },
        data: { lastStatusCheckAt: checkedAt, statusCheckCount: { increment: 1 } },
      });
    }

    const soldInputs = results
      .filter((r) => r.status === "sold")
      .map((r) => ({
        listingId: r.listingId,
        soldPrice: r.soldPrice,
        detectedBy: "the scheduled eBay status check",
      }));

    // handleSold() is idempotent — a listing another path already marked SOLD comes back as
    // alreadySold and is left alone, so only genuinely new sales are counted here.
    const newlySold = (await handleSold(this.db, soldInputs)).filter((o) => !o.alreadySold);

    const endedIds = results.filter((r) => r.status === "ended").map((r) => r.listingId);
    if (endedIds.length > 0) {
      const endedAt = new Date();
      await this.db.listing.updateMany({
        where: { id: { in: endedIds }, status: "ACTIVE" },
        data: { status: "ENDED", endedAt, lastSyncAt: endedAt },
      });
      await this.db.syncEvent.createMany({
        data: endedIds.map((listingId) => ({
          listingId,
          type: "STATUS_CHECK" as const,
          status: "success",
          message: "eBay reports this listing has ended",
        })),
      });
    }

    // "unknown" means GetItem answered but we could not classify it, which is as much a failed
    // read as a thrown request — both are counted so a broken sweep is visible in the run row.
    const errorCount = results.filter((r) => r.status === "error" || r.status === "unknown").length;

    await this.db.marketplacePollRun.update({
      where: { id: pollRunId },
      data: {
        status: errorCount === results.length && results.length > 0 ? "FAILED" : "SUCCESS",
        finishedAt: new Date(),
        checkedCount: results.length - errorCount,
        soldCount: newlySold.length,
        errorCount,
        soldListingIds: newlySold.map((o) => o.listingId),
        data: { results: results as unknown as Prisma.InputJsonValue },
      },
    });

    return {
      checked: results.length,
      sold: newlySold.length,
      ended: endedIds.length,
      errors: errorCount,
      newlySold,
    };
  }

  /** Recent eBay sweeps, newest first. */
  async listRuns(userId: string, limit = 20) {
    return this.db.marketplacePollRun.findMany({
      where: { userId, marketplace: "EBAY" },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
