// Browser-side preprocessing for the photo scanner: clean up the photo and build several views that
// make products easier to identify. All work happens on <canvas>, nothing is uploaded here.
//
//   original  - orientation-fixed, resized copy of the upload (ground truth for counting items)
//   enhanced  - white-balanced, contrast-stretched, brightened if dark, sharpened
//   labels    - high-contrast, sharpened grayscale to help read brand names and model numbers
//   tile r,c  - overlapping zoomed-in crops so small items on shelves get more pixels
//
// Pixel loops index typed arrays directly; every index is in range by construction, hence the `!`s.

export type Region = [number, number, number, number]; // x0, y0, x1, y1 as fractions of the photo
export type ViewCanvas = { label: string; canvas: HTMLCanvasElement; region: Region };
export type EncodedView = { label: string; blob: Blob; region: Region }; // blob = JPEG, sent as a file
/** One Gemini request: the whole-scene views together, or a single zoomed tile. */
export type Job = { mode: "scene" | "tile"; name: string; views: EncodedView[] };

const MAX_SIDE = 2048; // main views are capped here; Gemini tiles large images internally anyway
const MIN_SIDE = 1600; // smaller uploads are upscaled before editing so sharpening doesn't eat detail
const TILE_SIDE = 1536; // zoomed crops are resized to this long side
const FULL: Region = [0, 0, 1, 1];

export async function loadImage(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" }); // phones store rotation in EXIF
}

function fitSize(w: number, h: number, side: number, upscale = false): [number, number] {
  const scale = side / Math.max(w, h);
  if (scale >= 1 && !upscale) return [w, h];
  return [Math.round(w * scale), Math.round(h * scale)];
}

export function drawToCanvas(
  src: CanvasImageSource,
  w: number,
  h: number,
  crop?: { sx: number; sy: number; sw: number; sh: number }
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  if (crop) ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  else ctx.drawImage(src, 0, 0, w, h);
  return canvas;
}

export function fitCanvas(
  src: CanvasImageSource & { width: number; height: number },
  side: number,
  upscale = false
) {
  const [w, h] = fitSize(src.width, src.height, side, upscale);
  return drawToCanvas(src, w, h);
}

const luma = (d: Uint8ClampedArray, i: number) =>
  0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;

/** Gray-world white balance: removes yellow/blue casts from warehouse lighting. */
function whiteBalance(d: Uint8ClampedArray) {
  let r = 0, g = 0, b = 0, n = 0;
  // every 4th pixel is plenty
  for (let i = 0; i < d.length; i += 16) {
    r += d[i]!;
    g += d[i + 1]!;
    b += d[i + 2]!;
    n++;
  }
  const means = [r / n, g / n, b / n];
  const gray = (r + g + b) / n / 3;
  // clamp to avoid wild shifts
  const [gr, gg, gb] = means.map((m) => Math.min(Math.max(gray / Math.max(m, 1), 0.7), 1.4)) as [
    number,
    number,
    number,
  ];
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i]! * gr;
    d[i + 1] = d[i + 1]! * gg;
    d[i + 2] = d[i + 2]! * gb;
  }
}

function percentiles(hist: Uint32Array, total: number, cutoff: number): [number, number] {
  const skip = total * cutoff;
  let lo = 0, hi = 255, acc = 0;
  for (; lo < 255; lo++) {
    acc += hist[lo]!;
    if (acc > skip) break;
  }
  acc = 0;
  for (; hi > 0; hi--) {
    acc += hist[hi]!;
    if (acc > skip) break;
  }
  return [lo, hi];
}

/** Contrast-stretch luminance only (shift each pixel's RGB equally), so white-balanced colors are kept. */
function stretchContrast(d: Uint8ClampedArray, cutoff = 0.01) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[Math.round(luma(d, i))]!++;
  const [lo, hi] = percentiles(hist, d.length / 4, cutoff);
  if (hi <= lo) return;
  const k = 255 / (hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const y = luma(d, i);
    const delta = Math.min(255, Math.max(0, (y - lo) * k)) - y;
    d[i] = d[i]! + delta;
    d[i + 1] = d[i + 1]! + delta;
    d[i + 2] = d[i + 2]! + delta;
  }
}

/** Gamma-lift dim photos (typical of storage units) without blowing out bright ones. */
function brightenIfDark(d: Uint8ClampedArray) {
  let sum = 0;
  for (let i = 0; i < d.length; i += 16) sum += luma(d, i);
  const mean = sum / (d.length / 16);
  if (mean >= 110) return;
  const gamma = Math.max(0.5, mean / 110); // darker image -> stronger lift
  const lut = new Uint8ClampedArray(256).map((_, v) => Math.round(255 * (v / 255) ** gamma));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]!]!;
    d[i + 1] = lut[d[i + 1]!]!;
    d[i + 2] = lut[d[i + 2]!]!;
  }
}

function gaussianKernel(sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  return k.map((v) => v / sum);
}

