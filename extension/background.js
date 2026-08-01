// Service worker — waits on the ReList API for pending Mercari jobs and publishes via direct API.
//
// LATENCY BUDGET — a publish must complete within ~5s of the user hitting Publish. What that
// requires, and how it is achieved here:
//   • Job pickup: LONG POLL (`/jobs/pending?wait=`) instead of a fixed interval. The old 30s
//     setInterval alone cost 0–30s before any work started; the server now holds the request open
//     and answers within ~750ms of the job being created.
//   • One Mercari tab per job, kept warm. Photo upload and createListing previously each called
//     withMercariTab(), so a cold job paid for TWO full mercari.com page loads and threw the tab
//     away in between. The tab is now reused and closed only after TAB_IDLE_CLOSE_MS idle, so a
//     burst of publishes pays the page load once.
//   • Tab readiness is detected by retrying injection, not by waiting for status "complete" —
//     fetch from page context works as soon as the document has an origin.
//   • Images are downloaded in parallel and uploaded in parallel (they were sequential).
//   • Mercari's access + CSRF tokens come from ONE cached /session call (they were two uncached
//     calls per job, plus a redundant /connections pre-check).

const API_BASE = "https://api.omventa.com";

// How long the server may hold a /jobs/pending request open. Keep below typical proxy idle
// timeouts (~30s) so the connection is not cut mid-wait.
const POLL_WAIT_SECONDS = 25;
// Gap between long polls. Small because the server already did the waiting.
const POLL_GAP_MS = 250;
// Pause before retrying after a network/server error, so a flapping API is not hammered.
const POLL_ERROR_BACKOFF_MS = 3_000;
// Keep the Mercari tab open this long after a job, so consecutive publishes skip the page load.
const TAB_IDLE_CLOSE_MS = 60_000;
// Mercari session tokens are stable; re-fetching them per job added a round trip for nothing.
const SESSION_CACHE_TTL_MS = 5 * 60_000;

let activeJobId = null;
let polling = false;
let stopRequested = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getToken() {
  const { authToken } = await chrome.storage.local.get("authToken");
  return authToken ?? null;
}

async function setToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

async function clearToken() {
  await chrome.storage.local.remove("authToken");
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      // Token is expired or revoked — clear it so the popup shows the login form
      await clearToken();
      throw new Error("Not authenticated");
    }
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Login failed");

  // Better Auth returns the session token in the response body
  const token = data.token ?? data.session?.token;
  if (!token) throw new Error("No token in response");

  await setToken(token);
  return token;
}

export async function logout() {
  await clearToken();
  stopPolling();
  chrome.action.setBadgeText({ text: "" });
}

// ── Job processing ────────────────────────────────────────────────────────────

const MERCARI_BASE = "https://www.mercari.com";

// Confirmed condition IDs from Mercari's sell form (2025-04) — integers, not strings
const MERCARI_CONDITION_IDS = {
  NEW_WITH_TAGS: 1,
  NEW_WITHOUT_TAGS: 2,
  VERY_GOOD: 3,
  GOOD: 4,
  SATISFACTORY: 5,
};

