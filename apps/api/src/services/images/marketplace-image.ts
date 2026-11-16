// Shrinks listing photos before they are uploaded to a marketplace.
//
// Every byte of a photo uploaded through the residential proxy is billed, and a phone photo is
// typically 3–5 MB. Marketplaces display photos far smaller than that, so we normalise to
// ≤1200px on the long edge as a progressive JPEG — usually 100–150 KB, a 95%+ saving. 1200px
// still covers Mercari's full-size viewer and zoom; going smaller starts to look soft.
//
// Images are downloaded from our own storage DIRECTLY (never through the proxy).

import sharp from "sharp";

export interface PreparedImage {
  buffer: Buffer;
  contentType: "image/jpeg";
  originalBytes: number;
  bytes: number;
  width: number;
  height: number;
}

export interface PrepareImageOptions {
  /** Long-edge pixel cap. Default 1200. */
  maxDimension?: number;
  /** Target size; quality/dimension step down until under it (best effort). Default 150 KB. */
  targetBytes?: number;
}

const ATTEMPTS: Array<{ scale: number; quality: number }> = [
  { scale: 1, quality: 82 },
  { scale: 1, quality: 72 },
  { scale: 0.8, quality: 72 },
  { scale: 0.65, quality: 68 },
];

export async function prepareMarketplaceImage(
  input: Buffer,
  options: PrepareImageOptions = {}
): Promise<PreparedImage> {
  const maxDimension = options.maxDimension ?? 1200;
  const targetBytes = options.targetBytes ?? 150_000;

  let best: { buffer: Buffer; width: number; height: number } | null = null;

  for (const attempt of ATTEMPTS) {
    const dim = Math.round(maxDimension * attempt.scale);
    const { data, info } = await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation before the metadata is stripped
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true })
      // Background-removed PNGs are transparent; marketplaces render transparency as black.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: attempt.quality, mozjpeg: true, progressive: true })
      .toBuffer({ resolveWithObject: true });

    best = { buffer: data, width: info.width, height: info.height };
    if (data.length <= targetBytes) break;
  }

  // ATTEMPTS is non-empty, so best is always set.
  const out = best!;
  // Never make a photo bigger: an already-small JPEG can grow when re-encoded.
  const useOriginal = input.length <= out.buffer.length && (await isJpeg(input));
  const buffer = useOriginal ? input : out.buffer;

  return {
    buffer,
    contentType: "image/jpeg",
    originalBytes: input.length,
    bytes: buffer.length,
    width: out.width,
    height: out.height,
  };
}

async function isJpeg(buf: Buffer): Promise<boolean> {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** A photo URL that could not be fetched; `status` is the HTTP status (4xx = gone for good). */
export class ImageDownloadError extends Error {
  constructor(
    readonly status: number,
    url: string
  ) {
    super(`Image download failed (HTTP ${status}): ${url}`);
  }
}

/** Download an image from our own storage (direct — no proxy) and prepare it for upload. */
export async function downloadAndPrepareImage(
  url: string,
  options?: PrepareImageOptions
): Promise<PreparedImage> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new ImageDownloadError(res.status, url);
  const input = Buffer.from(await res.arrayBuffer());
  return prepareMarketplaceImage(input, options);
}
