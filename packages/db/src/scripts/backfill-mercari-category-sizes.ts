import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "" })
  ),
});

// Maps DB category id (string = Mercari integer ID) → size schema name.
// null = NO_SIZES (isSizeRequired: false).
// Children inherit the nearest ancestor's schema unless they appear here explicitly.
const SIZE_SCHEMA_MAP: Record<string, string | null> = {
  // ── Men (2) ──────────────────────────────────────────────────────────────
  "27":   "clothing_sizes",       // Tops
  "28":   "clothing_sizes",       // Sweats & hoodies
  "29":   "clothing_sizes",       // Sweaters
  "30":   "clothing_sizes_inch",  // Jeans
  "31":   "clothing_sizes_inch",  // Pants
  "32":   "clothing_sizes_inch",  // Shorts
  "33":   "clothing_sizes",       // Coats & jackets
  "34":   "clothing_sizes_suits", // Blazers & sport coats
  "35":   "clothing_sizes_suits", // Suits
  "36":   "clothing_sizes",       // Athletic apparel
  "37":   "clothing_sizes",       // Swimwear
  "38":   null,                   // Men's accessories
  "39":   "shoe_sizes",           // Shoes
  "2874": null,                   // Jewelry
  "40":   null,                   // Other

  // ── Women (1) ────────────────────────────────────────────────────────────
  "11":   "clothing_sizes",       // Dresses
  "12":   "clothing_sizes",       // Tops & blouses
  "13":   "clothing_sizes",       // Sweaters
  "14":   "clothing_sizes_inch",  // Jeans
  "15":   "clothing_sizes",       // Pants
  "16":   "clothing_sizes",       // Skirts
  "17":   "clothing_sizes",       // Coats & jackets
  "18":   "clothing_sizes",       // Suits & blazers
  "19":   "clothing_sizes",       // Athletic apparel
  "20":   "clothing_sizes",       // Swimwear
  "21":   null,                   // Women's handbags
  "22":   null,                   // Women's accessories
  "23":   null,                   // Jewelry
  "24":   "clothing_sizes",       // Maternity
  "25":   "shoe_sizes",           // Shoes
  "26":   null,                   // Other
  "1561": "clothing_sizes",       // Underwear
  "1936": "clothing_sizes",       // Shorts
  "1947": "clothing_sizes",       // Sleepwear & robes

  // ── Kids (3) ─────────────────────────────────────────────────────────────
  "1870": null,                    // Girls accessories
  "1871": "clothing_sizes_kids",   // Girls bottoms
  "1872": "clothing_sizes_kids",   // Girls coats & jackets
  "1873": "clothing_sizes_kids",   // Girls dresses
  "1874": "clothing_sizes_kids",   // Girls one-pieces
  "1875": "clothing_sizes_kids",   // Girls shoes
  "1876": "clothing_sizes_kids",   // Girls swimwear
  "1877": "clothing_sizes_kids",   // Girls tops & t-shirts
  "1878": "clothing_sizes_kids",   // Girls other
  "1879": null,                    // Boys accessories
  "1880": "clothing_sizes_kids",   // Boys bottoms
  "1881": "clothing_sizes_kids",   // Boys coats & jackets
  "1882": "clothing_sizes_kids",   // Boys one-pieces
  "1883": "clothing_sizes_kids",   // Boys swimwear
  "1884": "clothing_sizes_kids",   // Boys shoes
  "1885": "clothing_sizes_kids",   // Boys tops & t-shirts
  "1886": "clothing_sizes_kids",   // Boys other
  "48":   null,                    // Bathing & skin care
  "49":   null,                    // Car seats & accessories
  "50":   null,                    // Diapering
  "51":   null,                    // Feeding
  "52":   null,                    // Gear
  "53":   null,                    // Health & baby care
  "54":   null,                    // Nursery
  "55":   null,                    // Potty training
  "56":   null,                    // Pregnancy & maternity
  "57":   null,                    // Safety
  "58":   null,                    // Strollers
  "59":   null,                    // Other
};

type DbCat = {
  id: string;
  parentId: string | null;
  isSizeRequired: boolean;
  sizeSchemaId: string | null;
};

// Walk self → parent → grandparent until we find an id in SIZE_SCHEMA_MAP.
function resolveSchema(
  catId: string,
  byId: Map<string, DbCat>
): { found: true; schema: string | null } | { found: false } {
  let current: DbCat | undefined = byId.get(catId);
  while (current) {
    if (Object.hasOwn(SIZE_SCHEMA_MAP, current.id)) {
      return { found: true, schema: SIZE_SCHEMA_MAP[current.id] ?? null };
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return { found: false };
}

async function main() {
  const all = await prisma.mercariCategory.findMany({
    select: { id: true, parentId: true, isSizeRequired: true, sizeSchemaId: true },
  });
  console.log(`Loaded ${all.length} categories`);

  const byId = new Map<string, DbCat>(all.map((c) => [c.id, c]));

  const toUpdate: Array<{ id: string; isSizeRequired: boolean; sizeSchemaId: string | null }> = [];

  for (const cat of all) {
    const resolved = resolveSchema(cat.id, byId);
    const isSizeRequired = resolved.found && resolved.schema !== null;
    const sizeSchemaId = resolved.found ? resolved.schema : null;

    if (isSizeRequired !== cat.isSizeRequired || sizeSchemaId !== cat.sizeSchemaId) {
      toUpdate.push({ id: cat.id, isSizeRequired, sizeSchemaId });
    }
  }

  console.log(`${toUpdate.length} categories need updating (${all.length - toUpdate.length} already correct)\n`);

  // Schema breakdown
  const schemaGroups: Record<string, number> = {};
  for (const u of toUpdate) {
    const key = u.sizeSchemaId ?? "NO_SIZES";
    schemaGroups[key] = (schemaGroups[key] ?? 0) + 1;
  }
  for (const [schema, count] of Object.entries(schemaGroups).sort()) {
    console.log(`  ${schema}: ${count} categories`);
  }

  if (toUpdate.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  console.log("\nApplying updates...");
  for (const { id, isSizeRequired, sizeSchemaId } of toUpdate) {
    await prisma.mercariCategory.update({
      where: { id },
      data: { isSizeRequired, sizeSchemaId },
    });
  }

  console.log("Done.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