async function patchJob(id, update) {
  return apiFetch(`/api/mercari/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

/**
 * Run one job handed over by the long poll.
 *
 * The PROCESSING claim is sent WITHOUT blocking: awaiting it before starting work added a full
 * API round trip to every publish. The terminal patch waits on it so the two cannot land out of
 * order (which would leave the job stuck at PROCESSING).
 */
async function runJob(job) {
  if (activeJobId) return;
  activeJobId = job.id;

  const claim = patchJob(job.id, { status: "PROCESSING" }).catch(() => {});
  const started = Date.now();

  try {
    if (job.payload?.type === "fetch-addresses") {
      // ── fetch-addresses job — no listing, no form ─────────────────────────
      const bearerToken = await getMercariBearerToken();
      const addresses = await withMercariTab((tabId) => fetchDeliveryAddresses(tabId, bearerToken));
      await claim;
      await patchJob(job.id, { status: "COMPLETED", addresses });
      console.log(`[relist] job ${job.id} (fetch-addresses) done in ${Date.now() - started}ms`);
      return;
    }

    // ── Publish: direct Mercari API calls from a real mercari.com tab ───────
    const externalId = await postToMercariApi(job);
    await claim;
    await patchJob(job.id, { status: "COMPLETED", externalId: externalId ?? undefined });
    console.log(`[relist] job ${job.id} published in ${Date.now() - started}ms`);
  } catch (err) {
    console.error("[relist] job failed:", err.message);

    if (err.message === "Not authenticated") {
      // apiFetch already cleared the token; stop polling and show the ! badge
      stopPolling();
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return;
    }

    await claim;
    await patchJob(job.id, {
      status: "FAILED",
      errorMessage: err.message ?? "Mercari publish error",
    }).catch(() => {});
  } finally {
    activeJobId = null;
  }
}

// ── Mercari direct API posting ────────────────────────────────────────────────
// The extension service worker runs in Chrome's real browser context, so
// Cloudflare Bot Management does not block these requests. Session cookies set
// during the Connect Mercari flow are sent automatically via credentials:"include".

async function postToMercariApi(job) {
  // No /connections pre-check: /session below is the same authorization signal and one fewer
  // round trip. It 404s when Mercari isn't connected, which surfaces as a clear job error.
  const {
    title,
    description,
    price,
    condition,
    images = [],
    categoryId,
    brandId,
    sizeId,
    shippingPayerId,
    shippingCost,
    shippingClassId,
    shippingPackageWeight,
    shippingWeightUnit,
    shippingPackageWidth,
    shippingPackageHeight,
    shippingPackageLength,
    shippingDimensionUnit,
    isShippingSoyo,
    offerConfig,
    zipCode,
  } = job.payload;

  if (!categoryId) {
    throw new Error("categoryId is required for Mercari listings — select a category before publishing");
  }

  // Warm the tab, the Mercari session and the image bytes CONCURRENTLY. The tab load is the
  // slowest of the three on a cold start, so overlapping them removes it from the critical path.
  const t0 = Date.now();
  const [, , imageData] = await Promise.all([
    acquireMercariTab(),
    getMercariSession(),
    downloadImages(images),
  ]);
  console.log(`[relist] warmup (tab+session+images) ${Date.now() - t0}ms`);

  try {
    // Step 1 — upload images to Mercari's CDN, get UUID photoIds back
    const tUpload = Date.now();
    const photoIds = await uploadImagesToMercari(imageData);
    console.log(`[relist] uploaded ${photoIds.length} photo(s) in ${Date.now() - tUpload}ms`);

    // Step 2 — create the listing via Mercari's GraphQL API (same warm tab)
    const tCreate = Date.now();
    const id = await createMercariListing({
      title,
      description,
      price,
      condition,
      photoIds,
      categoryId,
      brandId,
      sizeId,
      shippingPayerId,
      shippingCost,
      shippingClassId,
      shippingPackageWeight,
      shippingWeightUnit,
      shippingPackageWidth,
      shippingPackageHeight,
      shippingPackageLength,
      shippingDimensionUnit,
      isShippingSoyo,
      offerConfig,
      zipCode,
    });
    console.log(`[relist] createListing ${Date.now() - tCreate}ms — total ${Date.now() - t0}ms`);
    return id;
  } finally {
    // Hand the tab back; it stays warm for TAB_IDLE_CLOSE_MS so the next publish skips the load.
    releaseMercariTab();
  }
}

// The extension service worker runs in an isolated cookie partition — credentials:"include"
// does NOT send the user's mercari.com browser cookies. We work around this by injecting
// fetch calls into a real mercari.com tab where the session cookies are naturally present.

// Warm-tab state. The tab is closed on an idle timer rather than at the end of each call, so the
// upload step and the createListing step of one job — and consecutive jobs — share a single loaded
// mercari.com page instead of loading it once per step.
let warmTabId = null;
let warmTabIsOurs = false;
let warmTabCloseTimer = null;

/**
 * Resolve a mercari.com tab we can inject into, reusing the warm one when possible.
 * Waits only until the document has a mercari.com origin (page-context fetch works from then on),
 * which is much sooner than status === "complete" on a heavy Next.js page.
 */
async function acquireMercariTab() {
  if (warmTabCloseTimer) {
    clearTimeout(warmTabCloseTimer);
    warmTabCloseTimer = null;
  }

  if (warmTabId != null) {
    try {
      await chrome.tabs.get(warmTabId);
      return warmTabId; // already loaded and cookie-primed
    } catch {
      warmTabId = null; // user closed it
    }
  }

  const [existing] = await chrome.tabs.query({ url: "https://www.mercari.com/*" });
  if (existing) {
    warmTabId = existing.id;
    warmTabIsOurs = false;
  } else {
    const tab = await chrome.tabs.create({ url: `${MERCARI_BASE}/`, active: false });
    warmTabId = tab.id;
    warmTabIsOurs = true;
  }

  // Pre-populate the browser's cookie jar from the stored session so the tab is authenticated
  // even if the user hasn't visited mercari.com recently. Only needed on a cold acquire.
  await restoreMercariCookies();
  await waitForInjectable(warmTabId);
  return warmTabId;
}

/** Schedule the warm tab's close. Tabs the user already had open are never closed. */
function releaseMercariTab() {
  if (warmTabId == null || !warmTabIsOurs) return;
  if (warmTabCloseTimer) clearTimeout(warmTabCloseTimer);
  warmTabCloseTimer = setTimeout(() => {
    const id = warmTabId;
    warmTabId = null;
    warmTabCloseTimer = null;
    if (id != null) chrome.tabs.remove(id).catch(() => {});
  }, TAB_IDLE_CLOSE_MS);
}

/**
 * Wait until chrome.scripting can run in the tab AND the document is on mercari.com. Injection
 * throws while the tab is still on about:blank or mid-navigation, so we retry rather than waiting
 * for a load event — this typically returns hundreds of ms before "complete".
 */
async function waitForInjectable(tabId, timeoutMs = 25_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => location.origin,
      });
      if (res?.result === MERCARI_BASE) return;
    } catch (err) {
      lastError = err;
    }
    await sleep(100);
  }
  throw new Error(`Mercari tab not ready: ${lastError?.message ?? "timed out"}`);
}

async function withMercariTab(fn) {
  const tabId = await acquireMercariTab();
  try {
    return await fn(tabId);
  } finally {
    releaseMercariTab();
  }
}

// Confirmed via live DevTools capture (2025-05):
//   operationName: "uploadTempListingPhotos"
//   sha256Hash: "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10"
//   Uses Apollo multipart upload spec (operations + map + file fields).
//   Returns photo UUIDs used as photoIds in createListing.
/**
 * Fetch the listing images in the service worker, IN PARALLEL, as base64.
 * The injected script runs under mercari.com's CORS policy and cannot fetch cross-origin S3/CDN
 * URLs; the service worker has no such restriction. Failed images are skipped, order is preserved.
 */
async function downloadImages(imageUrls) {
  if (!imageUrls?.length) return [];
  const results = await Promise.all(
    imageUrls.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn("[relist] Image fetch failed:", url, res.status);
          return null;
        }
        const buffer = await res.arrayBuffer();
        const type = res.headers.get("content-type") ?? "image/jpeg";
        // Convert ArrayBuffer → base64 in chunks to avoid stack overflow on large files
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const CHUNK = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        return { base64: btoa(binary), type };
      } catch (err) {
        console.warn("[relist] Image fetch error:", err.message);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

async function uploadImagesToMercari(imageDataList) {
  if (imageDataList.length === 0) {
    console.warn("[relist] No images could be fetched — aborting upload");
    return [];
  }

  // multipart/form-data is a "simple" CORS request type, so Mercari enforces Bearer auth on the
  // upload endpoint (unlike JSON createListing calls). The service worker can read httpOnly
  // cookies; the injected script cannot.
  const bearerToken = await getMercariBearerToken();

  // Upload from within the mercari.com tab (already warm — see postToMercariApi).
  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (images, token) => {
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          // Resolve the Bearer token ONCE for all photos, not per photo.
          if (!token) {
            token = await (async () => {
              // Strategy 1: /v1/initialize — stable endpoint, returns { accessToken } at top level
              try {
                const r = await fetch("https://www.mercari.com/v1/initialize", { credentials: "include" });
                if (r.ok) { const d = await r.json().catch(() => null); if (d?.accessToken) return d.accessToken; }
              } catch {}
              // Strategy 2: __NEXT_DATA__ (already in page — no network needed)
              const JWT_RE = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/;
              const scanObj = (obj, depth = 0) => {
                if (!obj || typeof obj !== "object" || depth > 10) return null;
                for (const [k, v] of Object.entries(obj)) {
                  if (typeof v === "string" && (k === "accessToken" || k === "access_token") && v.length > 20) return v;
                  if (typeof v === "string" && v.length > 100 && JWT_RE.test(v)) return v;
                  const found = scanObj(v, depth + 1);
                  if (found) return found;
                }
                return null;
              };
              try { const t = scanObj(window.__NEXT_DATA__?.props); if (t) return t; } catch {}
              // Strategy 3: _mwus cookie (may be non-httpOnly)
              try {
                const m = document.cookie.match(/(?:^|;\s*)_mwus=([^;]+)/);
                if (m) { const p = JSON.parse(atob(decodeURIComponent(m[1]))); if (p?.accessToken) return p.accessToken; }
              } catch {}
              return null;
            })();
          }

          const headers = {
            "apollo-require-preflight": "true",
            "x-platform": "web",
            "x-app-version": "1",
            "x-double-web": "1",
          };
          if (token) headers["authorization"] = `Bearer ${token}`;

          // Upload all photos CONCURRENTLY. Promise.all preserves order, so photoIds keep the
          // user's chosen photo order; failures become null and are dropped afterwards.
          const uploadOne = async ({ base64, type }) => {
            try {
              // Reconstruct Blob from base64 (passed from service worker)
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type });

              const form = new FormData();
              form.append(
                "operations",
                JSON.stringify({
                  operationName: "uploadTempListingPhotos",
                  variables: { input: { photos: [null] } },
                  extensions: {
                    persistedQuery: {
                      version: 1,
                      sha256Hash:
                        "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10",
                    },
                  },
                })
              );
              form.append("map", JSON.stringify({ "1": ["variables.input.photos.0"] }));
              form.append("1", blob, "blob");

              const res = await fetch("https://www.mercari.com/v1/api", {
                method: "POST",
                credentials: "include",
                headers,
                body: form,
              });

              const data = await res.json().catch(() => ({}));

              if (!res.ok) {
                console.warn("[relist] Upload rejected:", res.status, data);
                return null;
              }

              if (data?.errors?.length) {
                console.warn("[relist] GraphQL errors:", data.errors);
                return null;
              }

              // Extract photo ID from uploadTempListingPhotos GraphQL response
              const result = data?.data?.uploadTempListingPhotos;
              let photoId = null;

              if (result) {
                const photos = result.photos ?? result.tempPhotos ?? [];
                if (Array.isArray(photos) && photos.length > 0) {
                  photoId = photos[0]?.id ?? photos[0]?.key ?? null;
                  if (!photoId && typeof photos[0] === "string") photoId = photos[0];
                }
                if (!photoId) {
                  const flat = result.photoIds ?? result.ids ?? [];
                  if (Array.isArray(flat) && flat.length > 0) photoId = flat[0];
                }
              }

              // Fallback: scan entire response tree for first UUID
              if (!photoId) {
                const scan = (obj, depth = 0) => {
                  if (depth > 5 || !obj || typeof obj !== "object") return null;
                  for (const val of Object.values(obj)) {
                    if (typeof val === "string" && UUID_RE.test(val)) return val;
                    const nested = scan(val, depth + 1);
                    if (nested) return nested;
                  }
                  return null;
                };
                photoId = scan(data);
              }

              if (photoId) return String(photoId);
              console.warn("[relist] Could not extract photoId from:", JSON.stringify(data));
              return null;
            } catch (err) {
              console.warn("[relist] Upload error:", err.message);
              return null;
            }
          };

          const settled = await Promise.all(images.map(uploadOne));
          return settled.filter(Boolean);
        },
        args: [imageDataList, bearerToken],
      })
      .then((results) => results[0]?.result ?? [])
  );
}

// Mercari's access token + CSRF token, both from ONE /session call and cached.
// The service worker has no Mercari session cookies, so it reads these from the ReList API and
// hands them to injected scripts. Previously each was a separate uncached request per job.
let sessionCache = null; // { accessToken, csrfToken, fetchedAt }

async function getMercariSession(force = false) {
  if (!force && sessionCache && Date.now() - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS) {
    return sessionCache;
  }
  try {
    const relistToken = await getToken();
    const res = await fetch(`${API_BASE}/api/marketplaces/mercari/session`, {
      headers: { Authorization: `Bearer ${relistToken}` },
    });
    const data = await res.json().catch(() => ({}));
    sessionCache = {
      accessToken: data.data?.accessToken ?? null,
      csrfToken: data.data?.csrfToken ?? null,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.warn("[relist] getMercariSession failed:", err.message);
    sessionCache = { accessToken: null, csrfToken: null, fetchedAt: Date.now() };
  }
  return sessionCache;
}

async function getMercariBearerToken() {
  return (await getMercariSession()).accessToken;
}

// Confirmed via live DevTools capture (2025-05):
//   operationName: "createListing"
//   sha256Hash: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0"
//   Uses Apollo Automatic Persisted Queries — NO inline query string.
//   photoIds = UUID strings; conditionId/brandId/sizeId/categoryId = integers; price = cents.
//   salesFee ≈ price * 0.10; minPriceForAutoPriceDrop ≈ price * 0.80 (confirmed from traffic).
// USPS Ground Advantage shipping class IDs by weight range (oz).
// Confirmed from Mercari's shipping class table (2025-05).
// minWeight is inclusive, maxWeight is inclusive (oz).
const MERCARI_SHIPPING_CLASSES = [
  { id: 2549, maxWeightOz: 4 },   // 0.25 lb (0–4 oz)
  { id: 2550, maxWeightOz: 8 },   // 0.5 lb  (5–8 oz)
  { id: 2509, maxWeightOz: 12 },  // 0.75 lb (9–12 oz)
  { id: 2552, maxWeightOz: 16 },  // 1 lb    (13–16 oz)
  { id: 2553, maxWeightOz: 32 },  // 2 lb    (17–32 oz)
  { id: 2554, maxWeightOz: 48 },  // 3 lb    (33–48 oz)
  { id: 2555, maxWeightOz: 64 },  // 4 lb    (49–64 oz)
  { id: 2556, maxWeightOz: 80 },  // 5 lb    (65–80 oz)
  { id: 2557, maxWeightOz: 96 },  // 6 lb    (81–96 oz)
];

function getShippingClassId(weightOz = 0) {
  const match = MERCARI_SHIPPING_CLASSES.find((c) => weightOz <= c.maxWeightOz);
  return match ? match.id : 2557; // fall back to 6 lb for heavier items
}

async function createMercariListing(params) {
  const {
    title,
    description,
    price,
    condition,
    photoIds,
    categoryId,
    brandId,
    sizeId,
    shippingPayerId = 1,
    shippingCost = null,
    shippingClassId = null,
    shippingPackageWeight = 8,
    shippingWeightUnit = "OUNCE",
    shippingPackageWidth = null,
    shippingPackageHeight = null,
    shippingPackageLength = null,
    shippingDimensionUnit = "INCH",
    isShippingSoyo = false,
    offerConfig = null,
    zipCode = null,
  } = params;

  const conditionId = MERCARI_CONDITION_IDS[condition] ?? 4;
  const priceInCents = price;

  // Weight-based class is what Mercari suggests; user-selected class overrides shippingClassIds
  const weightBasedClassId = getShippingClassId(shippingPackageWeight);
  const resolvedClassIds = isShippingSoyo ? [0] : [shippingClassId ?? weightBasedClassId];
  const suggestedClassIds = isShippingSoyo ? [0] : [weightBasedClassId];
  // When SOYO, Mercari requires shippingPayerId=2 regardless of the job payload
  const resolvedPayerId = isShippingSoyo ? 2 : (shippingPayerId ?? 1);

  // shippingPayerId 1 = buyer pays → fee is 10% of (price + shipping cost)
  // shippingPayerId 2 = seller pays → fee is 10% of price only
  const salesFee = resolvedPayerId === 1 && shippingCost != null
    ? Math.floor((priceInCents + shippingCost) * 0.10)
    : Math.floor(priceInCents * 0.10);
  const minPriceForAutoPriceDrop = Math.ceil(priceInCents * 0.85);

  // One cached call for both tokens (was two uncached calls).
  const { accessToken: bearerToken, csrfToken: storedCsrf } = await getMercariSession();

  const requestBody = {
    operationName: "createListing",
    variables: {
      input: {
        photoIds,
        name: title,
        description: description ?? "",
        price: priceInCents,
        conditionId,
        salesFee,
        categoryId: Number.parseInt(String(categoryId), 10),
        shippingPayerId: resolvedPayerId,
        shippingClassIds: resolvedClassIds,
        suggestedShippingClassIds: suggestedClassIds,
        shippingPackageWeight,
        shippingWeightUnit,
        shippingDimensionUnit,
        minPriceForAutoPriceDrop,
        ...(isShippingSoyo ? { isShippingSoyo } : {}),
        ...(shippingPackageLength == null ? {} : { shippingPackageLength }),
        ...(shippingPackageHeight == null ? {} : { shippingPackageHeight }),
        ...(shippingPackageWidth == null ? {} : { shippingPackageWidth }),
        ...(offerConfig ? { offerConfig } : {}),
        ...(zipCode ? { zipCode } : {}),
        ...(brandId ? { brandId: Number.parseInt(String(brandId), 10) } : {}),
        ...(sizeId ? { sizeId: Number.parseInt(String(sizeId), 10) } : {}),
      },
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0",
      },
    },
  };

  console.log("[relist] createListing body:", JSON.stringify(requestBody).slice(0, 500));

  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (body, token, storedCsrf) => {
          // ── Resolve Bearer token in page context ────────────────────────────
          if (!token) {
            token = await (async () => {
              // Strategy 1: /v1/initialize — stable endpoint, returns { accessToken } at top level
              try {
                const r = await fetch("https://www.mercari.com/v1/initialize", { credentials: "include" });
                if (r.ok) { const d = await r.json().catch(() => null); if (d?.accessToken) { console.log("[relist] token via /v1/initialize"); return d.accessToken; } }
              } catch {}
              // Strategy 2: __NEXT_DATA__ (already in page — no network needed)
              const JWT_RE = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/;
              const scanObj = (obj, depth = 0) => {
                if (!obj || typeof obj !== "object" || depth > 10) return null;
                for (const [k, v] of Object.entries(obj)) {
                  if (typeof v === "string" && (k === "accessToken" || k === "access_token") && v.length > 20) return v;
                  if (typeof v === "string" && v.length > 100 && JWT_RE.test(v)) return v;
                  const found = scanObj(v, depth + 1);
                  if (found) return found;
                }
                return null;
              };
              try { const t = scanObj(window.__NEXT_DATA__?.props); if (t) { console.log("[relist] token via __NEXT_DATA__"); return t; } } catch {}
              // Strategy 3: _mwus cookie (may be non-httpOnly)
              try {
                const m = document.cookie.match(/(?:^|;\s*)_mwus=([^;]+)/);
                if (m) { const p = JSON.parse(atob(decodeURIComponent(m[1]))); if (p?.accessToken) { console.log("[relist] token via _mwus cookie"); return p.accessToken; } }
              } catch {}
              // Strategy 4: localStorage JWT scan
              try {
                for (const k of Object.keys(localStorage)) {
                  const v = localStorage.getItem(k) ?? "";
                  if (JWT_RE.test(v) && v.length > 100) { console.log("[relist] token via localStorage key:", k); return v; }
                }
              } catch {}
              return null;
            })();
          }

          // ── CSRF token — prefer stored value captured at connect time ──────────
          // Stored CSRF comes from /v1/initialize at connect time (d.csrf field).
          // Fall back to runtime detection if the stored token is unavailable.
          let csrf = storedCsrf ?? null;
          if (!csrf) {
            try {
              const cookieStr = document.cookie;
              const csrfMatch = cookieStr.match(
                /(?:^|;\s*)(?:_csrf|xsrf-token|csrf-token|csrfToken)=([^;]+)/i
              );
              if (csrfMatch) csrf = decodeURIComponent(csrfMatch[1]);

              if (!csrf) {
                for (const key of Object.keys(localStorage)) {
                  if (/csrf/i.test(key)) {
                    const val = localStorage.getItem(key);
                    if (val && val.length > 10 && val.length < 100) { csrf = val; break; }
                  }
                }
              }

              if (!csrf) {
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta) csrf = meta.getAttribute("content");
              }
            } catch {}
          }

          const headers = {
            "Content-Type": "application/json",
            "apollo-require-preflight": "true",
            "x-platform": "web",
            "x-app-version": "1",
            "x-double-web": "1",
          };
          if (token) headers["authorization"] = `Bearer ${token}`;
          if (csrf) headers["x-csrf-token"] = csrf;

          const bodyStr = JSON.stringify(body);
          const res = await fetch("https://www.mercari.com/v1/api", {
            method: "POST",
            headers,
            credentials: "include",
            body: bodyStr,
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, status: res.status, data, debug: { headers, body: bodyStr } };
        },
        args: [requestBody, bearerToken, storedCsrf],
      })
      .then((results) => {
        const result = results[0]?.result;
        if (!result) throw new Error("executeScript returned no result");

        // Log in the service worker — visible in extension DevTools (chrome://extensions → service worker)
        console.log("[relist] createListing REQUEST headers:", JSON.stringify(result.debug?.headers, null, 2));
        console.log("[relist] createListing REQUEST body:", result.debug?.body);
        console.log("[relist] createListing RESPONSE status:", result.status);
        console.log("[relist] createListing RESPONSE body:", JSON.stringify(result.data, null, 2));

        if (!result.ok) {
          throw new Error(
            result.data?.errors?.[0]?.message ?? `Listing creation failed (${result.status})`
          );
        }
        if (result.data?.errors?.length) {
          throw new Error(result.data.errors[0].message ?? "GraphQL error from Mercari");
        }
        return result.data?.data?.createListing?.id ?? null;
      })
  );
}

// Content script messages ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "LOGIN") {
    login(msg.email, msg.password)
      .then(() => {
        startPolling();
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "LOGOUT") {
    logout().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "GET_STATUS") {
    getToken().then((token) => sendResponse({ authenticated: !!token, activeJobId }));
    return true;
  }

  if (msg.type === "CONNECT_MERCARI") {
    connectMercari()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_MERCARI_STATUS") {
    getMercariStatus().then((status) => sendResponse(status));
    return true;
  }

  if (msg.type === "GET_PENDING_COUNT") {
    apiFetch("/api/mercari/jobs/pending")
      .then((data) => sendResponse({ count: (data.data ?? []).length }))
      .catch(() => sendResponse({ count: null }));
    return true;
  }
});

// ── Mercari account connection ─────────────────────────────────────────────────
// Opens mercari.com/login in a real browser tab so the user authenticates via
// Mercari's own UI (no CORS issues, no bot-detection). After the user logs in
// and lands on a non-auth page, we extract the access token from the tab's
// localStorage / cookies and POST it to the ReList API.

async function connectMercari() {
  const relistToken = await getToken();
  if (!relistToken) throw new Error("Not authenticated to ReList");

  const tab = await chrome.tabs.create({
    url: "https://www.mercari.com/login/",
    active: true,
  });

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 5 * 60 * 1000;

    const cleanup = () => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };

    const timer = setTimeout(() => {
      cleanup();
      chrome.tabs.remove(tab.id).catch(() => {});
      reject(new Error("Login timed out — please try again"));
    }, TIMEOUT_MS);

    const onRemoved = (tabId) => {
      if (tabId !== tab.id) return;
      cleanup();
      reject(new Error("Login tab was closed before completing"));
    };

    const onUpdated = async (tabId, changeInfo, updatedTab) => {
      if (tabId !== tab.id || changeInfo.status !== "complete") return;
      const url = updatedTab.url ?? "";

      // Stay on login/signup/auth pages — keep waiting
      if (!url.startsWith("https://www.mercari.com")) return;
      if (url.includes("/login") || url.includes("/signup") || url.includes("/auth")) return;

      // User navigated to a real Mercari page — login succeeded
      cleanup();

      // Give React a moment to hydrate and write auth data to storage
      await new Promise((r) => setTimeout(r, 2000));

      try {
        await captureMercariToken(tab.id, relistToken);
        chrome.tabs.remove(tab.id).catch(() => {});
        resolve({ ok: true });
      } catch (err) {
        chrome.tabs.remove(tab.id).catch(() => {});
        reject(err);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

// Calls /v1/initialize inside the mercari.com tab (session cookies sent automatically),
// captures account details from page storage, then POSTs everything to the ReList API.
async function captureMercariToken(tabId, relistToken) {
  // Get access token and CSRF token from /v1/initialize — the canonical source
  let accessToken = null;
  let csrfToken = null;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const r = await fetch("https://www.mercari.com/v1/initialize", { credentials: "include" });
        if (!r.ok) return null;
        const d = await r.json().catch(() => null);
        return d ? { accessToken: d.accessToken ?? null, csrfToken: d.csrf ?? null } : null;
      },
    });
    const initResult = injection?.result ?? null;
    accessToken = initResult?.accessToken ?? null;
    csrfToken = initResult?.csrfToken ?? null;
  } catch {}

  if (!accessToken) {
    throw new Error(
      "Could not capture Mercari auth token.\n\n" +
        "Verify you are fully logged in to Mercari, then try again."
    );
  }

  // Extract accountId / accountName from page storage
  let accountId = null;
  let accountName = null;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractMercariTokenFromPage,
    });
    const result = injection?.result ?? null;
    accountId = result?.accountId ?? null;
    accountName = result?.accountName ?? null;
  } catch {}

  // Capture full cookie jar for session restoration during publishing
  let allCookies = [];
  try {
    allCookies = await chrome.cookies.getAll({ url: "https://www.mercari.com" });
  } catch {}

  const cookiesPayload = allCookies.map(({ hostOnly, session, ...c }) => c);

  // Fetch delivery addresses from within the tab (Cloudflare-cleared context)
  let addresses = [];
  try {
    addresses = await fetchDeliveryAddresses(tabId, accessToken);
  } catch (err) {
    console.warn("[relist] fetchDeliveryAddresses at connect time failed:", err.message);
  }

  const res = await fetch(`${API_BASE}/api/marketplaces/mercari/connect-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${relistToken}`,
    },
    body: JSON.stringify({
      accessToken,
      accountId,
      accountName,
      cookies: cookiesPayload,
      ...(csrfToken ? { csrfToken } : {}),
      ...(addresses.length > 0 ? { addresses } : {}),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to save Mercari connection");
}

// Fetches delivery addresses from within a real mercari.com tab using the stored token.
async function fetchDeliveryAddresses(tabId, bearerToken) {
  const ADDRESSES_URL =
    "https://www.mercari.com/v1/api?operationName=DeliveryAddresses&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2260ae4e6793f7c6fcdd16b3aec263abd2ebef115ecabe86407b5c697fadef5f9c%22%7D%7D";

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (url, token) => {
      const headers = {
        "content-type": "application/json",
        "x-platform": "web",
        "apollo-require-preflight": "true",
        "x-app-version": "1",
      };
      if (token) headers["authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { headers, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      return data?.data?.deliveryAddresses ?? [];
    },
    args: [ADDRESSES_URL, bearerToken],
  });

  return result?.result ?? [];
}

// Fetches the stored cookie jar from the API and injects each cookie into the
// browser via chrome.cookies.set() so mercari.com tabs are pre-authenticated
// even when the user hasn't recently visited mercari.com.
async function restoreMercariCookies() {
  const token = await getToken();
  if (!token) return;

  let cookies = [];
  try {
    const res = await fetch(`${API_BASE}/api/marketplaces/mercari/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    cookies = data.data?.cookies ?? [];
  } catch {
    return;
  }

  for (const cookie of cookies) {
    try {
      const domain = cookie.domain ?? ".mercari.com";
      const host = domain.startsWith(".") ? domain.slice(1) : domain;
      const url = `${cookie.secure ? "https" : "http"}://${host}${cookie.path ?? "/"}`;

      await chrome.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path ?? "/",
        secure: cookie.secure ?? false,
        httpOnly: cookie.httpOnly ?? false,
        sameSite: cookie.sameSite ?? "unspecified",
        ...(cookie.expirationDate ? { expirationDate: cookie.expirationDate } : {}),
      });
    } catch {
      // Some cookies may fail (partitioned cookies, scheme mismatch) — skip silently
    }
  }
}

