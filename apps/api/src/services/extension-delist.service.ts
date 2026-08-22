import type { Listing, MarketplaceType, Prisma, PrismaClient } from "@repo/db";

/**
 * Extension-driven delisting for Mercari and Poshmark.
 *
 * Neither marketplace can be delisted from the server: Mercari puts Cloudflare Bot Management in
 * front of www.mercari.com (Node.js requests are blocked outright) and Poshmark's vm-rest API only
 * answers a real browser cookie session. Both adapters' `delist()` are therefore no-ops — see
 * services/marketplace/{mercari,poshmark}.ts.
 *
 * The browser extension already owns logged-in tabs for both sites and already long-polls
 * `/api/{mercari,poshmark}/jobs/pending` for publish work. So a delist is modelled as one more
 * job on those same queues, discriminated by `payload.type === "delist"` (the Mercari queue
 * already does this for `"fetch-addresses"`). Nothing new to poll, no new schema.
 *
 * Lifecycle of one delist:
 *   1. server: enqueueExtensionDelist() creates a PENDING job + a `pending` DELIST SyncEvent.
 *      The Listing stays ACTIVE — it is still live on the marketplace at this point, and calling
 *      it ENDED before the extension confirms would lose track of a listing we must still remove.
 *   2. extension: picks the job up on its next long poll (~750ms), runs the marketplace call.
 *   3. extension → PATCH /api/{marketplace}/jobs/:id → completeExtensionDelist() marks the
 *      Listing ENDED, writes the terminal SyncEvent, and retires the inventory item.
 */

/** Marketplaces whose delist can only run inside the browser extension. */
export const EXTENSION_DELIST_MARKETPLACES: MarketplaceType[] = ["MERCARI", "POSHMARK"];

export function isExtensionDelistMarketplace(marketplace: MarketplaceType): boolean {
  return EXTENSION_DELIST_MARKETPLACES.includes(marketplace);
}

export interface ExtensionDelistPayload {
  type: "delist";
  listingId: string;
  externalId: string;
  /** Free text shown in the extension log and the SyncEvent, e.g. "sold on POSHMARK". */
  reason: string;
}

export interface EnqueueDelistResult {
  jobId: string;
  /** true when an unfinished delist job for this listing already existed and was reused. */
  deduped: boolean;
}

/** Shape of an unfinished job row, narrowed to what the dedupe check needs. */
interface UnfinishedJob {
  id: string;
  payload: unknown;
}

/**
 * The two job tables are structurally identical but have distinct Prisma delegate types, so the
 * queue access is branched here rather than unified behind one delegate variable (a union of the
 * two delegates is not callable).
 */
async function findUnfinishedJob(
  db: PrismaClient,
  marketplace: MarketplaceType,
  userId: string,
  listingId: string
): Promise<UnfinishedJob | null> {
  const select = { id: true, payload: true };
  const orderBy = { createdAt: "desc" } as const;

  if (marketplace === "MERCARI") {
    return db.mercariJob.findFirst({
      where: { userId, listingId, status: { in: ["PENDING", "PROCESSING"] } },
      select,
      orderBy,
    });
  }
  if (marketplace === "POSHMARK") {
    return db.poshmarkJob.findFirst({
      where: { userId, listingId, status: { in: ["PENDING", "PROCESSING"] } },
      select,
      orderBy,
    });
  }
  throw new Error(`${marketplace} is not delisted through the extension`);
}

async function createDelistJob(
  db: PrismaClient,
  marketplace: MarketplaceType,
  data: { userId: string; listingId: string; externalId: string; payload: ExtensionDelistPayload }
): Promise<{ id: string }> {
  const row = {
    userId: data.userId,
    listingId: data.listingId,
    externalId: data.externalId,
    payload: data.payload as unknown as Prisma.InputJsonValue,
  };

  if (marketplace === "MERCARI") return db.mercariJob.create({ data: row, select: { id: true } });
  if (marketplace === "POSHMARK") return db.poshmarkJob.create({ data: row, select: { id: true } });
  throw new Error(`${marketplace} is not delisted through the extension`);
}

