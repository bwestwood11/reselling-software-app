import type { PrismaClient, Condition } from "@repo/db";
import { MarketplaceFactory } from "./marketplace/factory";
import { EbayAdapter } from "./marketplace/ebay";
import { refreshConnectionIfNeeded } from "./marketplace/token-refresh";
import { handleSold } from "./sold-detection.service";

function mapEbayCondition(conditionId: number): Condition {
  if (conditionId <= 1500) return "NEW_WITH_TAGS";
  if (conditionId < 3000) return "NEW_WITHOUT_TAGS";
  if (conditionId === 4000) return "VERY_GOOD";
  if (conditionId === 5000) return "GOOD";
  if (conditionId >= 6000) return "SATISFACTORY";
  return "GOOD"; // 3000 = pre-owned
}

export class SyncService {
  constructor(private db: PrismaClient) {}

  async syncAll(userId: string) {
    const activeListings = await this.db.listing.findMany({
      where: { userId, status: "ACTIVE", externalId: { not: null }, syncFailCount: { lt: 3 } },
      include: { marketplaceConnection: true },
    });

    const results = await Promise.allSettled(
      activeListings.map((listing) => this.syncListing(listing.id, userId))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { total: activeListings.length, succeeded, failed };
  }

  async importFromEbay(userId: string) {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });
    if (!connection || !connection.isActive) {
      throw new Error("eBay account not connected");
    }

    const freshConnection = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(freshConnection);
    const ebayListings = await adapter.getSellerListings();

    // Build set of already-imported external IDs to skip duplicates
    const existing = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", externalId: { not: null } },
      select: { externalId: true },
    });
    const existingIds = new Set(existing.map((l) => l.externalId!));

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of ebayListings) {
      if (existingIds.has(item.itemId)) {
        skipped++;
        continue;
      }

      try {
        const inventoryItem = await this.db.inventoryItem.create({
          data: {
            userId,
            title: item.title,
            condition: mapEbayCondition(item.conditionId),
            quantity: item.quantity,
            targetPrice: item.price,
            category: item.categoryName || undefined,
            status: "ACTIVE",
            images: item.imageUrls.length > 0
              ? {
                  create: item.imageUrls.map((url, i) => ({
                    url,
                    key: `ebay-import-${item.itemId}-${i}`,
                    isPrimary: i === 0,
                    sortOrder: i,
                  })),
                }
              : undefined,
          },
        });

        await this.db.listing.create({
          data: {
            userId,
            inventoryItemId: inventoryItem.id,
            marketplaceConnectionId: connection.id,
            marketplace: "EBAY",
            externalId: item.itemId,
            externalUrl: `https://www.ebay.com/itm/${item.itemId}`,
            status: "ACTIVE",
            price: item.price,
            title: item.title,
            listedAt: item.listedAt ?? new Date(),
            lastSyncAt: new Date(),
            marketplaceData: {
              categoryId: item.categoryId,
              importedAt: new Date().toISOString(),
            },
          },
        });

        imported++;
      } catch (err) {
        console.error(`[Import eBay] failed for item ${item.itemId}:`, err);
        errors++;
      }
    }

    return { total: ebayListings.length, imported, skipped, errors };
  }

  async syncListing(listingId: string, userId: string) {
    const listing = await this.db.listing.findFirst({
      where: { id: listingId, userId },
      include: { marketplaceConnection: true },
    });

    if (!listing?.externalId) {
      throw new Error("Listing not found or has no external ID");
    }

    try {
      const connection = await refreshConnectionIfNeeded(
        this.db,
        listing.marketplaceConnection
      );
      const adapter = MarketplaceFactory.create(listing.marketplace, connection);

      const status = await adapter.checkStatus(listing.externalId);

      const updates: Record<string, unknown> = { lastSyncAt: new Date() };

      if (status.status === "sold" && listing.status !== "SOLD") {
        // Everything a sale implies — SOLD status, the SOLD event, delisting the same item from
        // every other marketplace, retiring the inventory item — is the shared handleSold(), so
        // a sale found by this sync does exactly what one found by the hourly sweeps does.
        // It writes the status itself, so `updates` must not also set it.
        await handleSold(this.db, [
          { listingId: listing.id, soldPrice: status.soldPrice, detectedBy: "a listing sync" },
        ]);
      } else if (status.status === "ended" && listing.status === "ACTIVE") {
        updates.status = "ENDED";
        updates.endedAt = new Date();
      }

      updates.syncFailCount = 0;
      updates.syncError = null;
      await this.db.listing.update({ where: { id: listingId }, data: updates });

      await this.db.syncEvent.create({
        data: {
          listingId,
          type: "STATUS_CHECK",
          status: "success",
          message: `Status: ${status.status}`,
        },
      });

      return { id: listingId, status: status.status };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await this.db.listing.update({
        where: { id: listingId },
        data: { syncError: message, syncFailCount: { increment: 1 } },
      });
      await this.db.syncEvent.create({
        data: {
          listingId,
          type: "ERROR",
          status: "failed",
          message,
        },
      });
      throw err;
    }
  }
}
