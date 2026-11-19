import type { PrismaClient } from "@repo/db";
import { slugify } from "@repo/utils";
import { markInventoryItemListed } from "./listing-state";

export type PoshmarkPublishOutcome =
  | { ok: true; externalId?: string | null; title?: string; via?: string }
  | { ok: false; errorMessage: string };

/**
 * Poshmark listing URLs are `/listing/{title-slug}-{postId}` — the slug is decorative (Poshmark
 * resolves by the trailing id) but real URLs always have one, so a placeholder keeps the shape
 * when the title doesn't slugify to anything.
 */
export function buildPoshmarkListingUrl(postId: string, title: string | undefined): string {
  const slug = (title && slugify(title)) || "listing";
  return `https://poshmark.com/listing/${slug}-${postId}`;
}

/**
 * Apply the result of a Poshmark PUBLISH job to its Listing. Shared by the extension's
 * PATCH /api/poshmark/jobs/:id report and the server worker (jobs/poshmark-server.worker.ts),
 * so both transports leave a listing in exactly the same state.
 */
export async function applyPoshmarkPublishOutcome(
  db: PrismaClient,
  listingId: string,
  outcome: PoshmarkPublishOutcome
): Promise<void> {
  const now = new Date();

  if (outcome.ok) {
    const externalId = outcome.externalId ?? null;
    const published = await db.listing.update({
      where: { id: listingId },
      data: {
        status: "ACTIVE",
        externalId,
        externalUrl: externalId ? buildPoshmarkListingUrl(externalId, outcome.title) : null,
        listedAt: now,
        lastSyncAt: now,
        syncError: null,
        publishAttempts: 0,
      },
    });
    await markInventoryItemListed(db, published.inventoryItemId);
    const via = outcome.via ? ` (${outcome.via})` : "";
    await db.syncEvent.create({
      data: {
        listingId,
        type: "PUBLISH",
        status: "success",
        message: externalId
          ? `Published to Poshmark${via} — listing ID: ${externalId}`
          : `Published to Poshmark${via}`,
      },
    });
    return;
  }

  await db.listing.update({
    where: { id: listingId },
    data: { status: "FAILED", syncError: outcome.errorMessage, lastSyncAt: now },
  });
  await db.syncEvent.create({
    data: { listingId, type: "ERROR", status: "failed", message: outcome.errorMessage },
  });
}
