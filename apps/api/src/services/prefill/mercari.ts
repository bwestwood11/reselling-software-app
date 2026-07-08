import type { InventoryPrefillData, InventoryPrefillMercari } from "@repo/types";
import { BasePrefillProvider } from "./base.js";
import { findMercariBrandId } from "../mercari-brands.service.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ebayToMercari = require("../../data/ebay-to-mercari.json") as {
  paths: Record<string, number[]>;
  leaves: Record<string, number[]>;
};

function lookupMercariCategories(ebayCategory: string): number[] {
  const { paths, leaves } = ebayToMercari;

  // 1. Try full path as-is
  if (paths[ebayCategory]?.length) return paths[ebayCategory]!;

  // 2. Try progressively shorter prefixes (most-specific first)
  const segs = ebayCategory.split(":");
  for (let len = segs.length - 1; len >= 1; len--) {
    const partial = segs.slice(0, len).join(":");
    if (paths[partial]?.length) return paths[partial]!;
  }

  // 3. Try leaf name
  const leaf = segs[segs.length - 1]!.trim();
  if (leaves[leaf]?.length) return leaves[leaf]!;

  return [];
}

function parseDimensions(raw: unknown): { length: number; width: number; height: number } | undefined {
  if (!raw) return undefined;
  try {
    const d = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
    const l = Number(d["length"]);
    const w = Number(d["width"]);
    const h = Number(d["height"]);
    if (l > 0 && w > 0 && h > 0) return { length: l, width: w, height: h };
  } catch {
    // ignore parse errors
  }
  return undefined;
}

export class MercariPrefillProvider extends BasePrefillProvider {
  readonly marketplace = "MERCARI";

