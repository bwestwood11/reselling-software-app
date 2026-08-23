import type { MarketplaceType, PrismaClient } from "@repo/db";
import {
  enqueueExtensionDelist,
  isExtensionDelistMarketplace,
  retireInventoryItemIfFullyDelisted,
} from "./extension-delist.service";
import { MarketplaceFactory } from "./marketplace/factory";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";

/**
 * What happens when a listing turns out to be sold — shared by every marketplace.
 *
 * Sold detection itself differs per marketplace (Poshmark and Mercari are read by the browser
 * extension, eBay is polled server-side through its API), but everything downstream of "this one
 * sold" is identical: mark it SOLD, write the audit trail, take the same physical item off sale
 * everywhere else, and retire the inventory item. That common half lives here so the three
 * detectors cannot drift apart — a bug fixed for Poshmark is fixed for eBay in the same edit.
 */

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
const autoDelistEnabled = () => process.env.AUTO_DELIST_ON_SOLD !== "false";

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

/** One detected sale. `soldPrice` is in the same unit as `Listing.price`. */
export interface SoldListingInput {
  listingId: string;
  /** What the marketplace says it sold for. Falls back to the listed price when unknown. */
  soldPrice?: number;
  /** How it was detected, e.g. "the hourly status check" — used in the SOLD SyncEvent message. */
  detectedBy?: string;
}

/**
 * Everything that must happen when listings turn out to be sold while we still had them listed.
 * Idempotent: a listing already marked SOLD is reported back and otherwise left alone, so
 * replaying a sweep is harmless.
 *
 * Per listing:
 *   1. mark the Listing SOLD (soldAt, soldPrice falls back to the listed price)
 *   2. write a SOLD SyncEvent
 *   3. take the sibling listings on other marketplaces off sale (see delistSiblings)
 *   4. mark the InventoryItem SOLD once no other listing of it is still ACTIVE
 */
export async function handleSold(
  db: PrismaClient,
  sold: Array<SoldListingInput | string>
): Promise<OnSoldOutcome[]> {
  const outcomes: OnSoldOutcome[] = [];

  for (const entry of sold) {
    const input: SoldListingInput = typeof entry === "string" ? { listingId: entry } : entry;
    const listing = await db.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) continue;

    if (listing.status === "SOLD") {
      outcomes.push({
        listingId: listing.id,
        marketplace: listing.marketplace,
        alreadySold: true,
        siblings: [],
      });
      continue;
    }

    const soldAt = new Date();
    const salePrice = input.soldPrice ?? Number(listing.price);

    await db.listing.update({
      where: { id: listing.id },
      data: { status: "SOLD", soldAt, soldPrice: salePrice, lastSyncAt: soldAt, syncError: null },
    });

    await db.syncEvent.create({
      data: {
        listingId: listing.id,
        type: "SOLD",
        status: "success",
        message: `Detected as sold on ${listing.marketplace} by ${
          input.detectedBy ?? "the status check"
        }`,
      },
    });

    const siblings = await delistSiblings(db, listing);

    // Only retire the inventory item once nothing else is still live for it. Siblings whose
    // delist is queued for the extension are still ACTIVE here, so this is a no-op for them —
    // completeExtensionDelist() calls the same helper again when the last one comes back.
    await retireInventoryItemIfFullyDelisted(db, listing.inventoryItemId);

    outcomes.push({
      listingId: listing.id,
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
 * eBay and Depop are delisted directly through their adapters. Mercari and Poshmark can only be
 * delisted from the browser extension, so those are queued as extension jobs and reported back
 * as `queued_extension` rather than being silently dropped.
 */
async function delistSiblings(
  db: PrismaClient,
  soldListing: { id: string; userId: string; inventoryItemId: string; marketplace: MarketplaceType }
): Promise<SiblingDelistOutcome[]> {
  const siblings = await db.listing.findMany({
    where: {
      userId: soldListing.userId,
      inventoryItemId: soldListing.inventoryItemId,
      status: "ACTIVE",
      id: { not: soldListing.id },
    },
    include: { marketplaceConnection: true },
  });

  const reason = `Item sold on ${soldListing.marketplace}`;
  const outcomes: SiblingDelistOutcome[] = [];

  for (const sibling of siblings) {
    if (!autoDelistEnabled()) {
      await db.syncEvent.create({
        data: {
          listingId: sibling.id,
          type: "DELIST",
          status: "pending",
          message: `${reason} — auto-delist is disabled (set AUTO_DELIST_ON_SOLD=true)`,
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
    // holds the logged-in browser session. enqueueExtensionDelist writes the pending SyncEvent;
    // the listing is marked ENDED when the extension reports the job COMPLETED.
    if (isExtensionDelistMarketplace(sibling.marketplace)) {
      // Without a marketplace id the extension has nothing to open, and unlike the server-side
      // branch below there is no safe local-only fallback — surface it instead of losing it.
      if (!sibling.externalId) {
        const error = `${sibling.marketplace} listing has no marketplace id — cannot delist`;
        await db.syncEvent.create({
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
        const { jobId } = await enqueueExtensionDelist(db, sibling, reason);
        outcomes.push({
          listingId: sibling.id,
          marketplace: sibling.marketplace,
          result: "queued_extension",
          jobId,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Could not queue extension delist";
        await db.syncEvent.create({
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
      await db.syncEvent.create({
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
      // No externalId means it was never actually published there, so there is nothing to call
      // the adapter about — ending it locally is the whole job.
      if (sibling.externalId) {
        const connection = await refreshConnectionIfNeeded(db, sibling.marketplaceConnection);
        const adapter = MarketplaceFactory.create(sibling.marketplace, connection);
        await adapter.delist(sibling.externalId);
      }

      const endedAt = new Date();
      await db.listing.update({
        where: { id: sibling.id },
        data: { status: "ENDED", endedAt, lastSyncAt: endedAt, syncError: null },
      });
      await db.syncEvent.create({
        data: {
          listingId: sibling.id,
          type: "DELIST",
          status: "success",
          message: `Delisted automatically — ${reason.toLowerCase()}`,
        },
      });
      outcomes.push({ listingId: sibling.id, marketplace: sibling.marketplace, result: "delisted" });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Delist failed";
      await db.syncEvent.create({
        data: {
          listingId: sibling.id,
          type: "DELIST",
          status: "failed",
          message: `Auto-delist after a ${soldListing.marketplace} sale failed: ${error}`,
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
