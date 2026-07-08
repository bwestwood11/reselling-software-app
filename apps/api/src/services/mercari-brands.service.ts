import brandsData from "../data/mercari-brands.json";

interface RawBrand {
  id: number;
  name: string;
}

const brands = brandsData as RawBrand[];

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const idByNormalizedName = new Map<string, number>();
for (const b of brands) {
  const key = normalize(b.name);
  if (key && !idByNormalizedName.has(key)) idByNormalizedName.set(key, b.id);
}

/** Resolve a free-text brand name (e.g. from an inventory item) to a Mercari brand ID. */
export function findMercariBrandId(name: string): number | undefined {
  if (!name?.trim()) return undefined;
  return idByNormalizedName.get(normalize(name));
}
