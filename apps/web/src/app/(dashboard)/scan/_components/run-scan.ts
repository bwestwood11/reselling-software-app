import type { ScanAnalysis, ScanProduct, ScanTier } from "@repo/types";
import { scanApi } from "@/lib/api";
import {
  applyMerge,
  geometricMerge,
  toCandidates,
  toOriginalCoords,
  totals,
  type PassResult,
} from "@/lib/scanner/boxes";
import type { Job, Region } from "@/lib/scanner/enhance";

// How a scan is processed (enhanced views, zoomed tiles, the merge pass) is internal: the user only
// sees friendly progress steps and, if part of the photo failed, that some items may be missing.

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Opens a scan, runs the whole-photo + tile passes in parallel, then one merge call to
 *  de-duplicate what they found. `partial` is true when some of the passes failed. */
export async function runScan(
  tier: ScanTier,
  jobs: Job[],
  onStatus: (status: string) => void
): Promise<{ analysis: ScanAnalysis; partial: boolean }> {
  onStatus("Starting scan…");
  const { data: session } = await scanApi.start(tier);
  const regions: Record<string, Region> = Object.fromEntries(
    jobs.flatMap((j) => j.views.map((v) => [v.label, v.region]))
  );

  let done = 0;
  onStatus("Looking for resellable items…");
  const settled = await Promise.allSettled(
    jobs.map((job) =>
      scanApi
        .analyze({
          scanId: session.scanId,
          views: job.views,
          mode: job.mode,
        })
        .then(({ data }) => {
          if (jobs.length > 1) {
            onStatus(`Looking for resellable items… ${Math.round((++done / jobs.length) * 100)}%`);
          }
          return data;
        })
    )
  );

  const passes: PassResult[] = [];
  settled.forEach((s, i) => {
    const job = jobs[i]!;
    if (s.status === "rejected") return;
    const products = (s.value.products ?? []).map((p) => ({
      ...p,
      // a tile request only contains that tile, so its boxes are relative to it whatever "view" says
      boxes: toOriginalCoords(
        job.mode === "tile" ? (p.boxes ?? []).map((b) => ({ ...b, view: job.name })) : p.boxes,
        regions
      ),
    }));
    passes.push({ source: job.name, products });
  });
  if (!passes.length) {
    // every pass failed: they almost always fail for the same reason, so show the first one
    const first = settled.find((s) => s.status === "rejected");
    throw new Error(first ? message(first.reason) : "Something went wrong. Please try again.");
  }

  const first = settled[0];
  const scene = first?.status === "fulfilled" ? first.value.scene_description : "";
  const candidates = toCandidates(passes);
  let products: ScanProduct[];
  let sceneDescription = scene;
  if (passes.length === 1) {
    products = passes[0]!.products;
  } else if (!candidates.length) {
    products = [];
  } else {
    onStatus("Putting together your results…");
    try {
      const { data: merged } = await scanApi.merge({ scanId: session.scanId, candidates });
      products = applyMerge(candidates, merged);
      sceneDescription = merged.scene_description || scene;
    } catch {
      products = geometricMerge(candidates); // merge locally by box overlap instead
    }
  }

  return {
    analysis: { scene_description: sceneDescription, products, ...totals(products) },
    partial: passes.length < jobs.length,
  };
}

/** The eBay query for a product: the AI's own suggestion, else brand + model number (or name). */
export function ebayQuery(p: ScanProduct): string {
  if (p.ebay_search_query) return p.ebay_search_query;
  const brand = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? p.brand : "";
  return [brand, p.model_number || p.name].filter(Boolean).join(" ");
}
