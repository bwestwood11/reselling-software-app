#!/usr/bin/env node
// Manually publish a listing to Mercari via Mercari's direct GraphQL API.
//
// Validated flow (see extension/background.js for the original in-browser version):
//   1. uploadTempListingPhotos  — multipart upload each image → Mercari uploadId (UUID)
//   2. createListing            — create the listing with those uploadIds
//
// KEY FINDINGS (empirically confirmed against www.mercari.com):
//   • The PHOTO UPLOAD works with a plain direct request (no proxy). It is NOT behind
//     Cloudflare's managed challenge and has no region gate.
//   • createListing IS region-gated ("ListingNotAllowedIpException") — it must originate
//     from a US IP. A raw request from a non-US / datacenter IP is also Cloudflare-
//     challenged. Routing createListing through ZenRows (js_render + US premium proxy)
//     solves Cloudflare AND satisfies the US-region requirement.
//   • Auth is just the Bearer access token (+ x-csrf-token). No session cookies needed.
//
// So: photos upload DIRECT; createListing goes through ZenRows by default. If you run this
// from a US residential IP you can set createTransport:"direct" and skip ZenRows entirely.
//
// Zero dependencies — uses Node's built-in fetch/FormData/Blob (Node >= 18, tested on 26).
//
// Usage:
//   node publish-mercari.mjs <config.json> [--dry-run]
//
// See listing.example.json and README.md for the config shape.

import { readFileSync } from "node:fs";

const MERCARI_API = "https://www.mercari.com/v1/api";
const ZENROWS_API = "https://api.zenrows.com/v1/";

// Persisted-query hashes — confirmed via live DevTools capture (see background.js).
const UPLOAD_PHOTOS_HASH = "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10";
const CREATE_LISTING_HASH = "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0";

const MERCARI_CONDITION_IDS = {
  NEW_WITH_TAGS: 1,
  NEW_WITHOUT_TAGS: 2,
  VERY_GOOD: 3,
  GOOD: 4,
  SATISFACTORY: 5,
};

// USPS Ground Advantage shipping-class IDs by weight (oz), maxWeightOz inclusive.
const MERCARI_SHIPPING_CLASSES = [
  { id: 2549, maxWeightOz: 4 },
  { id: 2550, maxWeightOz: 8 },
  { id: 2509, maxWeightOz: 12 },
  { id: 2552, maxWeightOz: 16 },
  { id: 2553, maxWeightOz: 32 },
  { id: 2554, maxWeightOz: 48 },
  { id: 2555, maxWeightOz: 64 },
  { id: 2556, maxWeightOz: 80 },
  { id: 2557, maxWeightOz: 96 },
];
const getShippingClassId = (oz = 0) =>
  (MERCARI_SHIPPING_CLASSES.find((c) => oz <= c.maxWeightOz) ?? { id: 2557 }).id;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const log = (...a) => console.log("[mercari]", ...a);
const die = (m) => {
  console.error("\n✗ " + m + "\n");
  process.exit(1);
};

function mercariHeaders(session, { json = true } = {}) {
  const h = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "apollo-require-preflight": "true",
    "x-platform": "web",
    "x-app-version": "1",
    "x-double-web": "1",
  };
  if (json) h["Content-Type"] = "application/json";
  if (session.accessToken) h["authorization"] = `Bearer ${session.accessToken}`;
  if (session.csrfToken) h["x-csrf-token"] = session.csrfToken;
  return h;
}

// ── Step 1: upload one image (DIRECT, no proxy) → uploadId ────────────────────────────

async function loadImageBlob(src) {
  // Local file path or remote URL.
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`image fetch ${res.status} for ${src}`);
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return new Blob([await res.arrayBuffer()], { type });
  }
  const buf = readFileSync(src);
  const type = src.endsWith(".png")
    ? "image/png"
    : src.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return new Blob([buf], { type });
}

