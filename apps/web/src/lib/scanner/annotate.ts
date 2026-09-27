// Draw the found products on the scanned photo, for the "labeled image" shown above the results (the
// product cards below it carry the details, so there is no legend). Each product gets a rounded box and
// one pill label (number badge, name, price) placed so labels don't cover each other; extra units of
// the same product only get a small number badge.

import type { ScanAnalysis } from "@repo/types";
import { fitCanvas } from "./enhance";

const OUT_MIN_SIDE = 1600; // small photos are upscaled so labels stay readable
const OUT_MAX_SIDE = 2400;
const BRAND = "Omventa";

// Tailwind 500s: distinct from each other, and calm next to the app's orange theme
export const COLORS = [
  "#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#14b8a6",
  "#6366f1", "#f59e0b", "#ec4899", "#84cc16", "#06b6d4", "#d946ef",
] as const;

export const colorFor = (index: number): string => COLORS[index % COLORS.length]!;

type Rect = { x: number; y: number; w: number; h: number };

const usd = (low: number, high: number) =>
  `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}`;

/** The page's own font (next/font gives it a generated family name), so labels match the app. */
function appFont(): string {
  const family = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  return family || "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text && ctx.measureText(text + "…").width > maxWidth) text = text.slice(0, -1);
  return text.trimEnd() + "…";
}

const overlaps = (a: Rect, b: Rect, gap: number) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

const clampRect = (r: Rect, w: number, h: number, pad: number): Rect => ({
  ...r,
  x: Math.min(Math.max(r.x, pad), w - r.w - pad),
  y: Math.min(Math.max(r.y, pad), h - r.h - pad),
});

function withShadow(ctx: CanvasRenderingContext2D, unit: number, draw: () => void) {
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
  ctx.shadowBlur = unit * 1.2;
  ctx.shadowOffsetY = unit * 0.25;
  draw();
  ctx.restore();
}

/** White circle with the product number in its color. */
function numberBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  n: number,
  color: string,
  font: string
) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(r * 1.15)}px ${font}`;
  ctx.textAlign = "center";
  ctx.fillText(String(n), cx, cy + r * 0.05);
  ctx.textAlign = "left";
}

export function annotate(bitmap: ImageBitmap, analysis: ScanAnalysis): HTMLCanvasElement {
  const small = Math.max(bitmap.width, bitmap.height) < OUT_MIN_SIDE;
  const photo = fitCanvas(bitmap, small ? OUT_MIN_SIDE : OUT_MAX_SIDE, small);
  const { width: w, height: h } = photo;
  const unit = Math.max(w, h) / 100;
  const font = appFont();

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(photo, 0, 0);
  ctx.textBaseline = "middle";

  const toRect = (box: number[]): Rect => {
    const [ymin = 0, xmin = 0, ymax = 0, xmax = 0] = box;
    return {
      x: (xmin * w) / 1000,
      y: (ymin * h) / 1000,
      w: ((xmax - xmin) * w) / 1000,
      h: ((ymax - ymin) * h) / 1000,
    };
  };
  const products = analysis.products.map((p, i) => ({
    p,
    n: i + 1,
    color: colorFor(i),
    rects: p.boxes.map((b) => toRect(b.box_2d)),
  }));

  // --- boxes: dark halo for contrast on any background, then a tinted rounded outline ---
  const lineW = Math.max(2, unit * 0.32);
  for (const { color, rects } of products) {
    for (const r of rects) {
      const radius = Math.min(unit * 1.1, r.w / 5, r.h / 5);
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, radius);
      ctx.fillStyle = `${color}1f`; // ~12% tint
      ctx.fill();
      ctx.lineWidth = lineW * 2.4;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
      ctx.stroke();
      ctx.lineWidth = lineW;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  // --- labels: one pill per product, placed where it doesn't cover another label ---
  const pillH = unit * 2.7, pad = unit * 0.55, badgeR = pillH / 2 - unit * 0.35;
  const nameFont = `600 ${Math.round(unit * 1.3)}px ${font}`;
  const priceFont = `500 ${Math.round(unit * 1.2)}px ${font}`;
  const placed: Rect[] = [];

  for (const { p, n, color, rects } of products) {
    const anchor = rects[0];
    if (!anchor) continue;

    const price = usd(p.estimated_resale_low_usd, p.estimated_resale_high_usd);
    ctx.font = priceFont;
    const priceW = ctx.measureText(price).width;
    ctx.font = nameFont;
    // the pill may be wider than a narrow box, but not so wide it buries the photo
    const nameMax = Math.min(unit * 26, Math.max(unit * 15, anchor.w - (badgeR * 2 + priceW + pad * 5)));
    const name = truncate(ctx, p.name, nameMax);
    const nameW = ctx.measureText(name).width;
    const pillW = pad + badgeR * 2 + pad * 0.9 + nameW + pad * 1.2 + priceW + pad * 1.4;

    // above the box, inside its top edge, below it, ...; else the first spot anyway
    const gap = unit * 0.5;
    const candidates = [
      { x: anchor.x, y: anchor.y - pillH - gap },
      { x: anchor.x + gap, y: anchor.y + gap },
      { x: anchor.x, y: anchor.y + anchor.h + gap },
      { x: anchor.x + anchor.w - pillW, y: anchor.y - pillH - gap },
      { x: anchor.x + gap, y: anchor.y + anchor.h - pillH - gap },
    ].map((c) => clampRect({ ...c, w: pillW, h: pillH }, w, h, unit * 0.6));
    const spot =
      candidates.find((c) => placed.every((q) => !overlaps(c, q, unit * 0.3))) ?? candidates[0]!;
    placed.push(spot);

    withShadow(ctx, unit, () => {
      ctx.beginPath();
      ctx.roundRect(spot.x, spot.y, spot.w, spot.h, pillH / 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    const cy = spot.y + pillH / 2;
    numberBadge(ctx, spot.x + pad + badgeR, cy, badgeR, n, color, font);
    let x = spot.x + pad + badgeR * 2 + pad * 0.9;
    ctx.fillStyle = "#fff";
    ctx.font = nameFont;
    ctx.fillText(name, x, cy);
    x += nameW + pad * 1.2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.font = priceFont;
    ctx.fillText(price, x, cy);

    // extra units of the same product: just a number badge on their top-left corner
    for (const r of rects.slice(1)) {
      const br = unit * 1.05;
      const bx = r.x + br * 0.4, by = r.y + br * 0.4;
      withShadow(ctx, unit, () => {
        ctx.beginPath();
        ctx.arc(bx, by, br + unit * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      numberBadge(ctx, bx, by, br, n, color, font);
    }
  }

  // --- small brand tag, bottom right ---
  ctx.font = `600 ${Math.round(unit * 1.05)}px ${font}`;
  const tagText = `${BRAND} · AI Scan`;
  const tagW = ctx.measureText(tagText).width + unit * 2.4, tagH = unit * 2.2;
  const tx = w - tagW - unit * 1.2, ty = h - tagH - unit * 1.2;
  withShadow(ctx, unit, () => {
    ctx.beginPath();
    ctx.roundRect(tx, ty, tagW, tagH, tagH / 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
    ctx.fill();
  });
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.arc(tx + unit * 1.05, ty + tagH / 2, unit * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(tagText, tx + unit * 1.65, ty + tagH / 2);

  return out;
}
