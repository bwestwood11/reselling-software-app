import type { PrismaClient } from "@repo/db";
import { MarketplaceFactory } from "./marketplace/factory";

export class SyncService {
  constructor(private db: PrismaClient) {}

  async syncAll(userId: string) {
    const activeListings = await this.db.listing.findMany({
      where: { userId, status: "ACTIVE", externalId: { not: null } },
      include: { marketplaceConnection: true },
    });

    const results = await Promise.allSettled(
      activeListings.map((listing) => this.syncListing(listing.id, userId))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { total: activeListings.length, succeeded, failed };
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
      const adapter = MarketplaceFactory.create(
        listing.marketplace,
        listing.marketplaceConnection
      );

      const status = await adapter.checkStatus(listing.externalId);

      const updates: Record<string, unknown> = { lastSyncAt: new Date() };

      if (status.status === "sold" && listing.status !== "SOLD") {
        updates.status = "SOLD";
        updates.soldAt = new Date();

        // Mark inventory as sold if no other active listings
        const otherActive = await this.db.listing.count({
          where: {
            inventoryItemId: listing.inventoryItemId,
            status: "ACTIVE",
            id: { not: listing.id },
          },
        });
        if (otherActive === 0) {
          await this.db.inventoryItem.update({
            where: { id: listing.inventoryItemId },
            data: { status: "SOLD" },
          });
        }
      } else if (status.status === "ended" && listing.status === "ACTIVE") {
        updates.status = "ENDED";
        updates.endedAt = new Date();
      }

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
