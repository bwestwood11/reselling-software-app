import type {
  ScanAnalysis,
  ScanMergeCandidate,
  ScanMergeResult,
  ScanMode,
  ScanUsage,
  ScanViewPayload,
} from "@repo/types";

// Gemini calls for the photo scanner. The browser pre-processes the photo and sends the views; the
// API key, prompts and schemas stay here. The browser makes one "scene" call (whole photo) plus one
// "tile" call per zoomed crop, all in parallel, then one text-only "merge" call that de-duplicates
// everything they found.

// GEMINI_LITE=true forces the cheaper Lite models (e.g. for local development). Lite names items too
// generically for real resale pricing, so it never falls back to a Flash model; it only tries a second
// Lite model when the first is overloaded.
const liteMode = () => ["true", "1", "yes"].includes((process.env.GEMINI_LITE ?? "").toLowerCase());

export const geminiModel = () =>
  liteMode()
    ? process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite"
    : process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Tried in order when the main model is overloaded or rate-limited. 3.7 Flash costs the same as 3.8;
// 3.5 Flash (~2x the price) is a different model family, so it usually has capacity when both are busy.
// Comma-separated; GEMINI_FALLBACK_MODELS=none disables.
const modelChain = () => {
  if (liteMode()) return [...new Set([geminiModel(), "gemini-3.1-flash-lite"])];
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.7-flash,gemini-3.5-flash")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== "none");
  return [...new Set([geminiModel(), ...fallbacks])];
};

const SYSTEM_PROMPT = `You are an expert liquidation appraiser and reseller who inspects storehouse,
warehouse, garage and storage-unit photos to find items worth reselling.

For the image provided:
- Identify every distinct product that has meaningful resale value (skip trash, packaging,
  fixtures of the building, and items worth under ~$5 unless in bulk).
- Be as specific as possible: brand, product line, and model number. Read labels, logos and
  stickers in the image. Only give a model number if it is visible or you are confident;
  otherwise return null. Never invent serial numbers.
- Estimate realistic per-unit USD resale prices on the secondary market (eBay sold listings,
  Facebook Marketplace), accounting for visible condition. Give a low-high range.
- Group identical items and set quantity.
- Totals = sum over products of (quantity x per-unit price), for low and high.
- Order products by resale value, highest first.

You may receive several pre-processed views of the SAME photo, each preceded by its label:
- "original": the unedited photo. Use it for true colors, condition, and counting quantities.
- "enhanced": color-corrected, brightened and sharpened, to see into dark areas.
- "labels": high-contrast grayscale, to read brand names, stickers and model numbers.
- "tile r,c": zoomed-in overlapping crops of the photo (row r, column c) for small items.
All views show one scene. Merge what you see across them into a single list: an item visible
in several views or in overlapping tiles is ONE product, so do not double count it.

Locations: for each product give bounding boxes as box_2d = [ymin, xmin, ymax, xmax], integers
normalized to 0-1000 relative to the view named in "view". Draw each box tightly on the view where
the item is seen most clearly (a zoomed tile is fine). Give one box per unit (at most 10); for a
stack or pile of identical units give one box around the whole group. Draw each unit only once,
not once per view.`;

const TILE_PROMPT = `${SYSTEM_PROMPT}

This request contains ONE zoomed-in crop of a larger photo (the view labeled "tile r,c": row r,
column c of a grid). Other crops are analyzed separately, so focus only on this crop and be
exhaustive: list every resellable item you can see in it, including small items, items inside
clear bins, and items partly cut off at the crop edges (box the visible part). Put the crop's label
in each box's "view". The scene_description should describe just this crop.`;