// Runs inside the mercari.com page context (no Chrome API access here).
// Confirmed against live DevTools → Application → LocalStorage (2025-04):
//   _s_did                        — JWT access token (primary)
//   ab.storage.userId.<uuid>      — JSON {"v":"g:<userId>|e:..."} (Braze SDK key)
function extractMercariTokenFromPage() {
  // ── 1. Access token ────────────────────────────────────────────────────────
  const tokenKeys = ["_s_did", "accessToken", "access_token", "token", "authToken", "auth_token"];
  let accessToken = null;
  for (const key of tokenKeys) {
    const val = localStorage.getItem(key);
    if (val && val.length > 50) { accessToken = val; break; }
  }

  // Fallback: scan all keys for a JWT-shaped value (header.payload.signature)
  if (!accessToken) {
    for (const key of Object.keys(localStorage)) {
      const val = localStorage.getItem(key) ?? "";
      const parts = val.split(".");
      if (
        parts.length === 3 &&
        parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p) && p.length > 4) &&
        val.length > 100
      ) {
        accessToken = val;
        break;
      }
    }
  }

  if (!accessToken) return null;

  // ── 2. User ID from Braze SDK storage key ─────────────────────────────────
  // ab.storage.userId.<uuid> = {"v":"g:<userId>|e:undefined|c:<ts>|l:<ts>"}
  let accountId = null;
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("ab.storage.userId.")) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? "");
      const match = String(parsed?.v ?? "").match(/^g:(\d+)\|/);
      if (match) { accountId = match[1]; break; }
    } catch {}
  }

  // ── 3. Try decoding the JWT payload for supplemental user info ────────────
  let accountName = null;
  try {
    const parts = accessToken.split(".");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!accountId) accountId = payload.sub ?? payload.userId ?? null;
    accountName = payload.name ?? payload.username ?? payload.email ?? null;
    if (accountId) accountId = String(accountId);
  } catch {}

  return { accessToken, accountId, accountName };
}

