import type { PrismaClient, Condition, ListingStatus } from "@repo/db";
import { EbayAdapter } from "./ebay";
import { refreshConnectionIfNeeded } from "./token-refresh";

export interface ImportableItem {
  ebayItemId: string;
  title: string;
  price: number;       // USD dollars from eBay
  quantity: number;
  conditionId: number;
  categoryName: string;
  imageUrl: string | null;
  listingStatus: string;
  isImported: boolean;
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
  failed: Array<{ id: string; error: string }>;
}

export class ImportService {
  constructor(private db: PrismaClient) {}

  async getImportableListings(
    userId: string,
    status: "active" | "ended" | "sold" = "active",
    showImported = false,
    page = 1,
    limit = 50
  ): Promise<{ data: ImportableItem[]; total: number; page: number; totalPages: number }> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });

    if (!connection?.isActive) {
      throw new Error("eBay account not connected. Connect your eBay account first.");
    }

    const refreshed = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(refreshed);

    const ebayListings = await adapter.getSellerListingsByStatus(status);

    // Determine which eBay item IDs are already tracked in our DB
    const ebayIds = ebayListings.map((l) => l.itemId);
    const existingListings = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", externalId: { in: ebayIds } },
      select: { externalId: true },
    });
    const importedIds = new Set(
      existingListings.map((l) => l.externalId).filter((id): id is string => id !== null)
    );

    let items: ImportableItem[] = ebayListings.map((l) => ({
      ebayItemId: l.itemId,
      title: l.title,
      price: l.price,
      quantity: l.quantity,
      conditionId: l.conditionId,
      categoryName: l.categoryName,
      imageUrl: l.imageUrls[0] ?? null,
      listingStatus: l.listingStatus,
      isImported: importedIds.has(l.itemId),
    }));

    if (!showImported) {
      items = items.filter((i) => !i.isImported);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { data: paged, total, page, totalPages };
  }

  async importItems(userId: string, ebayItemIds: string[]): Promise<ImportResult> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });

    if (!connection?.isActive) {
      throw new Error("eBay account not connected. Connect your eBay account first.");
    }

    if (ebayItemIds.length > 100) {
      throw new Error("Cannot import more than 100 items at once");
    }

    // Server-side guard: skip any IDs already imported (race condition protection)
    const existing = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", externalId: { in: ebayItemIds } },
      select: { externalId: true },
    });
    const alreadyImported = new Set(
      existing.map((l) => l.externalId).filter((id): id is string => id !== null)
    );

    const toImport = ebayItemIds.filter((id) => !alreadyImported.has(id));
    const skipped = ebayItemIds.filter((id) => alreadyImported.has(id));
    const imported: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    const refreshed = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(refreshed);

    for (const itemId of toImport) {
      try {
        const detail = await adapter.getItemById(itemId);
        const condition = EbayAdapter.reverseMapConditionId(detail.conditionId) as Condition;
        const listingStatus = this.mapListingStatus(detail.listingStatus);

        await this.db.$transaction(async (tx) => {
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              userId,
              title: detail.title,
              description: detail.description || undefined,
              condition,
              quantity: detail.quantity,
              targetPrice: detail.price > 0 ? detail.price : undefined,
              costPrice: detail.startPrice > 0 ? detail.startPrice : undefined,
              brand: detail.brand || undefined,
              sku: detail.sku || undefined,
              category: detail.categoryName || undefined,
              status: "ACTIVE",
              images:
                detail.imageUrls.length > 0
                  ? {
                      create: detail.imageUrls.map((url, i) => ({
                        url,
                        key: `ebay:${url}`,
                        isPrimary: i === 0,
                        sortOrder: i,
                      })),
                    }
                  : undefined,
              attributes:
                detail.itemSpecifics.length > 0
                  ? { create: detail.itemSpecifics }
                  : undefined,
            },
          });

          await tx.listing.create({
            data: {
              userId,
              inventoryItemId: inventoryItem.id,
              marketplaceConnectionId: refreshed.id,
              marketplace: "EBAY",
              externalId: detail.itemId,
              externalUrl: detail.viewItemUrl || undefined,
              title: detail.title,
              price: Math.max(0, detail.price),
              status: listingStatus,
              listedAt: detail.listedAt,
              ...(listingStatus === "SOLD" && { soldAt: new Date() }),
              ...(listingStatus === "ENDED" && { endedAt: new Date() }),
            },
          });
        });

        imported.push(itemId);
      } catch (err) {
        // Prisma P2002 = unique constraint violation — item was already imported concurrently
        if ((err as any)?.code === "P2002") {
          skipped.push(itemId);
        } else {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("[ImportService] Failed to import eBay item %s: %s", itemId, message);
          failed.push({ id: itemId, error: message });
        }
      }
    }

    return { imported, skipped, failed };
  }

  private mapListingStatus(ebayStatus: string): ListingStatus {
    if (ebayStatus === "Active") return "ACTIVE";
    if (ebayStatus === "Completed") return "SOLD";
    if (ebayStatus === "Ended") return "ENDED";
    return "ACTIVE";
  }
}
