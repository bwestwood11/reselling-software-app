import type { PrismaClient } from "@repo/db";

/**
 * Keep an inventory item's own status in step with its listings.
 *
 * Items are created as DRAFT and nothing used to move them off it, so an item that
 * was live on eBay or Mercari still read as DRAFT and dropped out of the "Listed"
 * tab on the listings board. Call this whenever a listing goes live.
 */
export async function markInventoryItemListed(
  db: PrismaClient,
  inventoryItemId: string
): Promise<void> {
  await db.inventoryItem.updateMany({
    where: { id: inventoryItemId, status: "DRAFT" },
    data: { status: "ACTIVE" },
  });
}