const MERGE_PROMPT = `You merge product detections for a reseller. One storehouse photo was analyzed in
several parts: a "scene" pass over the whole photo, and "tile" passes over overlapping zoomed-in crops.
The same physical item is often reported by several passes, sometimes under different names
(e.g. "G.I. Joe comic" and "Marvel G.I. Joe #1 comic book"). Each candidate has an id, the pass it came
from, its fields, and boxes as [ymin, xmin, ymax, xmax] normalized 0-1000 on the ORIGINAL photo.
"overlaps" lists other candidates whose boxes overlap it, a strong hint of the same item.

Produce the final product list:
- Merge candidates that are the same physical item (overlapping boxes and compatible descriptions).
  List every merged candidate id in source_ids.
- Identical products at different places in the photo are separate units: merge them into one
  product and set quantity to the number of distinct units (don't add up quantities reported by
  several passes for the same units).
- Keep every distinct item. Do not drop a candidate unless it is a duplicate you merged, or clearly
  not a sellable product (packaging, bins, fixtures); list those in dropped_ids.
- For each product pick the most specific name, brand and model number seen in any source (never
  invent one), the best-informed per-unit USD price range, and a short eBay search query.
- Order products by total value (quantity x high price), highest first.
- scene_description: one or two sentences about the whole photo.`;

const VIEW_NOTES: Record<string, string> = {
  original: "original photo",
  enhanced: "enhanced (color-corrected, brightened, sharpened)",
  labels: "high-contrast grayscale for reading labels and model numbers",
};

const str = (description: string, nullable = false) => ({
  type: "STRING",
  description,
  ...(nullable && { nullable: true }),
});
const num = (description: string) => ({ type: "NUMBER", description });

const PRODUCT_PROPERTIES = {
  name: str("Product name, as specific as possible"),
  brand: str("Brand/manufacturer if identifiable", true),
  model_number: str("Model/part number if visible or confidently known, else null", true),
  category: str("e.g. Electronics, Tools, Furniture, Appliances"),
  quantity: { type: "INTEGER", description: "How many units of this item are visible" },
  condition: str("new, like new, used, worn, damaged, or unknown"),
  estimated_resale_low_usd: num("Low end of per-unit used resale price in USD"),
  estimated_resale_high_usd: num("High end of per-unit used resale price in USD"),
  resale_potential: str("high, medium, or low"),
  where_to_sell: str("Best channel, e.g. eBay, Facebook Marketplace, Craigslist"),
  confidence: num("0-1 confidence in the identification"),
  notes: str("Visible identifiers, defects, or reasoning", true),
  ebay_search_query: str(
    "Short eBay search query that finds this exact item: brand + model number, or brand + key terms. No condition words",
    true
  ),
  boxes: {
    type: "ARRAY",
    description: "Where the item is: one box per unit, or one box around a group",
    items: {
      type: "OBJECT",
      properties: {
        view: str("Label of the view this box was drawn on, e.g. 'original' or 'tile 1,0'"),
        box_2d: {
          type: "ARRAY",
          items: { type: "INTEGER" },
          description: "[ymin, xmin, ymax, xmax] normalized to 0-1000 within that view",
        },
      },
      required: ["view", "box_2d"],
    },
  },
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    scene_description: { type: "STRING" },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: PRODUCT_PROPERTIES,
        propertyOrdering: Object.keys(PRODUCT_PROPERTIES),
        required: [
          "name", "category", "quantity", "condition", "estimated_resale_low_usd",
          "estimated_resale_high_usd", "resale_potential", "where_to_sell", "confidence", "boxes",
        ],
      },
    },
    total_estimated_low_usd: { type: "NUMBER" },
    total_estimated_high_usd: { type: "NUMBER" },
  },
  required: ["scene_description", "products", "total_estimated_low_usd", "total_estimated_high_usd"],
  propertyOrdering: ["scene_description", "products", "total_estimated_low_usd", "total_estimated_high_usd"],
};

