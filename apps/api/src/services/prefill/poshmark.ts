import type { InventoryPrefillData, InventoryPrefillPoshmark } from "@repo/types";
import { BasePrefillProvider } from "./base.js";

// Internal Condition → Poshmark condition string. Mirrors the map the adapter and the
// extension use, so a prefilled condition matches what actually gets posted.
const CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS: "nwt",
  NEW_WITHOUT_TAGS: "like_new",
  VERY_GOOD: "good",
  GOOD: "good",
  SATISFACTORY: "fair",
};

/** Attribute names that commonly carry a size on an inventory item. */
const SIZE_ATTRIBUTE_NAMES = ["size", "us size", "shoe size", "clothing size"];

export class PoshmarkPrefillProvider extends BasePrefillProvider {
  readonly marketplace = "POSHMARK";

  protected async extractSpecific(
    item: any,
    refListing?: any
  ): Promise<Partial<InventoryPrefillData>> {
    const filledFields: string[] = [];

    const refMd = refListing?.marketplaceData as Record<string, unknown> | null | undefined;

    // The item's own prior Poshmark listing (self-history). This is the only source for the
    // Poshmark taxonomy: there is no eBay/Mercari → Poshmark category mapping table, so a
    // category is only ever carried over from a previous Poshmark listing on the same item.
    const poshListing = (item.listings as any[]).find((l: any) => l.marketplace === "POSHMARK");
    const poshMd = poshListing?.marketplaceData as Record<string, unknown> | null | undefined;

    const str = (v: unknown): string | undefined =>
      v != null && String(v).trim() ? String(v).trim() : undefined;

    const departmentId = str(poshMd?.["departmentId"]);
    const categoryId = str(poshMd?.["categoryId"]);
    const subcategoryId = str(poshMd?.["subcategoryId"]);

    // condition: prior Poshmark listing → mapped from the inventory item's condition
    const condition =
      str(poshMd?.["condition"]) ??
      (item.condition ? (CONDITION_MAP[item.condition as string] ?? "good") : undefined);

    // brand: prior Poshmark listing → cross-marketplace reference listing → the item itself
    const brand = str(poshMd?.["brand"]) ?? str(refMd?.["brand"]) ?? str(item.brand);

    // size: prior Poshmark listing's sizeId is already a Poshmark ID, but it is only valid for
    // the same category. Pass it as a label and let the client match it against the size list
    // for whichever category ends up selected.
    const sizeFromAttribute = ((item.attributes ?? []) as Array<{ name: string; value: string }>)
      .find((a) => a.name && SIZE_ATTRIBUTE_NAMES.includes(a.name.trim().toLowerCase()))?.value;
    const sizeLabel = str(poshMd?.["sizeId"]) ?? str(sizeFromAttribute);

    const colors = Array.isArray(poshMd?.["colors"])
      ? (poshMd!["colors"] as unknown[]).map(String).filter(Boolean).slice(0, 2)
      : undefined;
    const styleTags = Array.isArray(poshMd?.["styleTags"])
      ? (poshMd!["styleTags"] as unknown[]).map(String).filter(Boolean).slice(0, 3)
      : undefined;

    // originalPriceCents: prior Poshmark listing only. The item's costPrice is what the *seller*
    // paid, not the retail price Poshmark shows buyers, so it is deliberately not used here.
    const originalPriceCents =
      poshMd?.["originalPriceCents"] != null ? Number(poshMd["originalPriceCents"]) : undefined;

    const shippingDiscount = str(poshMd?.["shippingDiscount"]);

    if (poshListing) {
      if (departmentId || categoryId) filledFields.push("category");
      if (colors?.length) filledFields.push("colors");
      if (styleTags?.length) filledFields.push("style tags");
      if (shippingDiscount) filledFields.push("shipping discount");
    }
    if (brand) filledFields.push("brand");
    if (sizeLabel) filledFields.push("size");

    const poshmark: InventoryPrefillPoshmark = {
      ...(condition !== undefined ? { condition } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(subcategoryId !== undefined ? { subcategoryId } : {}),
      ...(sizeLabel !== undefined ? { sizeLabel } : {}),
      ...(colors?.length ? { colors } : {}),
      ...(styleTags?.length ? { styleTags } : {}),
      ...(originalPriceCents !== undefined && Number.isFinite(originalPriceCents)
        ? { originalPriceCents }
        : {}),
      ...(shippingDiscount !== undefined ? { shippingDiscount } : {}),
    };

    return { poshmark, filledFields };
  }
}