  protected async extractSpecific(
    item: any,
    refListing?: any
  ): Promise<Partial<InventoryPrefillData>> {
    const filledFields: string[] = [];

    const refMd = refListing?.marketplaceData as Record<string, unknown> | null | undefined;

    // Also look at any existing Mercari listing on this item as a secondary source
    const mercariListing = (item.listings as any[]).find((l: any) => l.marketplace === "MERCARI");
    const mercariMd = mercariListing?.marketplaceData as Record<string, unknown> | null | undefined;

    // brandId: refMd → mercariMd → resolve item.brand text against the Mercari brand list
    const brandIdFromItemText = item.brand ? findMercariBrandId(item.brand as string) : undefined;
    const brandId =
      (refMd?.["brandId"] != null ? String(refMd["brandId"]) : undefined) ??
      (mercariMd?.["brandId"] != null ? String(mercariMd["brandId"]) : undefined) ??
      (brandIdFromItemText != null ? String(brandIdFromItemText) : undefined);

    // sizeId: refMd → mercariMd
    const sizeId =
      (refMd?.["sizeId"] != null ? String(refMd["sizeId"]) : undefined) ??
      (mercariMd?.["sizeId"] != null ? String(mercariMd["sizeId"]) : undefined);

    // zipCode: refMd → mercariMd
    const zipCode =
      (refMd?.["zipCode"] as string | undefined) ??
      (mercariMd?.["zipCode"] as string | undefined);

    // addressId: last address used on a prior Mercari listing → user's preferred/default
    // Mercari shipping address (stored on the connection from a synced address list)
    let addressId: number | undefined =
      (refMd?.["addressId"] != null ? Number(refMd["addressId"]) : undefined) ??
      (mercariMd?.["addressId"] != null ? Number(mercariMd["addressId"]) : undefined);

    // Category resolution: Mercari-prior → ebay-to-mercari mapping → fallback path segments
    let categoryId: string | undefined;
    let categoryPath: string[] | undefined;

    const mercariCategoryId = mercariMd?.["categoryId"] != null ? String(mercariMd["categoryId"]) : undefined;
    const mercariCategoryPath =
      Array.isArray(mercariMd?.["categoryPath"]) && (mercariMd!["categoryPath"] as unknown[]).length > 0
        ? (mercariMd!["categoryPath"] as string[])
        : undefined;

    let categorySuggestions: string[] | undefined;

    if (mercariCategoryId) {
      // Reuse exact Mercari category from a prior Mercari listing
      categorySuggestions = [mercariCategoryId];
      categoryPath = mercariCategoryPath;
    } else if (item.category) {
      const cat = item.category as string;
      // Normalise separators → colon-delimited for the mapping lookup
      const ebayPath = cat.includes(" › ") ? cat.split(" › ").join(":") : cat;
      const mapped = lookupMercariCategories(ebayPath);

      if (mapped.length > 0) {
        categorySuggestions = mapped.map(String);
        // Expose path segments so the frontend can show the breadcrumb for the first suggestion
        categoryPath = ebayPath.split(":").map((s) => s.trim()).filter(Boolean);
      } else {
        // No mapping found — pass raw segments so the frontend can do a live search
        if (cat.includes(" › ")) {
          categoryPath = cat.split(" › ");
        } else if (cat.includes(":")) {
          categoryPath = cat.split(":").map((s: string) => s.trim()).filter(Boolean);
        } else {
          categoryPath = [cat];
        }
      }
    }

    // Shipping: refListing's shipping → existing Mercari shipping → item weight/dims (shared
    // across marketplaces, e.g. entered while creating an eBay listing for the same item)
    let weightOz: number | undefined;
    let dimL: number | undefined;
    let dimW: number | undefined;
    let dimH: number | undefined;
    let shippingMethod: "SOYO" | "PREPAID" | undefined;
    let shippingPayerId: 1 | 2 | undefined;

    // Try to extract from refMd shipping object first
    const refShipping = refMd?.["shipping"] as Record<string, unknown> | undefined;
    const mercariShipping = mercariMd?.["shipping"] as Record<string, unknown> | undefined;

    const shippingSource = refShipping ?? mercariShipping;

    let shippingMethodFilled = false;

    if (shippingSource) {
      if (shippingSource["weightOz"] != null) weightOz = Number(shippingSource["weightOz"]);
      if (shippingSource["method"] === "SOYO" || shippingSource["method"] === "PREPAID") {
        shippingMethod = shippingSource["method"];
        shippingMethodFilled = true;
      }
      if (shippingSource["shippingPayerId"] === 1 || shippingSource["shippingPayerId"] === 2) {
        shippingPayerId = shippingSource["shippingPayerId"];
      }
      const dims = parseDimensions(shippingSource["dimension"]);
      if (dims) {
        dimL = dims.length;
        dimW = dims.width;
        dimH = dims.height;
      }
    }

    // eBay stores weight as a flat lbs field rather than a nested "shipping" object — check
    // it before falling back to the item's own weight
    const ebayWeightLbs = refMd?.["weightLbs"] != null ? Number(refMd["weightLbs"]) : undefined;
    if (weightOz === undefined && ebayWeightLbs != null && ebayWeightLbs > 0) {
      weightOz = Math.round(ebayWeightLbs * 16);
    }

    // Fall back to the inventory item's own weight/dimensions (global to the item, not tied
    // to any one marketplace) whenever the prior listing data didn't already supply them
    if (weightOz === undefined && item.weight && Number(item.weight) > 0) {
      weightOz = Math.round(Number(item.weight) * 16);
    }
    if (dimL === undefined || dimW === undefined || dimH === undefined) {
      const itemDims = parseDimensions(item.dimensions);
      if (itemDims) {
        dimL = itemDims.length;
        dimW = itemDims.width;
        dimH = itemDims.height;
      }
    }

    // addressId / shippingMethod fallback: read the connection's saved preferences once,
    // only if either is still unresolved from listing history
    if (addressId === undefined || shippingMethod === undefined) {
      const connection = await this.db.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: item.userId, marketplace: "MERCARI" } },
        select: { metadata: true },
      });
      const meta = (connection?.metadata as Record<string, unknown> | null) ?? {};

      if (addressId === undefined) {
        const addresses = Array.isArray(meta["addresses"]) ? (meta["addresses"] as Record<string, unknown>[]) : [];
        const preferredAddressId =
          meta["preferredAddressId"] != null ? Number(meta["preferredAddressId"]) : undefined;

        if (preferredAddressId != null && addresses.some((a) => Number(a["id"]) === preferredAddressId)) {
          addressId = preferredAddressId;
        } else {
          const defaultAddress = addresses.find((a) => a["isDefault"]);
          if (defaultAddress) addressId = Number(defaultAddress["id"]);
        }
      }

      if (shippingMethod === undefined) {
        const preferred = meta["preferredShippingMethod"];
        if (preferred === "SOYO" || preferred === "PREPAID") {
          shippingMethod = preferred;
          shippingMethodFilled = true;
        }
      }
    }

    // No prior listing data and no saved preference — default to Prepaid Label
    shippingMethod ??= "PREPAID";
    if (shippingMethodFilled) filledFields.push("shipping method");

    // Track filled fields
    if (brandId) filledFields.push("brand");
    if (categorySuggestions?.length || categoryPath?.length) filledFields.push("category");
    if (zipCode) filledFields.push("zip code");
    if (addressId !== undefined) filledFields.push("shipping address");
    if (weightOz) filledFields.push("package weight");
    if (dimL || dimW || dimH) filledFields.push("dimensions");
    if (shippingPayerId !== undefined) filledFields.push("who pays shipping");

    const mercari: InventoryPrefillMercari = {
      shippingMethod,
      ...(shippingPayerId !== undefined ? { shippingPayerId } : {}),
      ...(brandId !== undefined ? { brandId } : {}),
      ...(sizeId !== undefined ? { sizeId } : {}),
      ...(zipCode !== undefined ? { zipCode } : {}),
      ...(addressId !== undefined ? { addressId } : {}),
      ...(categorySuggestions !== undefined ? { categorySuggestions } : {}),
      ...(categoryPath !== undefined ? { categoryPath } : {}),
      ...(weightOz !== undefined ? { weightOz } : {}),
      ...(dimL !== undefined ? { dimL } : {}),
      ...(dimW !== undefined ? { dimW } : {}),
      ...(dimH !== undefined ? { dimH } : {}),
    };

    return { mercari, filledFields };
  }
}