// merged products get their boxes from their source candidates, so Gemini doesn't return any
const MERGED_PROPERTIES = Object.fromEntries(
  Object.entries(PRODUCT_PROPERTIES).filter(([k]) => k !== "boxes")
);
const MERGE_SCHEMA = {
  type: "OBJECT",
  properties: {
    scene_description: { type: "STRING" },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          source_ids: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "ids of every candidate merged into this product",
          },
          ...MERGED_PROPERTIES,
        },
        propertyOrdering: ["source_ids", ...Object.keys(MERGED_PROPERTIES)],
        required: [
          "source_ids", "name", "category", "quantity", "condition", "estimated_resale_low_usd",
          "estimated_resale_high_usd", "resale_potential", "where_to_sell", "confidence",
        ],
      },
    },
    dropped_ids: {
      type: "ARRAY",
      items: { type: "STRING" },
      description:
        "ids of candidates deliberately left out because they are not sellable products (packaging, bins, fixtures)",
    },
  },
  required: ["scene_description", "products", "dropped_ids"],
  propertyOrdering: ["scene_description", "products", "dropped_ids"],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ErrorDetail = {
  "@type"?: string;
  retryDelay?: string;
  violations?: { quotaId?: string; quotaValue?: string }[];
};
type GeminiBody = {
  error?: { message?: string; details?: ErrorDetail[] };
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: UsageMetadata;
};
type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  promptTokensDetails?: { modality: string; tokenCount: number }[];
};

/** Read Google's 429 details: which quota was hit (per-day vs per-minute) and how long to wait. */
function quotaInfo(body: GeminiBody) {
  const details = body.error?.details ?? [];
  const violations = details.flatMap((d) => d.violations ?? []);
  const delay = details.find((d) => d["@type"]?.endsWith("RetryInfo"))?.retryDelay; // e.g. "53s"
  return {
    daily: violations.some((v) => /PerDay/i.test(v.quotaId ?? "")),
    limit: violations[0]?.quotaValue,
    retryMs: delay ? parseFloat(delay) * 1000 : undefined,
  };
}

// USD per 1M tokens (standard paid tier), from ai.google.dev/gemini-api/docs/pricing as of Sep 2026.
// Output price applies to output + thinking tokens. Override with GEMINI_PRICE_INPUT / GEMINI_PRICE_OUTPUT.
const INTRO_UNTIL = Date.UTC(2027, 0, 1); // 3.6-3.8 Flash launch pricing ends Dec 31, 2026, then doubles
const PRICES: Record<string, () => [number, number]> = {
  "gemini-3.8-flash": () => (Date.now() < INTRO_UNTIL ? [0.75, 3.75] : [1.5, 7.5]),
  "gemini-3.7-flash": () => (Date.now() < INTRO_UNTIL ? [0.75, 3.75] : [1.5, 7.5]),
  "gemini-3.6-flash": () => (Date.now() < INTRO_UNTIL ? [0.75, 3.75] : [1.5, 7.5]),
  "gemini-3.5-flash": () => [1.5, 9],
  "gemini-2.5-flash": () => [0.3, 2.5],
};

function costUsd(model: string, input: number, billedOutput: number): number | null {
  const envIn = Number(process.env.GEMINI_PRICE_INPUT);
  const envOut = Number(process.env.GEMINI_PRICE_OUTPUT);
  const [pin, pout] = envIn && envOut ? [envIn, envOut] : PRICES[model]?.() ?? [NaN, NaN];
  return Number.isNaN(pin) ? null : (input * pin + billedOutput * pout) / 1e6;
}

/** Token counts Gemini bills for one request (thinking tokens are billed as output). */
function toUsage(model: string, meta: UsageMetadata | undefined): ScanUsage {
  const input = meta?.promptTokenCount ?? 0;
  const output = meta?.candidatesTokenCount ?? 0;
  const thinking = meta?.thoughtsTokenCount ?? 0;
  return {
    model,
    input,
    input_image: (meta?.promptTokensDetails ?? [])
      .filter((d) => d.modality === "IMAGE")
      .reduce((sum, d) => sum + d.tokenCount, 0),
    output,
    thinking,
    cost_usd: costUsd(model, input, output + thinking),
  };
}

type Thinking = "low" | "medium" | "high";

