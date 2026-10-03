import { POSHMARK_DEPARTMENTS, type PoshmarkSize } from "./data";

/**
 * Best-effort guess of a Poshmark department / category / subcategory for an inventory item that
 * has never been listed on Poshmark. There is no eBay/Mercari → Poshmark mapping table, so this
 * scores Poshmark's own category names against the item's category path (e.g. eBay's
 * "Clothing, Shoes & Accessories:Men:Men's Clothing:Shirts:Polos"), its item specifics
 * (Department, Type, Product, Style, Sleeve Length…) and, more weakly, its title.
 *
 * Returns null rather than guessing when nothing scores well — the user picks it manually then.
 */

export interface PoshmarkCategoryGuess {
  departmentId: string;
  categoryId?: string;
  subcategoryId?: string;
}

interface MatchableItem {
  title?: string | null;
  category?: string | null;
  attributes?: Array<{ name: string; value: string }> | null;
}

const DEPT = {
  WOMEN: "000e8975d97b4e80ef00a955",
  MEN: "01008c10d97b4e1245005764",
  KIDS: "20008c10d97b4e1245005764",
  HOME: "5b3b13d30640fd0aeb9c5cb6",
  PETS: "af08bf904024037d7a7b5fad",
  ELECTRONICS: "583c7d134024035188906153",
} as const;

/** Item-specific names whose values describe *what* the item is — weighted like the category. */
const STRONG_ATTRIBUTES = new Set([
  "type",
  "product",
  "style",
  "silhouette",
  "shoe type",
  "garment type",
]);

/**
 * Item specifics that only narrow a choice (short- vs long-sleeve tees, flat-front shorts) —
 * weighted like the title so they break ties without outvoting the item's actual type.
 */
const DETAIL_ATTRIBUTES = new Set(["sleeve length", "front type", "rise", "neckline"]);

/** Words folded together so e.g. "Hoodie", "T-Shirt" and "Tees" meet Poshmark's wording. */
const SYNONYMS: Record<string, string> = {
  hoodie: "sweatshirt",
  hoody: "sweatshirt",
  pullover: "sweatshirt",
  tshirt: "tee",

  tank: "tank",
  denim: "jean",
  trouser: "pant",
  slack: "pant",
  khaki: "chino",
  parka: "jacket",
  puffer: "puffer",
  sneaker: "sneaker",
  trainer: "sneaker",
  bootie: "boot",
  heel: "heel",
  purse: "bag",
  handbag: "bag",
  tote: "tote",
  sweater: "sweater",
  cardigan: "cardigan",
  jumper: "sweater",
  blazer: "blazer",
  sportcoat: "blazer",
  short: "short",
  bermuda: "bermuda",
  legging: "legging",
  jogger: "jogger",
  sweatpant: "jogger",
  sunglass: "sunglass",
  cap: "hat",
  beanie: "hat",
  earring: "earring",
  necklace: "necklace",
  bracelet: "bracelet",
  ring: "ring",
  watch: "watch",
};

