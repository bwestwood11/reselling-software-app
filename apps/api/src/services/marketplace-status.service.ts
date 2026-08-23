import type { MarketplaceType, Prisma, PrismaClient } from "@repo/db";
import { handleSold, type OnSoldOutcome } from "./sold-detection.service";

/**
 * Extension-driven status polling — hourly sold detection for Mercari and Poshmark.
 *
 * Neither marketplace can be read from the server: Poshmark's vm-rest API only answers a real
 * browser cookie session, and Cloudflare Bot Management blocks Node.js requests to
 * www.mercari.com outright. The extension owns the browser session, so it does the reading;
 * this service owns the schedule, the audit trail, and everything that has to happen when
 * something turns out to be sold (which is shared with eBay — see sold-detection.service.ts).
 *
 * Flow (identical for both marketplaces):
 *   1. extension (hourly alarm) → POST /api/{marketplace}/status-check/claim
 *      → this service decides whether a poll is due, stamps the claim, and hands back the
 *        listings to read plus a MarketplacePollRun id.
 *   2. extension reads each listing from a logged-in marketplace tab.
 *   3. extension → POST /api/{marketplace}/status-check/:pollRunId/complete with per-listing
 *      results → this service records them, works out which are NEWLY sold, and runs
 *      handleSold(), which delists the siblings.
 *
 * The claim is stamped on `MarketplaceConnection.lastPolledAt` at step 1, not at step 3, so a
 * user running the extension in two browsers polls once per hour in total rather than twice.
 */

/** How often a user's listings on one marketplace are swept. */
export const STATUS_POLL_INTERVAL_MS = 60 * 60 * 1000;

/** Back-compat alias — the Poshmark sweep was the first caller of this interval. */
export const POSHMARK_POLL_INTERVAL_MS = STATUS_POLL_INTERVAL_MS;

/** A claimed run that never reported back is written off after this long. */
const POLL_RUN_STALE_MS = 15 * 60 * 1000;

/** What the extension reports back for one listing it read. */
export interface MarketplaceStatusResult {
  listingId: string;
  externalId?: string | null;
  /** sold = the marketplace says it's no longer available; active = still live; removed = gone/404. */
  status: "active" | "sold" | "removed" | "error";
  /** The marketplace's own raw signals, kept for debugging a sweep that looked wrong. */
  raw?: Prisma.InputJsonValue;
  error?: string;
}

export class MarketplaceStatusService {
  /**
   * @param marketplace which marketplace this instance sweeps. One instance per marketplace —
   *   the claim interval, the poll runs, and the listings queried are all scoped to it.
   */
  constructor(
    private db: PrismaClient,
    private marketplace: Extract<MarketplaceType, "MERCARI" | "POSHMARK">
  ) {}

  /**
   * Decide whether a sweep is due and, if so, open a MarketplacePollRun and hand back the
   * listings to read. `force` bypasses the interval (used by the manual "check now" path).
   */
  async claim(userId: string, opts: { force?: boolean } = {}) {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: this.marketplace } },
    });

    if (!connection || !connection.isActive) {
      return { due: false as const, reason: "not_connected" as const, listings: [] };
    }

    await this.reapStaleRuns(userId);

    const nextDueAt = connection.lastPolledAt
      ? new Date(connection.lastPolledAt.getTime() + STATUS_POLL_INTERVAL_MS)
      : new Date(0);

    if (!opts.force && nextDueAt.getTime() > Date.now()) {
      return { due: false as const, reason: "not_due" as const, nextDueAt, listings: [] };
    }

    const listings = await this.db.listing.findMany({
      where: {
        userId,
        marketplace: this.marketplace,
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
          marketplace: this.marketplace,
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
      intervalMs: STATUS_POLL_INTERVAL_MS,
      listings: listings.map((l) => ({
        listingId: l.id,
        externalId: l.externalId!,
        title: l.title,
      })),
    };
  }

  /**
   * Record one sweep's results. Returns the listings that turned out to be NEWLY sold — sold on
   * the marketplace while we still had them ACTIVE — along with what handleSold() did about each.
   */
  async complete(
    userId: string,
    pollRunId: string,
    results: MarketplaceStatusResult[]
  ): Promise<{ newlySold: OnSoldOutcome[] }> {
    const run = await this.db.marketplacePollRun.findFirst({
      where: { id: pollRunId, userId, marketplace: this.marketplace },
    });
    if (!run) throw new Error("Poll run not found");

    const listings = await this.db.listing.findMany({
      where: {
        userId,
        marketplace: this.marketplace,
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

    // "Newly sold" = the marketplace says sold AND we still had it ACTIVE. Anything already
    // marked SOLD (manually, or by a previous sweep) is skipped so handleSold() never fires twice.
    const newlySoldIds = known
      .filter((r) => r.status === "sold" && statusById.get(r.listingId) === "ACTIVE")
      .map((r) => r.listingId);

    const outcomes = await handleSold(
      this.db,
      newlySoldIds.map((listingId) => ({ listingId, detectedBy: "the hourly status check" }))
    );

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

  /** Close out a run the extension could not finish (no tab, expired session, ...). */
  async fail(userId: string, pollRunId: string, errorMessage?: string): Promise<boolean> {
    const { count } = await this.db.marketplacePollRun.updateMany({
      where: {
        id: pollRunId,
        userId,
        marketplace: this.marketplace,
        status: "RUNNING",
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: errorMessage ?? "Status check failed in the extension",
      },
    });
    return count > 0;
  }

  /** Recent sweeps, newest first — powers a "last checked" readout in the dashboard. */
  async listRuns(userId: string, limit = 20) {
    return this.db.marketplacePollRun.findMany({
      where: { userId, marketplace: this.marketplace },
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
        marketplace: this.marketplace,
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