/** Thinking level per request type; thinking is billed as output, so simple steps use less. */
const thinkingFor = (step: "scene" | "tile" | "merge"): Thinking | undefined => {
  const env = process.env[`GEMINI_THINKING_${step.toUpperCase()}`];
  if (env) return env as Thinking;
  return step === "scene" ? undefined : "low"; // scene reads labels/model numbers: keep the model's default
};

/** One generateContent call with JSON output. Retries transient errors and walks down modelChain()
 *  when a model stays overloaded or rate-limited. */
async function callGemini<T>(
  systemPrompt: string,
  parts: object[],
  schema: object,
  opts: { media?: boolean; thinking?: Thinking } = {}
): Promise<T & { usage: ScanUsage }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const chain = modelChain();
  let lastError = "";

  for (const model of chain) {
    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      responseSchema: schema,
    };
    if (model.startsWith("gemini-3")) {
      // Google recommends leaving Gemini 3 at its default temperature (1.0)
      if (opts.thinking) generationConfig.thinkingConfig = { thinkingLevel: opts.thinking };
    } else {
      generationConfig.temperature = 0.2;
    }
    // 1120 tokens/image, same as Gemini 3's default
    if (opts.media) generationConfig.mediaResolution = "MEDIA_RESOLUTION_HIGH";

    // each model: first try + one retry, then the next model
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts }],
            generationConfig,
          }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as GeminiBody;

      if (res.status === 429) {
        const quota = quotaInfo(body);
        lastError = quota.daily
          ? `${model}: daily quota used up (${quota.limit ?? "?"} requests/day, free tier): enable billing on the Google AI Studio project`
          : `${model}: rate limit hit`;
        const wait = quota.retryMs ?? 2000;
        if (!quota.daily && attempt === 0 && wait <= 5_000) {
          await sleep(wait + Math.random() * 500);
          continue;
        }
        break; // long wait or daily quota: move to the next model, which has its own limits
      }
      if ([500, 503, 504].includes(res.status)) {
        // e.g. "This model is currently experiencing high demand"
        lastError = `${model}: ${body.error?.message || `HTTP ${res.status}`}`;
        if (attempt === 0) {
          await sleep(1500 + Math.random() * 1000);
          continue;
        }
        break;
      }
      if (!res.ok) throw new Error(`${model}: ${body.error?.message || `HTTP ${res.status}`}`);
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!text) {
        const reason = candidate?.finishReason || body.promptFeedback?.blockReason || "unknown";
        throw new Error(`${model} returned no result (${reason})`);
      }
      return { ...(JSON.parse(text) as T), usage: toUsage(model, body.usageMetadata) };
    }
  }
  throw new Error(
    chain.length > 1 ? `all models failed (${chain.join(", ")}); last: ${lastError}` : lastError
  );
}

export async function analyzeViews(
  views: ScanViewPayload[],
  userPrompt = "",
  mode: ScanMode = "scene"
): Promise<ScanAnalysis & { usage: ScanUsage }> {
  const parts: object[] = [];
  for (const { label, data } of views) {
    const note = VIEW_NOTES[label] ?? `zoomed crop, grid position ${label.split(" ").pop()}`;
    parts.push({ text: `[View: ${label}] ${note}` }, { inlineData: { mimeType: "image/jpeg", data } });
  }
  parts.push({ text: userPrompt.trim() || "Find all resellable products in this image." });
  return callGemini<ScanAnalysis>(mode === "tile" ? TILE_PROMPT : SYSTEM_PROMPT, parts, SCHEMA, {
    media: true,
    thinking: thinkingFor(mode),
  });
}

export async function mergeCandidates(
  candidates: ScanMergeCandidate[],
  userPrompt = ""
): Promise<ScanMergeResult & { usage: ScanUsage }> {
  const parts = [
    { text: `Candidates:\n${JSON.stringify(candidates)}` },
    ...(userPrompt.trim()
      ? [{ text: `The user's instructions for the analysis were: ${userPrompt.trim()}` }]
      : []),
  ];
  return callGemini<ScanMergeResult>(MERGE_PROMPT, parts, MERGE_SCHEMA, {
    thinking: thinkingFor("merge"),
  });
}