const STOPWORDS = new Set([
  "and", "or", "the", "a", "of", "for", "with", "men", "mens", "women", "womens", "kid", "kids",
  "boy", "boys", "girl", "girls", "baby", "clothing", "accessories", "apparel", "other", 
  "size", "new", "nwt", "vintage", "lot",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/t-shirt|t shirt/g, "tshirt")
    .replace(/button[- ](down|up)/g, "buttondown")
    // Kept whole so "Short Sleeve" never reads as shorts.
    .replace(/(short|long)[- ]sleeve/g, "$1sleeve")
    .replace(/'s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -1) : w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => !STOPWORDS.has(w));
}

function attr(item: MatchableItem, ...names: string[]): string | undefined {
  const wanted = names.map((n) => n.toLowerCase());
  return item.attributes?.find((a) => wanted.includes(a.name.trim().toLowerCase()))?.value;
}

function guessDepartment(item: MatchableItem): string | undefined {
  const path = (item.category ?? "").toLowerCase();
  const gender = (attr(item, "department", "gender") ?? "").toLowerCase();
  const title = (item.title ?? "").toLowerCase();

  // Non-apparel top-level eBay categories.
  if (/^home & garden|^home\b/.test(path)) return DEPT.HOME;
  if (/^pet supplies/.test(path)) return DEPT.PETS;
  if (
    /^(consumer electronics|cell phones|computers|video games|cameras|portable audio)/.test(path)
  )
    return DEPT.ELECTRONICS;
  if (/^toys & hobbies/.test(path)) return DEPT.KIDS;

  const says = (re: RegExp) => re.test(gender) || re.test(path);
  if (says(/\b(kids?|boys?|girls?|baby|toddler|youth|infant)\b/)) return DEPT.KIDS;
  if (says(/\bwom[ae]n'?s?\b|\bladies\b/)) return DEPT.WOMEN;
  if (says(/\bm[ae]n'?s?\b|\bunisex\b/)) return DEPT.MEN;

  if (/\bwom[ae]n'?s?\b|\bladies\b/.test(title)) return DEPT.WOMEN;
  if (/\bm[ae]n'?s?\b/.test(title)) return DEPT.MEN;
  if (/\b(boys?|girls?|kids?|toddler|youth)\b/.test(title)) return DEPT.KIDS;
  return undefined;
}

/** Minimum score for a category guess — roughly one strong match, or several title-only hits. */
const MIN_SCORE = 3;

export function guessPoshmarkCategory(item: MatchableItem): PoshmarkCategoryGuess | null {
  const departmentId = guessDepartment(item);
  if (!departmentId) return null;
  const dept = POSHMARK_DEPARTMENTS.find((d) => d.id === departmentId);
  if (!dept) return null;

  // Token weights: the last two category-path segments and descriptive item specifics are strong
  // evidence (3); the title is weak (1) since it mixes in brand, team and condition words.
  const weight = new Map<string, number>();
  const add = (text: string | undefined, w: number) => {
    for (const t of tokens(text ?? "")) weight.set(t, Math.max(weight.get(t) ?? 0, w));
  };
  add(item.title ?? "", 1);
  // A segment that lists several things ("Coats, Jackets & Vests") says little about which one
  // this item is, so it only counts as weakly as the title.
  const path = (item.category ?? "").split(":");
  const segmentWeight = (seg: string | undefined, w: number) => (/[,&]/.test(seg ?? "") ? 1 : w);
  add(path.at(-2), segmentWeight(path.at(-2), 2));
  add(path.at(-1), segmentWeight(path.at(-1), 3));
  for (const a of item.attributes ?? []) {
    const name = a.name.trim().toLowerCase();
    if (STRONG_ATTRIBUTES.has(name)) add(a.value, 3);
    else if (DETAIL_ATTRIBUTES.has(name)) add(a.value, 1);
  }

  const score = (text: string, exclude: ReadonlySet<string> = new Set()) =>
    [...new Set(tokens(text))]
      .filter((t) => !exclude.has(t))
      .reduce((sum, t) => sum + (weight.get(t) ?? 0), 0);

  let best: { score: number; categoryId: string; subcategoryId?: string } | null = null;
  for (const cat of dept.categories) {
    const catScore = score(cat.display);
    const catTokens = new Set(tokens(cat.display));
    const consider = (s: number, subcategoryId?: string) => {
      if (!best || s > best.score) best = { score: s, categoryId: cat.id, subcategoryId };
    };
    consider(catScore);
    for (const sub of cat.subcategories) {
      // Words the subcategory shares with its category ("Shirt Jackets" under "Jackets & Coats")
      // are already counted in catScore — only its own words count toward picking it.
      const subScore = score(sub.display, catTokens);
      // A subcategory hit must carry its own evidence — otherwise it only inherits the category's.
      // A lone weak hit (one title word) isn't enough to commit to a subcategory.
      if (subScore >= 2) {
        // On a tie, prefer the tighter name: "Straight" over "Slim Straight" for Style=Straight.
        const unmatched = tokens(sub.display).filter((t) => !weight.has(t)).length;
        consider(catScore + subScore * 1.5 - unmatched * 0.1, sub.id);
      }
    }
  }

  if (!best || (best as { score: number }).score < MIN_SCORE) return { departmentId };
  const { categoryId, subcategoryId } = best as { categoryId: string; subcategoryId?: string };
  return { departmentId, categoryId, ...(subcategoryId ? { subcategoryId } : {}) };
}

// ── Size matching ─────────────────────────────────────────────────────────────

const SIZE_WORDS: Record<string, string> = {
  "extra small": "XS",
  "x-small": "XS",
  small: "S",
  medium: "M",
  large: "L",
  "extra large": "XL",
  "x-large": "XL",
  "xx-large": "XXL",
  "2xl": "XXL",
  "xxx-large": "3XL",
  xxxl: "3XL",
  "one size": "One Size",
  os: "One Size",
};

/** Normalise a size label for comparison: "2XL" → "XXL", "Waist 38" → "38", "38 in" → "38". */
function normaliseSize(label: string): string {
  let s = label.trim().toLowerCase().replace(/\s+/g, " ");
  s = s.replace(/^(us|men'?s|women'?s|size)\s+/g, "").replace(/\s*(in|")$/, "");
  s = s.replace(/^(waist|neck)\s+/, "");
  return (SIZE_WORDS[s] ?? s).toLowerCase();
}

/**
 * Find the Poshmark size matching an item's size label. Standard-set sizes come first in the
 * list and carry no "(Set)" suffix, so they win over e.g. "XXL (Big & Tall)" or a Maternity size.
 */
export function matchPoshmarkSize(
  sizes: ReadonlyArray<PoshmarkSize>,
  label: string
): PoshmarkSize | undefined {
  const exactId = sizes.find((s) => s.id === label);
  if (exactId) return exactId;
  const want = normaliseSize(label);
  // 3XL is spelled "3XL" in Men's but "XXXL" in Women's — try both.
  const alt = want === "3xl" ? "xxxl" : want === "xxxl" ? "3xl" : undefined;
  const base = (s: PoshmarkSize) => normaliseSize(s.display.replace(/\s*\([^)]*\)\s*$/, ""));
  const standard = sizes.filter((s) => !/\([^)]*\)\s*$/.test(s.display));
  for (const pool of [standard, sizes]) {
    const hit = pool.find((s) => base(s) === want || (alt && base(s) === alt));
    if (hit) return hit;
  }
  return undefined;
}