/** Separable Gaussian blur of the RGB channels. */
function blur(d: Uint8ClampedArray, w: number, h: number, sigma: number): Float32Array {
  const k = gaussianKernel(sigma);
  const r = (k.length - 1) / 2;
  const tmp = new Float32Array(d.length);
  const out = new Float32Array(d.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let j = -r; j <= r; j++) {
          const xx = Math.min(w - 1, Math.max(0, x + j));
          acc += d[(y * w + xx) * 4 + c]! * k[j + r]!;
        }
        tmp[(y * w + x) * 4 + c] = acc;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let j = -r; j <= r; j++) {
          const yy = Math.min(h - 1, Math.max(0, y + j));
          acc += tmp[(yy * w + x) * 4 + c]! * k[j + r]!;
        }
        out[(y * w + x) * 4 + c] = acc;
      }
    }
  }
  return out;
}

/** Same semantics as Pillow's UnsharpMask(radius, percent, threshold). */
function unsharpMask(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  percent: number,
  threshold: number
) {
  const blurred = blur(d, w, h, radius);
  const amount = percent / 100;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = d[i + c]! - blurred[i + c]!;
      if (Math.abs(diff) >= threshold) d[i + c] = d[i + c]! + diff * amount;
    }
  }
}

function withPixels(
  canvas: HTMLCanvasElement,
  fn: (d: Uint8ClampedArray, w: number, h: number) => void
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  fn(img.data, canvas.width, canvas.height);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function cloneCanvas(src: HTMLCanvasElement) {
  return drawToCanvas(src, src.width, src.height);
}

export function enhance(src: HTMLCanvasElement): HTMLCanvasElement {
  return withPixels(cloneCanvas(src), (d, w, h) => {
    whiteBalance(d);
    stretchContrast(d);
    brightenIfDark(d); // after stretching, so the final image ends up well exposed
    // no denoise filter: on low-res photos it smears the small text we most need to read
    unsharpMask(d, w, h, 1.5, 90, 3);
  });
}

export function labelView(src: HTMLCanvasElement): HTMLCanvasElement {
  return withPixels(cloneCanvas(src), (d, w, h) => {
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const y = Math.round(luma(d, i));
      d[i] = d[i + 1] = d[i + 2] = y;
      hist[y]!++;
    }
    // plain stretch: equalizing posterizes and halos
    const [lo, hi] = percentiles(hist, d.length / 4, 0.02);
    const k = hi > lo ? 255 / (hi - lo) : 1;
    for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = (d[i]! - lo) * k;
    unsharpMask(d, w, h, 1, 150, 2);
  });
}

/** Overlapping grid crops, so items on a tile border still appear whole in one tile. */
function* tiles(src: HTMLCanvasElement, rows: number, cols: number, overlap = 0.15) {
  const { width: w, height: h } = src;
  const tw = w / cols, th = h / rows, ox = tw * overlap, oy = th * overlap;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.max(0, Math.round(c * tw - ox));
      const y0 = Math.max(0, Math.round(r * th - oy));
      const x1 = Math.min(w, Math.round((c + 1) * tw + ox));
      const y1 = Math.min(h, Math.round((r + 1) * th + oy));
      const [cw, ch] = fitSize(x1 - x0, y1 - y0, TILE_SIDE, Math.max(x1 - x0, y1 - y0) < TILE_SIDE);
      const crop = drawToCanvas(src, cw, ch, { sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0 });
      const region: Region = [x0 / w, y0 / h, x1 / w, y1 / h];
      yield { label: `tile ${r},${c}`, canvas: crop, region };
    }
  }
}

/** grid: tiles per side (2 -> 2x2, 3 -> 3x3); 0 for no tiles. */
export function buildViews(bitmap: ImageBitmap, useEnhance = true, grid = 2): ViewCanvas[] {
  const views: ViewCanvas[] = [
    { label: "original", canvas: fitCanvas(bitmap, MAX_SIDE), region: FULL },
  ];
  let source =
    Math.max(bitmap.width, bitmap.height) < MIN_SIDE
      ? fitCanvas(bitmap, MIN_SIDE, true)
      : drawToCanvas(bitmap, bitmap.width, bitmap.height);
  if (useEnhance) {
    source = enhance(source);
    views.push({ label: "enhanced", canvas: fitCanvas(source, MAX_SIDE), region: FULL });
    views.push({ label: "labels", canvas: fitCanvas(labelView(source), MAX_SIDE), region: FULL });
  }
  if (grid > 0) views.push(...tiles(source, grid, grid));
  return views;
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality)
  );

/** Encode views as JPEG, lowering quality until the request fits the API's upload limit. */
async function encodeViews(views: ViewCanvas[], budget: number): Promise<EncodedView[]> {
  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
    const encoded = await Promise.all(
      views.map(async (v) => ({ label: v.label, region: v.region, blob: await toJpeg(v.canvas, quality) }))
    );
    if (encoded.reduce((n, v) => n + v.blob.size, 0) <= budget) return encoded;
  }
  throw new Error("Image too detailed to fit the upload limit; try fewer tiles");
}

/** Split views into requests (one for the whole scene, one per tile), each within `budget` bytes. */
export async function encodeJobs(views: ViewCanvas[], budget = 3_000_000): Promise<Job[]> {
  const scene = views.filter((v) => !v.label.startsWith("tile"));
  const tiles = views.filter((v) => v.label.startsWith("tile"));
  return [
    { mode: "scene", name: "scene", views: await encodeViews(scene, budget) },
    ...(await Promise.all(
      tiles.map(async (v): Promise<Job> => ({ mode: "tile", name: v.label, views: await encodeViews([v], budget) }))
    )),
  ];
}
