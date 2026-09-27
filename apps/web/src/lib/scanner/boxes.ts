// Mapping and merging product boxes for the photo scanner. Boxes are [ymin, xmin, ymax, xmax], 0-1000.

import type {
  ScanBox,
  ScanMergeCandidate,
  ScanMergeResult,
  ScanProduct,
} from "@repo/types";
import type { Region } from "./enhance";

type Box4 = [number, number, number, number];
const box4 = (r: number[]) => [r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, r[3] ?? 0] as Box4;

function intersection(a: number[], b: number[]) {
  const [ay0, ax0, ay1, ax1] = box4(a), [by0, bx0, by1, bx1] = box4(b);
  const h = Math.min(ay1, by1) - Math.max(ay0, by0), w = Math.min(ax1, bx1) - Math.max(ax0, bx0);
  return Math.max(0, h) * Math.max(0, w);
}

const area = (r: number[]) => {
  const [y0, x0, y1, x1] = box4(r);
  return (y1 - y0) * (x1 - x0);
};

function iou(a: number[], b: number[]): number {
  const inter = intersection(a, b);
  return inter / (area(a) + area(b) - inter || 1);
}

/** Share of the smaller box covered by the other: high when a tile saw part of an item the scene pass boxed whole. */
function containment(a: number[], b: number[]): number {
  return intersection(a, b) / (Math.min(area(a), area(b)) || 1);
}

/** Map boxes drawn on any view onto the original photo (0-1000), dropping duplicates of the same unit. */
export function toOriginalCoords(boxes: ScanBox[] | undefined, regions: Record<string, Region>): ScanBox[] {
  const mapped: ScanBox[] = [];
  for (const box of boxes ?? []) {
    if (box.box_2d?.length !== 4) continue;
    const [x0, y0, x1, y1] = regions[box.view] ?? [0, 0, 1, 1]; // unknown view name: assume full frame
    const [ymin, xmin, ymax, xmax] = box4(box.box_2d.map((v) => Math.min(Math.max(v, 0), 1000) / 1000));
    if (ymax <= ymin || xmax <= xmin) continue;
    const coords = [
      Math.round((y0 + ymin * (y1 - y0)) * 1000),
      Math.round((x0 + xmin * (x1 - x0)) * 1000),
      Math.round((y0 + ymax * (y1 - y0)) * 1000),
      Math.round((x0 + xmax * (x1 - x0)) * 1000),
    ];
    // the same unit boxed on two views (e.g. original + a tile) overlaps heavily: keep the first
    if (mapped.every((m) => iou(coords, m.box_2d) < 0.5)) mapped.push({ view: "original", box_2d: coords });
  }
  return mapped;
}

// ---------- merging results from the scene pass and the tile passes ----------

const boxesOverlap = (a: number[], b: number[]) => iou(a, b) > 0.3 || containment(a, b) > 0.6;
const anyOverlap = (as: number[][], bs: number[][]) => as.some((a) => bs.some((b) => boxesOverlap(a, b)));

function dedupeBoxes(boxes: number[][]): number[][] {
  const kept: number[][] = [];
  for (const b of boxes) if (kept.every((k) => iou(b, k) < 0.5 && containment(b, k) < 0.85)) kept.push(b);
  return kept;
}

type Named = { name: string; brand: string | null; model_number: string | null };