// Checks whether a Mercari connection exists in the ReList API.
async function getMercariStatus() {
  const relistToken = await getToken();
  if (!relistToken) return { connected: false };

  try {
    const res = await fetch(`${API_BASE}/api/marketplaces/connections`, {
      headers: { Authorization: `Bearer ${relistToken}` },
    });
    const data = await res.json().catch(() => ({}));
    const connections = data.data ?? [];
    const mercari = connections.find((c) => c.marketplace === "MERCARI");
    return {
      connected: !!mercari,
      accountName: mercari?.accountName ?? null,
    };
  } catch {
    return { connected: false };
  }
}

// ── Long polling ──────────────────────────────────────────────────────────────
//
// The extension holds a request open on /jobs/pending?wait=N; the server answers the moment a job
// exists. That both removes poll-interval latency and doubles as the presence heartbeat (the
// server records it on every /jobs/pending call), so there is no separate heartbeat tick.
//
// Service-worker lifetime: an in-flight fetch keeps the worker alive, so the loop survives as long
// as a poll is outstanding. If Chrome evicts the worker anyway, the chrome.alarms watchdog below
// restarts the loop within a minute.

// NOTE: the separate /extension/heartbeat ping was removed — every /jobs/pending call records
// presence server-side, and the long poll issues one continuously. The API route still exists.

