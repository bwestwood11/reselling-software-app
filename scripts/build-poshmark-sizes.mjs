#!/usr/bin/env node
// Rebuilds POSHMARK_SIZE_MAP in apps/web/src/lib/poshmark/data.ts from Poshmark's public
// category pages.
//
// Each category page embeds a `"size":[…]` facet holding every size set Poshmark offers for that
// category (Standard, Big & Tall, Petite, Plus, Maternity, …). The original generator keyed the
// map by category and let the last set overwrite the rest, so e.g. Men › Shirts lost XS–XL. This
// merges all sets; sizes outside the Standard set get the set name appended to their label so
// they can be told apart in the picker (the id is what gets posted, and it is untouched).
//
// Usage (Node ≥ 22.6, for TS type-stripping):
//   node --experimental-strip-types scripts/build-poshmark-sizes.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DATA_URL = new URL("../apps/web/src/lib/poshmark/data.ts", import.meta.url);
const DATA_PATH = fileURLToPath(DATA_URL);
const { POSHMARK_DEPARTMENTS, POSHMARK_SIZE_MAP } = await import(DATA_URL.href);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";
const DELAY_MS = 800;

const slug = (s) => s.replace(/ /g, "_");

/** Extract the JSON array that follows `"size":[{"id":` in the page, by bracket matching. */
function extractSizeFacet(html) {
  const start = html.indexOf('"size":[{"id":');
  if (start < 0) return null;
  const i = start + '"size":'.length;
  let depth = 0;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (ch === '"') {
      for (j++; html[j] !== '"'; j++) if (html[j] === "\\") j++;
    } else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return JSON.parse(html.slice(i, j + 1));
  }
  return null;
}

const next = { ...POSHMARK_SIZE_MAP };
const report = [];

for (const dept of POSHMARK_DEPARTMENTS) {
  for (const cat of dept.categories) {
    if (!POSHMARK_SIZE_MAP[cat.id]) continue; // category has no sizes at all
    const url = `https://poshmark.com/category/${slug(dept.display)}-${slug(cat.display)}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sets = (extractSizeFacet(await res.text()) ?? []).filter(
        (s) => s.category_id === cat.id
      );
      if (sets.length === 0) throw new Error("no size facet for this category");

      const sizes = [];
      const seen = new Set();
      for (const set of sets) {
        const standard = set.tags?.includes("standard") || /^standard$/i.test(set.name);
        for (const z of set.size_systems?.us?.sizes ?? []) {
          if (seen.has(z.id)) continue;
          seen.add(z.id);
          sizes.push({ id: z.id, display: standard ? z.display : `${z.display} (${set.name})` });
        }
      }
      next[cat.id] = sizes;
      report.push(`ok   ${dept.display} › ${cat.display}: ${sets.map((s) => s.name).join(", ")} (${sizes.length})`);
    } catch (err) {
      report.push(`keep ${dept.display} › ${cat.display}: ${err.message} — ${url}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

const src = readFileSync(DATA_PATH, "utf8");
const begin = src.indexOf("export const POSHMARK_SIZE_MAP");
const close = begin < 0 ? null : /\r?\n\};\r?\n/.exec(src.slice(begin));
if (!close) throw new Error("Could not locate POSHMARK_SIZE_MAP in data.ts");
const end = begin + close.index + close[0].length;
const eol = src.includes("\r\n") ? "\r\n" : "\n";
const block =
  `export const POSHMARK_SIZE_MAP: PoshmarkSizeMap = ${JSON.stringify(next, null, 2)};\n`.replace(
    /\n/g,
    eol
  );
writeFileSync(DATA_PATH, src.slice(0, begin) + block + src.slice(end));

console.log(report.join("\n"));
