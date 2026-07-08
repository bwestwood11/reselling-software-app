import type { PrismaClient } from "@repo/db";
import type { InventoryPrefillData } from "@repo/types";

export abstract class BasePrefillProvider {
  readonly abstract marketplace: string;

  constructor(protected db: PrismaClient) {}

  async getPrefill(itemId: string, userId: string): Promise<InventoryPrefillData> {
    // Fetch every listing regardless of status — providers also look up the item's own prior
    // listing on their own marketplace (e.g. shipping/brand/category from a DRAFT Mercari
    // listing that was never published), which should count even though it never went live.
    const item = await this.db.inventoryItem.findFirst({
      where: { id: itemId, userId },
      include: {
        attributes: true,
        listings: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!item) {
      const err = new Error("Item not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    // Best cross-marketplace reference listing: must be legitimately live (ACTIVE/PENDING),
    // prefer ACTIVE over PENDING, exclude current marketplace
    const refListing = (item.listings as any[])
      .filter((l: any) => l.marketplace !== this.marketplace && ["ACTIVE", "PENDING"].includes(l.status))
      .sort((a: any) => (a.status === "ACTIVE" ? -1 : 1))[0] as any | undefined;

    const base = this.extractBase(item as any, refListing);
    const specific = await this.extractSpecific(item as any, refListing);

    return {
      ...base,
      ...specific,
      filledFields: [...(base.filledFields ?? []), ...(specific.filledFields ?? [])],
    };
  }

  protected extractBase(
    item: any,
    refListing?: any
  ): Pick<InventoryPrefillData, "title" | "price" | "description" | "source" | "filledFields"> {
    const filledFields: string[] = [];

    const title = refListing?.title ?? item.title;
    const price =
      refListing?.price != null
        ? Number(refListing.price)
        : item.targetPrice != null
          ? Number(item.targetPrice)
          : undefined;
    const description = refListing?.description ?? item.description;
    const source: string = refListing?.marketplace ?? "INVENTORY";

    if (refListing) {
      if (refListing.title && refListing.title !== item.title) filledFields.push("title");
      if (refListing.price != null) filledFields.push("price");
      if (refListing.description && refListing.description !== item.description)
        filledFields.push("description");
    }

    return { title, price, description, source, filledFields };
  }

  protected abstract extractSpecific(
    item: any,
    refListing?: any
  ): Promise<Partial<InventoryPrefillData>>;
}