/** One long poll. Returns an array of jobs, or null if we should stop (auth lost). */
async function awaitPendingJobs() {
  try {
    const data = await apiFetch(`/api/mercari/jobs/pending?wait=${POLL_WAIT_SECONDS}`);
    return data.data ?? [];
  } catch (err) {
    if (err.message === "Not authenticated") {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return null;
    }
    console.warn("[relist] poll failed:", err.message);
    await sleep(POLL_ERROR_BACKOFF_MS);
    return [];
  }
}

async function pollLoop() {
  if (polling) return; // already running in this worker
  polling = true;
  stopRequested = false;
  try {
    while (!stopRequested) {
      if (!(await getToken())) break;

      const jobs = await awaitPendingJobs();
      if (jobs === null) break; // auth lost — apiFetch already cleared the token

      if (jobs.length > 0) {
        chrome.action.setBadgeText({ text: String(jobs.length) });
        chrome.action.setBadgeBackgroundColor({ color: "#f97316" });
        // Process the whole batch back-to-back; the Mercari tab stays warm across them.
        for (const job of jobs) {
          if (stopRequested) break;
          await runJob(job);
        }
        chrome.action.setBadgeText({ text: "" });
        continue; // re-poll immediately — more work may be queued
      }

      await sleep(POLL_GAP_MS);
    }
  } finally {
    polling = false;
  }
}

function startPolling() {
  stopRequested = false;
  // Watchdog: restarts the loop if the service worker was evicted mid-wait. 1 minute is the
  // minimum period Chrome allows for MV3 alarms.
  chrome.alarms.create("relist-poll", { periodInMinutes: 1 });
  pollLoop();
}

function stopPolling() {
  stopRequested = true;
  chrome.alarms.clear("relist-poll");
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "relist-poll") return;
  getToken().then((token) => {
    if (token) pollLoop();
  });
});

// Restart on browser start / extension update as well as on worker wake.
chrome.runtime.onStartup.addListener(() => startPolling());
chrome.runtime.onInstalled.addListener(() => startPolling());

// Auto-start if already authenticated when the service worker wakes
getToken().then((token) => {
  if (token) startPolling();
});


