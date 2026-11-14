import type { PrismaClient } from "@repo/db";
import { markInventoryItemListed } from "./listing-state";

export type MercariPublishOutcome =
  | { ok: true; externalId?: string | null; via?: string }
  | { ok: false; errorMessage: string };

/**
 * Apply the result of a Mercari PUBLISH job to its Listing. Shared by the extension's
 * PATCH /api/mercari/jobs/:id report and the server-side worker (jobs/mercari-server.worker.ts),
 * so both transports leave a listing in exactly the same state.
 */
export async function applyMercariPublishOutcome(
  db: PrismaClient,
  listingId: string,
  outcome: MercariPublishOutcome
): Promise<void> {
  const now = new Date();

  if (outcome.ok) {
    const externalId = outcome.externalId ?? null;
    const published = await db.listing.update({
      where: { id: listingId },
      data: {
        status: "ACTIVE",
        externalId,
        externalUrl: externalId ? `https://www.mercari.com/us/item/${externalId}/` : null,
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
          ? `Published to Mercari${via} — listing ID: ${externalId}`
          : `Published to Mercari${via}`,
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