/**
 * Queue an extension-driven delist for one listing.
 *
 * Idempotent: a listing that already has an unfinished delist job queued gets that job back
 * instead of a second one, so a replayed sold-detection sweep cannot enqueue duplicates that
 * would race each other in the browser.
 */
export async function enqueueExtensionDelist(
  db: PrismaClient,
  listing: Pick<Listing, "id" | "userId" | "marketplace" | "externalId">,
  reason: string
): Promise<EnqueueDelistResult> {
  if (!listing.externalId) {
    throw new Error("Listing has no marketplace id — nothing to delist");
  }

  const existing = await findUnfinishedJob(db, listing.marketplace, listing.userId, listing.id);

  // Only an in-flight DELIST job counts as a duplicate; an in-flight publish for the same
  // listing is unrelated work and must not swallow the delist.
  if (existing && (existing.payload as { type?: string } | null)?.type === "delist") {
    return { jobId: existing.id, deduped: true };
  }

  const payload: ExtensionDelistPayload = {
    type: "delist",
    listingId: listing.id,
    externalId: listing.externalId,
    reason,
  };

  const job = await createDelistJob(db, listing.marketplace, {
    userId: listing.userId,
    listingId: listing.id,
    externalId: listing.externalId,
    payload,
  });

  await db.syncEvent.create({
    data: {
      listingId: listing.id,
      type: "DELIST",
      status: "pending",
      message: `${reason} — queued for the browser extension to delist from ${listing.marketplace}`,
      data: { jobId: job.id },
    },
  });

  return { jobId: job.id, deduped: false };
}

/**
 * Apply the extension's report for a delist job. Called from the job PATCH routes so a delist
 * job never runs the publish path (which would mark the listing ACTIVE — exactly backwards).
 *
 * On success the listing is ENDED and, if it was the last thing keeping the inventory item live,
 * the item is retired to SOLD. That retirement is deferred to here rather than done at
 * sold-detection time because the siblings are still ACTIVE while their delists are in flight.
 */
export async function completeExtensionDelist(
  db: PrismaClient,
  listingId: string,
  outcome: { ok: boolean; errorMessage?: string }
): Promise<void> {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  if (!outcome.ok) {
    const error = outcome.errorMessage ?? "Extension delist failed";
    // The listing is left ACTIVE deliberately: it is still live on the marketplace, and the
    // syncError is what surfaces it for a retry rather than hiding it as ENDED.
    await db.listing.update({
      where: { id: listingId },
      data: { syncError: error, lastSyncAt: new Date(), syncFailCount: { increment: 1 } },
    });
    await db.syncEvent.create({
      data: { listingId, type: "DELIST", status: "failed", message: error },
    });
    return;
  }

  const endedAt = new Date();
  await db.listing.update({
    where: { id: listingId },
    data: { status: "ENDED", endedAt, lastSyncAt: endedAt, syncError: null },
  });
  await db.syncEvent.create({
    data: {
      listingId,
      type: "DELIST",
      status: "success",
      message: `Delisted from ${listing.marketplace} by the browser extension`,
    },
  });

  await retireInventoryItemIfFullyDelisted(db, listing.inventoryItemId);
}

/**
 * Mark an inventory item SOLD once none of its listings are ACTIVE any more and at least one
 * of them sold. Without the "at least one sold" guard this would also fire when a user simply
 * ends every listing of an unsold item, which is not a sale.
 */
export async function retireInventoryItemIfFullyDelisted(
  db: PrismaClient,
  inventoryItemId: string
): Promise<void> {
  const stillActive = await db.listing.count({
    where: { inventoryItemId, status: "ACTIVE" },
  });
  if (stillActive > 0) return;

  const sold = await db.listing.findFirst({
    where: { inventoryItemId, status: "SOLD" },
    orderBy: { soldAt: "desc" },
  });
  if (!sold) return;

  await db.inventoryItem.updateMany({
    where: { id: inventoryItemId, status: { not: "SOLD" } },
    data: {
      status: "SOLD",
      soldPrice: sold.soldPrice ?? sold.price,
      soldAt: sold.soldAt ?? new Date(),
      soldVia: sold.marketplace as string,
    },
  });
}