async function uploadImage(src, session) {
  const blob = await loadImageBlob(src);
  const form = new FormData();
  form.append(
    "operations",
    JSON.stringify({
      operationName: "uploadTempListingPhotos",
      variables: { input: { photos: [null] } },
      extensions: { persistedQuery: { version: 1, sha256Hash: UPLOAD_PHOTOS_HASH } },
    })
  );
  form.append("map", JSON.stringify({ "1": ["variables.input.photos.0"] }));
  form.append("1", blob, "blob");

  const res = await fetch(MERCARI_API, {
    method: "POST",
    headers: mercariHeaders(session, { json: false }),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  if (data?.errors?.length) throw new Error(`upload GraphQL: ${data.errors[0].message}`);

  const uploadId =
    data?.data?.uploadTempListingPhotos?.uploadIds?.[0] ??
    data?.data?.uploadTempListingPhotos?.photos?.[0]?.id ??
    null;
  if (!uploadId) throw new Error(`no uploadId in response: ${JSON.stringify(data).slice(0, 200)}`);
  return uploadId;
}

// ── Step 2: build the createListing request body ──────────────────────────────────────

function buildCreateListingBody(listing, photoIds) {
  const {
    title,
    description = "",
    price, // cents
    condition = "GOOD",
    categoryId,
    brandId = null,
    sizeId = null,
    shippingPayerId = 1,
    shippingCost = null,
    shippingClassId = null,
    shippingPackageWeight = 8,
    shippingWeightUnit = "OUNCE",
    shippingDimensionUnit = "INCH",
    dimensions = null, // { length, width, height } in inches
    isShippingSoyo = false,
    offerConfig = null,
    zipCode = null,
  } = listing;

  if (!title) die("listing.title is required");
  if (!price || price <= 0) die("listing.price (cents) is required and must be > 0");
  if (!categoryId) die("listing.categoryId is required");
  if (!photoIds.length) die("at least one photo is required");

  const conditionId = MERCARI_CONDITION_IDS[condition] ?? 4;
  const weightClass = getShippingClassId(shippingPackageWeight);
  const classIds = isShippingSoyo ? [0] : [shippingClassId ?? weightClass];
  const suggestedClassIds = isShippingSoyo ? [0] : [weightClass];
  const payerId = isShippingSoyo ? 2 : (shippingPayerId ?? 1);
  const salesFee =
    payerId === 1 && shippingCost != null
      ? Math.floor((price + shippingCost) * 0.1)
      : Math.floor(price * 0.1);
  const minPriceForAutoPriceDrop = Math.ceil(price * 0.85);

  const d = dimensions ?? {};
  return {
    operationName: "createListing",
    variables: {
      input: {
        photoIds,
        name: title,
        description,
        price,
        conditionId,
        salesFee,
        categoryId: Number.parseInt(String(categoryId), 10),
        shippingPayerId: payerId,
        shippingClassIds: classIds,
        suggestedShippingClassIds: suggestedClassIds,
        shippingPackageWeight,
        shippingWeightUnit,
        shippingDimensionUnit,
        minPriceForAutoPriceDrop,
        ...(isShippingSoyo ? { isShippingSoyo } : {}),
        ...(d.length ? { shippingPackageLength: d.length } : {}),
        ...(d.width ? { shippingPackageWidth: d.width } : {}),
        ...(d.height ? { shippingPackageHeight: d.height } : {}),
        ...(offerConfig ? { offerConfig } : {}),
        ...(zipCode ? { zipCode: String(zipCode) } : {}),
        ...(brandId ? { brandId: Number.parseInt(String(brandId), 10) } : {}),
        ...(sizeId ? { sizeId: Number.parseInt(String(sizeId), 10) } : {}),
      },
    },
    extensions: { persistedQuery: { version: 1, sha256Hash: CREATE_LISTING_HASH } },
  };
}

// ── Step 2b: send createListing (via ZenRows US, or direct if on a US IP) ──────────────

async function sendCreateListing(body, session, config) {
  const transport = config.createTransport ?? "zenrows";
  const bodyStr = JSON.stringify(body);

  let res;
  if (transport === "direct") {
    res = await fetch(MERCARI_API, {
      method: "POST",
      headers: mercariHeaders(session),
      body: bodyStr,
    });
  } else {
    if (!config.zenrowsApiKey) die("createTransport is 'zenrows' but config.zenrowsApiKey is missing");
    const params = new URLSearchParams({
      apikey: config.zenrowsApiKey,
      url: MERCARI_API,
      js_render: "true",
      premium_proxy: "true",
      proxy_country: "us",
      custom_headers: "true",
      original_status: "true",
    });
    res = await fetch(`${ZENROWS_API}?${params}`, {
      method: "POST",
      headers: mercariHeaders(session),
      body: bodyStr,
    });
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    die(`createListing returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (data?.errors?.length) {
    const e = data.errors[0];
    const code = e?.extensions?.exception?.code;
    die(`createListing rejected by Mercari: "${e.message}"${code ? ` [${code}]` : ""}`);
  }
  const id = data?.data?.createListing?.id ?? null;
  return id;
}

// ── Main ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const configPath = args.find((a) => !a.startsWith("--"));
  if (!configPath) die("Usage: node publish-mercari.mjs <config.json> [--dry-run]");

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    die(`Could not read/parse "${configPath}": ${err.message}`);
  }

  const session = {
    accessToken: config.session?.accessToken,
    csrfToken: config.session?.csrfToken ?? null,
  };
  if (!session.accessToken) die("config.session.accessToken is required");

  const listing = config.listing ?? {};
  const images = listing.images ?? [];
  if (!images.length) die("listing.images must contain at least one image URL or file path");

  if (dryRun) {
    const body = buildCreateListingBody(listing, images.map((_, i) => `<uploadId-${i}>`));
    log("DRY RUN — images to upload:", JSON.stringify(images, null, 2));
    log("DRY RUN — createListing input:", JSON.stringify(body.variables.input, null, 2));
    log(`DRY RUN — createTransport: ${config.createTransport ?? "zenrows"}`);
    return;
  }

  log(`── Step 1: upload ${images.length} photo(s) DIRECT to Mercari ──`);
  const photoIds = [];
  for (const [i, src] of images.entries()) {
    try {
      const id = await uploadImage(src, session);
      log(`  ✓ [${i + 1}/${images.length}] ${id}  (${src})`);
      photoIds.push(id);
    } catch (err) {
      die(`photo upload failed for "${src}": ${err.message}`);
    }
  }

  log(`── Step 2: createListing via ${config.createTransport ?? "zenrows"} ──`);
  const body = buildCreateListingBody(listing, photoIds);
  const id = await sendCreateListing(body, session, config);

  if (id) {
    log(`✓ Listing created! Mercari item id: ${id}`);
    log(`  URL: https://www.mercari.com/us/item/${id}/`);
  } else {
    log("✓ createListing returned no error but no id — check your Mercari account.");
  }
}

main().catch((err) => {
  console.error("\n✗ Unexpected error:", err?.stack ?? err);
  process.exit(1);
});
