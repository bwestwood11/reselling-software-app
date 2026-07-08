import type { InventoryPrefillData, InventoryPrefillEbay } from "@repo/types";
import { BasePrefillProvider } from "./base.js";

const CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS: "1000",
  NEW_WITHOUT_TAGS: "1500",
  VERY_GOOD: "3000",
  GOOD: "3000",
  SATISFACTORY: "7000",
};

// Build Mercari-ID → eBay search term map at module load from the shared mapping file.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ebayToMercari = require("../../data/ebay-to-mercari.json") as {
  paths: Record<string, number[]>;
  leaves: Record<string, number[]>;
};

// Mercari ID → eBay search term (best match wins; leaf entries override path-derived ones)
const mercariIdToEbayTerm: Record<number, string> = {};
for (const [ebayPath, mercariIds] of Object.entries(ebayToMercari.paths)) {
  const segs = ebayPath.split(":");
  const term = segs[segs.length - 1]!.trim();
  for (const id of mercariIds) {
    if (!(id in mercariIdToEbayTerm)) mercariIdToEbayTerm[id] = term;
  }
}
for (const [ebayLeaf, mercariIds] of Object.entries(ebayToMercari.leaves)) {
  for (const id of mercariIds) {
    mercariIdToEbayTerm[id] = ebayLeaf; // leaf overrides path-derived
  }
}

export class EbayPrefillProvider extends BasePrefillProvider {
  readonly marketplace = "EBAY";

  protected async extractSpecific(
    item: any,
    refListing?: any
  ): Promise<Partial<InventoryPrefillData>> {
    const filledFields: string[] = [];

    const refMd = refListing?.marketplaceData as Record<string, unknown> | null | undefined;

    // conditionId — map from inventory item's condition
    const conditionId = item.condition ? (CONDITION_MAP[item.condition as string] ?? "3000") : undefined;

    // postalCode and location — from refListing's marketplaceData only
    const postalCode =
      refMd?.["postalCode"] != null ? String(refMd["postalCode"]) : undefined;
    const location =
      refMd?.["location"] != null ? String(refMd["location"]) : undefined;

    // own prior eBay listing on this item (self-history, separate from refListing which
    // excludes the current marketplace)
    const ebayListing = (item.listings as any[]).find((l: any) => l.marketplace === "EBAY");
    const ebayMd = ebayListing?.marketplaceData as Record<string, unknown> | null | undefined;

    // itemSpecifics — build from inventory item, then overlay from eBay refListing
    const itemSpecifics: Record<string, string> = {};

    if (item.brand) itemSpecifics["Brand"] = item.brand as string;

    // Merge item attributes into specifics
    for (const attr of (item.attributes ?? []) as Array<{ name: string; value: string }>) {
      if (attr.name && attr.value) itemSpecifics[attr.name] = attr.value;
    }

    // If refListing is eBay, merge its itemSpecifics on top (skip if Mercari — wrong format)
    if (refListing?.marketplace === "EBAY" && refMd?.["itemSpecifics"]) {
      const refSpecifics = refMd["itemSpecifics"] as Record<string, string>;
      Object.assign(itemSpecifics, refSpecifics);
    }

    // categorySearchTerm — Mercari reverse map → item.category leaf → item.title
    let categorySearchTerm: string | undefined;

    // Check any Mercari listing on this item for a resolved categoryId
    const mercariListing = (item.listings as any[]).find((l: any) => l.marketplace === "MERCARI");
    const mercariMd = mercariListing?.marketplaceData as Record<string, unknown> | null | undefined;
    // Support both the old single-id field and the new suggestions array
    const mercariCatIdRaw = mercariMd?.["categoryId"] ?? (Array.isArray(mercariMd?.["categorySuggestions"]) ? (mercariMd!["categorySuggestions"] as unknown[])[0] : undefined);
    const mercariCatId = mercariCatIdRaw != null ? Number(mercariCatIdRaw) : undefined;

    if (mercariCatId !== undefined && mercariIdToEbayTerm[mercariCatId]) {
      categorySearchTerm = mercariIdToEbayTerm[mercariCatId];
    } else if (item.category) {
      // Handle both " › " and ":" separators
      const cat = item.category as string;
      const parts = cat.includes(" › ") ? cat.split(" › ") : cat.split(":");
      categorySearchTerm = parts[parts.length - 1]!.trim();
    } else if (item.title) {
      categorySearchTerm = item.title as string;
    }

    // weightLbs — own prior eBay listing → Mercari's package weight → item.weight (shared field)
    const mercariShipping = mercariMd?.["shipping"] as Record<string, unknown> | undefined;
    const weightLbs =
      (ebayMd?.["weightLbs"] != null ? Number(ebayMd["weightLbs"]) : undefined) ??
      (mercariShipping?.["weightOz"] != null ? Number(mercariShipping["weightOz"]) / 16 : undefined) ??
      (item.weight != null && Number(item.weight) > 0 ? Number(item.weight) : undefined);

    // Track filled fields from refListing
    if (refListing) {
      if (postalCode) filledFields.push("postal code");
      if (location) filledFields.push("location");
      if (item.brand) filledFields.push("brand");
    }
    if (weightLbs !== undefined) filledFields.push("package weight");

    const ebay: InventoryPrefillEbay = {
      itemSpecifics,
      ...(conditionId !== undefined ? { conditionId } : {}),
      ...(postalCode !== undefined ? { postalCode } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(weightLbs !== undefined ? { weightLbs } : {}),
      ...(categorySearchTerm !== undefined ? { categorySearchTerm } : {}),
    };

    return { ebay, filledFields };
  }
}
