#!/usr/bin/env node
// Generates apps/api/src/data/compact-categories.xml
//
// Input format fed to the AI:
//   <categories>
//     <section name="Women">
//       <group name="Dresses">Above knee mini, Knee-length, Midi, Maxi</group>
//       <group name="Jeans">Boot cut, Skinny, Straight leg, Wide leg</group>
//     </section>
//   </categories>
//
// Expected AI output (definitive, parsable):
//   <result>
//     <title>Blue Levi's 501 Jeans</title>
//     <description>Classic straight leg jeans in excellent condition...</description>
//     <category section="Men" group="Jeans" item="Straight leg" />
//   </result>
//
// Run: node scripts/build-compact-categories.mjs

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const src = resolve(root, "apps/web/src/data/mercari-categories.json");
const out = resolve(root, "apps/api/src/data/compact-categories.xml");

const { itemCategories } = JSON.parse(readFileSync(src, "utf8"));

const childrenOf = new Map();
for (const c of itemCategories) {
  if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
  childrenOf.get(c.parentId).push(c);
}

const sorted = (id) =>
  (childrenOf.get(id) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);

// Escape the five XML special characters
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<categories>"];

for (const l1 of sorted(0)) {
  lines.push(`  <section name="${esc(l1.name)}">`);

  for (const l2 of sorted(l1.id)) {
    const l3s = sorted(l2.id);

    if (l3s.length === 0) {
      lines.push(`    <group name="${esc(l2.name)}" />`);
    } else {
      const items = l3s.map((c) => esc(c.name)).join(", ");
      lines.push(`    <group name="${esc(l2.name)}">${items}</group>`);
    }
  }

  lines.push("  </section>");
}

lines.push("</categories>");

const content = lines.join("\n");
writeFileSync(out, content, "utf8");

console.log(`Wrote ${lines.length} lines (~${Math.round(content.length / 4)} tokens) to ${out}`);