const STOP = new Set(["the", "a", "an", "of", "and", "with", "for", "in", "box", "set", "pack", "item", "new", "used"]);
function nameTokens(p: Named) {
  return new Set(
    `${p.brand ?? ""} ${p.name} ${p.model_number ?? ""}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOP.has(t))
  );
}
function nameSimilarity(a: Named, b: Named): number {
  const ta = nameTokens(a), tb = nameTokens(b);
  const inter = [...ta].filter((t) => tb.has(t)).length;
  return inter / (new Set([...ta, ...tb]).size || 1);
}

export type PassResult = { source: string; products: ScanProduct[] }; // boxes already mapped to the original photo

/** Flatten every pass's products into candidates for the merge call, with overlap hints. */
export function toCandidates(passes: PassResult[]): ScanMergeCandidate[] {
  const candidates: ScanMergeCandidate[] = [];
  for (const { source, products } of passes) {
    for (const p of products) {
      candidates.push({
        ...p,
        id: `c${candidates.length + 1}`,
        source,
        boxes: p.boxes.map((b) => b.box_2d),
        overlaps: [],
      });
    }
  }
  for (const a of candidates) {
    a.overlaps = candidates.filter((b) => b !== a && anyOverlap(a.boxes, b.boxes)).map((b) => b.id);
  }
  return candidates;
}

const toScanBoxes = (boxes: number[][]): ScanBox[] =>
  dedupeBoxes(boxes).map((b) => ({ view: "original", box_2d: b }));

function toProduct(c: ScanMergeCandidate, extraBoxes: number[][] = []): ScanProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping the merge-only fields
  const { id, source, overlaps, boxes, ...fields } = c;
  return { ...fields, boxes: toScanBoxes([...boxes, ...extraBoxes]) };
}

const byValue = (a: ScanProduct, b: ScanProduct) =>
  b.quantity * b.estimated_resale_high_usd - a.quantity * a.estimated_resale_high_usd;

/** Build the final list from Gemini's merge: boxes come from the merged candidates, and anything
 *  Gemini forgot (neither merged nor listed as dropped) that isn't a duplicate is added back. */
export function applyMerge(candidates: ScanMergeCandidate[], merge: ScanMergeResult): ScanProduct[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const used = new Set<string>(merge.dropped_ids ?? []); // deliberately dropped: not sellable
  const products: ScanProduct[] = [];
  for (const { source_ids, ...fields } of merge.products ?? []) {
    const sources = (source_ids ?? [])
      .map((id) => byId.get(id))
      .filter((c): c is ScanMergeCandidate => !!c);
    if (!sources.length) continue; // not traceable to any detection: don't trust it
    sources.forEach((c) => used.add(c.id));
    products.push({ ...fields, boxes: toScanBoxes(sources.flatMap((c) => c.boxes)) });
  }
  for (const c of candidates) {
    if (used.has(c.id)) continue;
    const duplicate = products.some((p) =>
      c.boxes.length
        ? anyOverlap(c.boxes, p.boxes.map((b) => b.box_2d)) && nameSimilarity(c, p) > 0.15
        : nameSimilarity(c, p) >= 0.6
    );
    if (!duplicate) products.push(toProduct(c));
  }
  return products.sort(byValue);
}

/** Fallback when the merge call fails: group candidates whose boxes and names agree. */
export function geometricMerge(candidates: ScanMergeCandidate[]): ScanProduct[] {
  const parent = candidates.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  candidates.forEach((a, i) =>
    candidates.forEach((b, j) => {
      if (j <= i) return;
      const sameModel =
        a.model_number && b.model_number && a.model_number.toLowerCase() === b.model_number.toLowerCase();
      const strongBox = a.boxes.some((x) => b.boxes.some((y) => iou(x, y) > 0.5));
      const sim = nameSimilarity(a, b);
      const noBoxes = !a.boxes.length || !b.boxes.length;
      if (sameModel || strongBox || (anyOverlap(a.boxes, b.boxes) && sim >= 0.3) || (noBoxes && sim >= 0.6)) {
        parent[find(i)] = find(j);
      }
    })
  );
  const groups = new Map<number, ScanMergeCandidate[]>();
  candidates.forEach((c, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), c]));
  return [...groups.values()]
    .map((group) => {
      const best = group.reduce((a, b) => (b.confidence > a.confidence ? b : a));
      const product = toProduct(best, group.flatMap((c) => c.boxes));
      return { ...product, quantity: Math.max(...group.map((c) => c.quantity)) };
    })
    .sort(byValue);
}

export function totals(products: ScanProduct[]) {
  return {
    total_estimated_low_usd: products.reduce((n, p) => n + p.quantity * p.estimated_resale_low_usd, 0),
    total_estimated_high_usd: products.reduce((n, p) => n + p.quantity * p.estimated_resale_high_usd, 0),
  };
}
