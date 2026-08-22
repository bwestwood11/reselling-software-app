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
let activePoshmarkJobId = null;
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
    if (job.payload?.type === "delist") {
      // ── delist job — take an existing listing off Mercari ──────────────────
      const result = await delistFromMercari(job.payload.externalId ?? job.externalId);
      await claim;
      await patchJob(job.id, { status: "COMPLETED" });
      console.log(
        `[relist] job ${job.id} (delist) done in ${Date.now() - started}ms`,
        result
      );
      return;
    }

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
      errorMessage:
        err.message ??
        (job.payload?.type === "delist" ? "Mercari delist error" : "Mercari publish error"),
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
  const [tabId, session, imageData] = await Promise.all([
    acquireMercariTab(),
    getMercariSession(),
    downloadImages(images),
  ]);
  console.log(`[relist] warmup (tab+session+images) ${Date.now() - t0}ms`);

  // zipCode is a required field on Mercari's createListing input — without it the mutation is
  // rejected outright ('Field "zipCode" of required type "String!" was not provided'). It
  // normally rides along on the job payload from the address picked in the web form; when it
  // doesn't, fall back to the account's default delivery address instead of firing a doomed call.
  let resolvedZip = zipCode ? String(zipCode) : null;
  if (!resolvedZip) {
    try {
      const addresses = await fetchDeliveryAddresses(tabId, session.accessToken);
      const addr = addresses.find((a) => a?.isDefault) ?? addresses[0];
      if (addr?.zipCode1) {
        resolvedZip = String(addr.zipCode1);
        console.log("[relist] zipCode absent from job payload — using default address zip");
      }
    } catch (err) {
      console.warn("[relist] zip fallback failed:", err.message);
    }
  }
  if (!resolvedZip) {
    releaseMercariTab();
    throw new Error(
      "Zip code missing — select a shipping address for this listing, or reconnect Mercari to sync your addresses"
    );
  }

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
      zipCode: resolvedZip,
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
 * Wait until chrome.scripting can run in the tab AND the document is on `origin`. Injection
 * throws while the tab is still on about:blank or mid-navigation, so we retry rather than waiting
 * for a load event — this typically returns hundreds of ms before "complete".
 */
async function waitForInjectable(tabId, origin = MERCARI_BASE, timeoutMs = 25_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => location.origin,
      });
      if (res?.result === origin) return;
    } catch (err) {
      lastError = err;
    }
    await sleep(100);
  }
  throw new Error(`${origin} tab not ready: ${lastError?.message ?? "timed out"}`);
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
        ...(zipCode ? { zipCode: String(zipCode) } : {}),
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

  if (msg.type === "CONNECT_POSHMARK") {
    connectPoshmark()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_POSHMARK_STATUS") {
    getPoshmarkStatus().then((status) => sendResponse(status));
    return true;
  }

  // Manual "check Poshmark for sales now" — bypasses the once-an-hour server-side interval.
  if (msg.type === "POSHMARK_STATUS_CHECK_NOW") {
    runPoshmarkStatusCheck({ force: true })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_PENDING_COUNT") {
    Promise.all([
      apiFetch("/api/mercari/jobs/pending").then((d) => (d.data ?? []).length).catch(() => 0),
      apiFetch("/api/poshmark/jobs/pending").then((d) => (d.data ?? []).length).catch(() => 0),
    ])
      .then(([m, p]) => sendResponse({ count: m + p }))
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
      const isHostOnly = !domain.startsWith(".");
      const host = isHostOnly ? domain : domain.slice(1);
      const url = `${cookie.secure ? "https" : "http"}://${host}${cookie.path ?? "/"}`;

      const setDetails = {
        url,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path ?? "/",
        secure: cookie.secure ?? false,
        httpOnly: cookie.httpOnly ?? false,
        sameSite: normalizeSameSite(cookie.sameSite),
      };
      if (!isHostOnly) setDetails.domain = domain;
      if (cookie.expirationDate != null) setDetails.expirationDate = cookie.expirationDate;

      await chrome.cookies.set(setDetails);
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

// ── Poshmark account connection ───────────────────────────────────────────────
// IMPORTANT: Poshmark has no public API. The endpoints below are reverse-engineered
// from their web app and are subject to change.
//
// Auth: cookie-based. After login, the extension captures the full cookie jar and
// the _csrf_token, then saves them to the ReList API via /api/marketplaces/poshmark/connect-token.
//
// CONFIRMED 2026-08-15 — a single POST /api/v2/post (the old shape this file used to guess
// at) does not exist; Poshmark returned its generic 404 handler for it and for
// /api/v2/post.picture. The real flow was captured by driving an actual
// poshmark.com/create-listing session end-to-end (Playwright network capture, plus a
// page.route() intercept to read the raw multipart body) and is a 4-call sequence scoped
// to a draft post id:
//
//   1. POST /vm-rest/users/{userId}/posts?pm_version=X          body {}                → { id: draftId }
//   2. POST /api/posts/{draftId}/media/scratch?app_type=web     multipart, field "file" → { id: pictureId, ... }  (once per image)
//   3. POST /vm-rest/posts/{draftId}?pm_version=X                body { post: {...} }    → save listing fields
//   4. PUT  /vm-rest/posts/{draftId}/status/published?app_version=X&pm_version=X body {} → publish
//
// Headers: x-xsrf-token: <live _csrf cookie value> (NOT "X-CSRF-Token" — that header name
// was also a guess and Poshmark ignores it). Cookies auto-sent via credentials:"include".
//
// {userId} is the Poshmark account's internal id, captured into MarketplaceConnection.accountId
// at connect time from the `ui` cookie's `uid` field (see capturePoshmarkSession below).
//
// pm_version / app_version are literal client-build strings read off the live traffic
// (currently POSHMARK_PM_VERSION / POSHMARK_APP_VERSION below). They may drift over time —
// if these calls start failing with version-looking errors, recapture current values from
// a live poshmark.com/create-listing session.

const POSHMARK_BASE = "https://poshmark.com";

// Client-build version strings observed on live traffic — see the comment block above.
const POSHMARK_PM_VERSION = "2026.33.00";
const POSHMARK_APP_VERSION = "2.55";

// Maps our internal Condition to Poshmark condition codes.
// CONFIRMED 2026-08-15 by reading the live `data-et-prop-content` attributes off the
// condition dropdown on poshmark.com/create-listing (nwt / uln / ug / uf) — these are not
// guesses. VERY_GOOD has no distinct Poshmark condition; it collapses into "ug" (Good).
const POSHMARK_CONDITION_MAP = {
  NEW_WITH_TAGS: "nwt",
  NEW_WITHOUT_TAGS: "uln",
  VERY_GOOD: "ug",
  GOOD: "ug",
  SATISFACTORY: "uf",
};

// Reads the live _csrf cookie straight from the browser's cookie jar. Poshmark re-issues
// this cookie on every page render, so the value restored from the stored session snapshot
// (captured once at connect time) goes stale the moment acquirePoshmarkTab() navigates the
// tab. Falls back to the stored token only if the live cookie can't be read.
async function getLivePoshmarkCsrf(storedCsrfToken) {
  try {
    const cookie = await chrome.cookies.get({ url: POSHMARK_BASE, name: "_csrf" });
    if (cookie?.value) return cookie.value;
  } catch (err) {
    console.warn("[relist:poshmark] Failed to read live _csrf cookie:", err.message);
  }
  return storedCsrfToken;
}

async function patchPoshmarkJob(id, update) {
  return apiFetch(`/api/poshmark/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

/**
 * Run one Poshmark job handed over by the long poll. Mirrors runJob() on the Mercari side: the
 * PROCESSING claim is sent WITHOUT blocking, since awaiting it before starting work adds a full
 * API round trip to every publish. The terminal patch waits on it so the two cannot land out of
 * order (which would leave the job stuck at PROCESSING).
 */
async function runPoshmarkJob(job) {
  if (activePoshmarkJobId) return;
  activePoshmarkJobId = job.id;

  const claim = patchPoshmarkJob(job.id, { status: "PROCESSING" }).catch(() => {});
  const started = Date.now();

  try {
    if (job.payload?.type === "delist") {
      // ── delist job — take an existing listing off sale on Poshmark ─────────
      const result = await delistFromPoshmark(job.payload.externalId ?? job.externalId);
      await claim;
      await patchPoshmarkJob(job.id, { status: "COMPLETED" });
      console.log(
        `[relist] poshmark job ${job.id} (delist) done in ${Date.now() - started}ms`,
        result
      );
      return;
    }

    const externalId = await postToPoshmarkApi(job);
    await claim;
    await patchPoshmarkJob(job.id, { status: "COMPLETED", externalId: externalId ?? undefined });
    console.log(`[relist] poshmark job ${job.id} published in ${Date.now() - started}ms`);
  } catch (err) {
    console.error("[relist] poshmark job failed:", err.message);

    if (err.message === "Not authenticated") {
      // apiFetch already cleared the token; stop polling and show the ! badge
      stopPolling();
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return;
    }

    await claim;
    await patchPoshmarkJob(job.id, {
      status: "FAILED",
      errorMessage:
        err.message ??
        (job.payload?.type === "delist" ? "Poshmark delist error" : "Poshmark publish error"),
    }).catch(() => {});
  } finally {
    activePoshmarkJobId = null;
  }
}

// Runs a JSON fetch inside the poshmark.com tab (so session cookies are sent automatically)
// and returns { ok, status, data, rawText }. rawText is always populated so failures stay
// diagnosable even when the body isn't valid JSON (HTML error pages, WAF blocks, etc.).
//
// CONFIRMED 2026-08-15: Poshmark's vm-rest API returns validation failures as
// `{"error": {"errorType": ..., "userMessage": ..., "statusCode": 400}}` in the JSON body
// with the OUTER HTTP status still 200 — `res.ok` alone never sees these. `ok` here is
// `res.ok && !data.error` so a save/publish that Poshmark silently rejected is treated as a
// real failure instead of a false success.
async function poshmarkTabFetchJson(tabId, url, method, body, csrfToken) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (url, method, body, csrf) => {
      const headers = { Accept: "application/json" };
      // CONFIRMED header name — the real client sends x-xsrf-token, not X-CSRF-Token.
      if (csrf) headers["x-xsrf-token"] = csrf;
      const hasBody = body !== null;
      if (hasBody) headers["Content-Type"] = "application/json";
      const res = await fetch(url, {
        method,
        headers,
        credentials: "include",
        ...(hasBody ? { body: JSON.stringify(body) } : {}),
      });
      const rawText = await res.text().catch(() => "");
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        // not JSON — data stays {}, rawText carries the real body
      }
      return { ok: res.ok && !data?.error, status: res.status, data, rawText: rawText.slice(0, 500) };
    },
    args: [url, method, body ?? null, csrfToken],
  });
  return injection?.result;
}

function poshmarkErrorFromResponse(response, fallbackLabel) {
  return new Error(
    // CONFIRMED field name — Poshmark's embedded error object uses `userMessage`, not
    // `message`. `errorType` (e.g. "InvalidInputError") is the fallback when userMessage
    // is null, which happens for some error classes (e.g. plain "ValidationError").
    response?.data?.error?.userMessage ??
    response?.data?.error?.errorType ??
    response?.data?.message ??
    (response?.rawText
      ? `${fallbackLabel} (${response.status}): ${response.rawText}`
      : `${fallbackLabel} (${response?.status})`)
  );
}

// Step 1 of the real flow — create an empty draft post. Every subsequent call (image
// uploads, field save, publish) is scoped to this id.
async function createPoshmarkDraft(tabId, userId, csrfToken) {
  const url = `${POSHMARK_BASE}/vm-rest/users/${userId}/posts?pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "POST", {}, csrfToken);
  if (!response?.ok) {
    console.error("[relist:poshmark] draft creation failed:", response);
    throw poshmarkErrorFromResponse(response, "Poshmark draft creation failed");
  }
  const draftId = response.data?.id ?? null;
  if (!draftId) throw new Error("Poshmark draft creation returned no listing id");
  return draftId;
}

// Step 3 — save the listing fields (title, price, category, pictures, ...) onto the draft.
async function savePoshmarkDraft(tabId, draftId, postBody, csrfToken) {
  const url = `${POSHMARK_BASE}/vm-rest/posts/${draftId}?pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "POST", postBody, csrfToken);
  if (!response?.ok) {
    console.error("[relist:poshmark] draft save failed:", response);
    throw poshmarkErrorFromResponse(response, "Poshmark listing save failed");
  }
}

// Step 4 — publish the draft so it goes live on the seller's closet.
async function publishPoshmarkDraft(tabId, draftId, csrfToken) {
  const url =
    `${POSHMARK_BASE}/vm-rest/posts/${draftId}/status/published` +
    `?app_version=${POSHMARK_APP_VERSION}&pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "PUT", {}, csrfToken);
  if (!response?.ok) {
    console.error("[relist:poshmark] publish failed:", response);
    throw poshmarkErrorFromResponse(response, "Poshmark publish failed");
  }
}

// Step 5 — verify the draft actually made it to "published". CONFIRMED 2026-08-15: Poshmark's
// publish endpoint returns HTTP 200 with an empty-looking body even when it silently rejects
// the transition (e.g. a required field like size is missing for the category) — the draft is
// left as-is, with its uploaded images still parked in `scratch_pictures` instead of being
// promoted to `pictures`. Without this check, a listing that never actually published gets
// marked COMPLETED and never appears in the seller's closet.
async function verifyPoshmarkPublished(tabId, draftId, csrfToken) {
  const url = `${POSHMARK_BASE}/vm-rest/posts/${draftId}?app_version=${POSHMARK_APP_VERSION}&pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "GET", null, csrfToken);
  const post = response?.data?.data;
  if (post?.status === "published") return;

  const hints = [];
  if (!post?.inventory?.size_quantities?.length) hints.push("no size set (size_quantities is empty)");
  if ((post?.scratch_pictures?.length ?? 0) > 0) hints.push("images never left scratch_pictures");

  console.error("[relist:poshmark] publish did not take effect:", {
    status: post?.status,
    hints,
    data: post,
  });
  throw new Error(
    `Poshmark accepted the publish request but the listing is still "${post?.status ?? "unknown"}", ` +
    "not published" +
    (hints.length ? ` (${hints.join("; ")})` : "") +
    " — check the listing's required fields (size, category, price)."
  );
}

// Posts a listing to Poshmark by injecting into a real poshmark.com tab.
// The injected script runs in the poshmark.com origin context so session cookies
// are sent automatically — no manual cookie header injection needed.
//
// See the confirmed 4-step flow documented in the comment block above.
async function postToPoshmarkApi(job) {
  const connectionsData = await apiFetch("/api/marketplaces/connections");
  const connections = connectionsData.data ?? [];
  const poshConn = connections.find((c) => c.marketplace === "POSHMARK");
  if (!poshConn) throw new Error("Poshmark account not connected");

  // Poshmark's internal user id — captured into accountId at connect time from the `ui`
  // cookie's `uid` field (see capturePoshmarkSession). Every vm-rest/users/... call is
  // scoped to it.
  const userId = poshConn.accountId;
  if (!userId) {
    throw new Error("Poshmark connection is missing the account id — reconnect Poshmark");
  }

  const {
    title,
    description,
    price,
    condition,
    images = [],
    departmentId,
    categoryId,
    subcategoryId,
    brand,
    colors = [],
    styleTags = [],
    sizeId,
    originalPriceCents,
    shippingDiscount,
  } = job.payload;

  // Step 1 — get the stored CSRF token as a fallback. Cookies are restored by
  // acquirePoshmarkTab() on a cold acquire, so there is no separate restore call here.
  const sessionRes = await apiFetch("/api/marketplaces/poshmark/session");
  const storedCsrfToken = sessionRes.data?.csrfToken ?? null;

  // Step 2 — open (or reuse) a poshmark.com tab and run the real create/publish sequence
  return withPoshmarkTab(async (tabId) => {
    // Poshmark re-issues a fresh _csrf cookie on every page render, which overwrites the
    // restored one as soon as acquirePoshmarkTab() navigates the tab. Sending the stale
    // stored token after that point gets every authenticated write rejected uniformly,
    // which is exactly the symptom this works around — always prefer whatever _csrf value
    // is live in the tab's cookie jar right now.
    const csrfToken = await getLivePoshmarkCsrf(storedCsrfToken);

    // Step 2a — create the draft post
    const draftId = await createPoshmarkDraft(tabId, userId, csrfToken);

    // Step 2b — upload images to the draft and get back Poshmark picture ids
    const pictureIds = await uploadImagesToPoshmark(tabId, draftId, images, csrfToken);
    if (pictureIds.length === 0) {
      throw new Error("All Poshmark image uploads failed — see prior warnings for the cause");
    }

    // Step 2c — save the listing fields. The first uploaded picture is the cover shot;
    // any remaining ones go in `pictures`.
    const [coverShotId, ...restPictureIds] = pictureIds;
    const poshmarkCondition = POSHMARK_CONDITION_MAP[condition] ?? "ug";
    // CONFIRMED 2026-08-15: Poshmark's create-listing API rejects price_amount.val with cents
    // ("Whole dollar amount required") — every real captured listing used an integer price.
    // Rounding here (rather than truncating) means the seller's price of e.g. $19.99 lists as
    // $20, not $19 — closest to what was actually entered.
    const priceWholeDollars = Math.round(price / 100);
    const originalPriceWholeDollars =
      originalPriceCents != null ? Math.round(originalPriceCents / 100) : 0;

    const postBody = {
      post: {
        catalog: {
          ...(departmentId ? { department: departmentId } : {}),
          ...(categoryId ? { category: categoryId } : {}),
          ...(subcategoryId ? { category_features: [subcategoryId] } : {}),
        },
        // Poshmark rejects colors sent as bare { name } — it expects a canonical
        // { name, rgb, message_id } triple from its own color catalog, which we don't have
        // (no discoverable metadata endpoint for it, and a malformed entry fails the whole
        // save, not just the color). Omitted until we have real data; `colors` param is
        // intentionally unused above pending that.
        colors: [],
        inventory: {
          status: "available",
          size_quantities: sizeId
            ? [
                {
                  size_id: sizeId,
                  // CONFIRMED 2026-08-15 (raw-fetch test against a real draft, category
                  // Men > Sweaters, size "XLT"): this reduced shape is sufficient — Poshmark
                  // fills in display_with_size_set / display_with_size_system /
                  // display_with_system_and_set / size_set_tags server-side from just `id`
                  // and the post's category. No need to reproduce the real web client's
                  // au/eu/uk equivalents.
                  size_obj: { id: sizeId, display: sizeId, size_system: "us" },
                  size_system: "us",
                  quantity_available: 1,
                  quantity_sold: 0,
                },
              ]
            : [],
        },
        price_amount: { val: priceWholeDollars, currency_code: "USD" },
        original_price_amount: {
          val: originalPriceWholeDollars,
          currency_code: "USD",
        },
        title,
        description: description ?? "",
        condition: poshmarkCondition,
        cover_shot: { id: coverShotId },
        pictures: restPictureIds.map((id) => ({ id })),
        videos: [],
        ...(brand?.trim() ? { brand: brand.trim() } : {}),
        ...(styleTags.length > 0 ? { style_tags: styleTags.map((t) => ({ name: t })) } : {}),
        seller_private_info: {},
        autolist_draft: false,
        seller_shipping_discount: {
          id: shippingDiscount && shippingDiscount !== "no_discount" ? shippingDiscount : null,
        },
      },
    };

    await savePoshmarkDraft(tabId, draftId, postBody, csrfToken);

    // Step 2d — publish
    await publishPoshmarkDraft(tabId, draftId, csrfToken);

    // Step 2e — confirm it actually published. See verifyPoshmarkPublished for why this
    // can't be skipped: Poshmark returns 200 on publish even when it silently rejects it.
    await verifyPoshmarkPublished(tabId, draftId, csrfToken);

    return draftId;
  });
}

// Upload images to a Poshmark draft post and return picture IDs, in order (the first is
// used as the cover shot by the caller).
async function uploadImagesToPoshmark(tabId, draftId, imageUrls, csrfToken) {
  if (imageUrls.length === 0) return [];

  const pictureIds = [];
  let index = 0;
  for (const url of imageUrls.slice(0, 8)) {
    try {
      // Fetch image in the service worker (no CORS restrictions)
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[relist] Poshmark image fetch failed:", url);
        index++;
        continue;
      }
      const buffer = await res.arrayBuffer();
      const type = res.headers.get("content-type") ?? "image/jpeg";
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);

      // Extension MUST match the actual content-type. Inventory images can be
      // JPEG/PNG/WebP/GIF (see apps/api/src/routes/upload.ts); a mismatched
      // extension on a non-JPEG file makes Poshmark's backend try to decode it as the
      // wrong format and throw a generic InternalError from POST /media/scratch.
      const POSHMARK_IMAGE_EXT = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = POSHMARK_IMAGE_EXT[type.split(";")[0].trim().toLowerCase()] ?? "jpg";
      const filename = `file${index}.${ext}`;
      const uploadUrl = `${POSHMARK_BASE}/api/posts/${draftId}/media/scratch?app_type=web`;

      // Upload from inside the poshmark.com tab so session cookies are sent
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (uploadUrl, base64Data, mimeType, csrf, filename) => {
          const blob = await fetch(`data:${mimeType};base64,${base64Data}`).then((r) => r.blob());
          const form = new FormData();
          // CONFIRMED field name "file" (previously guessed "photo", which was wrong) —
          // captured 2026-08-15 via a page.route() intercept on a real poshmark.com upload.
          form.append("file", blob, filename);

          const headers = {};
          if (csrf) headers["x-xsrf-token"] = csrf;

          const res = await fetch(uploadUrl, {
            method: "POST",
            headers,
            credentials: "include",
            body: form,
          });
          const rawText = await res.text().catch(() => "");
          let data = {};
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch {
            // not JSON — leave data empty, rawText carries the real body below
          }
          return { ok: res.ok, status: res.status, data, rawText: rawText.slice(0, 500) };
        },
        args: [uploadUrl, base64, type, csrfToken, filename],
      });

      const uploadResult = injection?.result;
      if (uploadResult?.ok) {
        const picId = uploadResult.data?.id ?? null;
        if (picId) pictureIds.push(picId);
      } else {
        console.warn("[relist] Poshmark image upload failed for:", url, {
          status: uploadResult?.status,
          data: uploadResult?.data,
          rawText: uploadResult?.rawText,
        });
      }
    } catch (err) {
      console.warn("[relist] Poshmark image error:", err.message);
    }
    index++;
  }
  return pictureIds;
}

// Warm-tab reuse, mirroring the Mercari side: a burst of publishes pays the page load once, and
// the tab is closed only after TAB_IDLE_CLOSE_MS idle. Tabs the user already had open are reused
// but never closed. Readiness is detected by retrying injection, not by waiting for status
// "complete" — fetch from page context works as soon as the document has an origin.
let poshWarmTabId = null;
let poshWarmTabIsOurs = false;
let poshWarmTabCloseTimer = null;

async function acquirePoshmarkTab() {
  if (poshWarmTabCloseTimer) {
    clearTimeout(poshWarmTabCloseTimer);
    poshWarmTabCloseTimer = null;
  }

  if (poshWarmTabId != null) {
    try {
      await chrome.tabs.get(poshWarmTabId);
      return poshWarmTabId; // already loaded and cookie-primed
    } catch {
      poshWarmTabId = null; // user closed it
    }
  }

  const [existing] = await chrome.tabs.query({ url: "https://poshmark.com/*" });
  if (existing) {
    poshWarmTabId = existing.id;
    poshWarmTabIsOurs = false;
  } else {
    const tab = await chrome.tabs.create({ url: `${POSHMARK_BASE}/`, active: false });
    poshWarmTabId = tab.id;
    poshWarmTabIsOurs = true;
  }

  // Prime the cookie jar from the stored session so the tab is authenticated even if the user
  // hasn't visited poshmark.com recently. Only needed on a cold acquire.
  await restorePoshmarkCookies();
  await waitForInjectable(poshWarmTabId, POSHMARK_BASE);
  return poshWarmTabId;
}

/** Schedule the warm tab's close. Tabs the user already had open are never closed. */
function releasePoshmarkTab() {
  if (poshWarmTabId == null || !poshWarmTabIsOurs) return;
  if (poshWarmTabCloseTimer) clearTimeout(poshWarmTabCloseTimer);
  poshWarmTabCloseTimer = setTimeout(() => {
    const id = poshWarmTabId;
    poshWarmTabId = null;
    poshWarmTabCloseTimer = null;
    if (id != null) chrome.tabs.remove(id).catch(() => {});
  }, TAB_IDLE_CLOSE_MS);
}

async function withPoshmarkTab(fn) {
  const tabId = await acquirePoshmarkTab();
  try {
    return await fn(tabId);
  } finally {
    releasePoshmarkTab();
  }
}

// Valid values for chrome.cookies.set() sameSite: "no_restriction" | "lax" | "strict" | "unspecified"
// Poshmark uses null for several cookies — map null → "unspecified" to avoid API errors.
function normalizeSameSite(raw) {
  if (raw === "no_restriction" || raw === "lax" || raw === "strict") return raw;
  return "unspecified";
}

async function restorePoshmarkCookies() {
  const token = await getToken();
  if (!token) return;

  let cookies = [];
  try {
    const res = await fetch(`${API_BASE}/api/marketplaces/poshmark/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    cookies = data.data?.cookies ?? [];
    console.log("[relist:poshmark] restorePoshmarkCookies: fetched", cookies.length, "cookies from API");
  } catch (err) {
    console.error("[relist:poshmark] restorePoshmarkCookies: session fetch failed:", err.message);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const cookie of cookies) {
    try {
      const domain = cookie.domain ?? "poshmark.com";
      const isHostOnly = !domain.startsWith(".");
      const host = isHostOnly ? domain : domain.slice(1);
      const url = `${cookie.secure ? "https" : "http"}://${host}${cookie.path ?? "/"}`;

      const setDetails = {
        url,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path ?? "/",
        secure: cookie.secure ?? false,
        httpOnly: cookie.httpOnly ?? false,
        sameSite: normalizeSameSite(cookie.sameSite),
      };
      if (!isHostOnly) setDetails.domain = domain;
      if (cookie.expirationDate != null) setDetails.expirationDate = cookie.expirationDate;

      await chrome.cookies.set(setDetails);
      ok++;
    } catch (err) {
      fail++;
      console.warn("[relist:poshmark] Failed to restore cookie:", cookie.name,
        `(domain=${cookie.domain}, httpOnly=${cookie.httpOnly}, sameSite=${cookie.sameSite})`,
        "→", err.message);
    }
  }
  console.log(`[relist:poshmark] restorePoshmarkCookies done: ${ok} set, ${fail} failed`);
}

// Opens poshmark.com/login, waits for the user to authenticate, then captures
// cookies and account info and saves them to the ReList API.
async function connectPoshmark() {
  const relistToken = await getToken();
  if (!relistToken) throw new Error("Not authenticated to ReList");

  console.log("[relist:poshmark] Opening login tab…");
  const tab = await chrome.tabs.create({
    url: "https://poshmark.com/login",
    active: true,
  });
  console.log("[relist:poshmark] Login tab opened, id:", tab.id);

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 5 * 60 * 1000;

    const cleanup = () => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };

    const timer = setTimeout(() => {
      cleanup();
      console.warn("[relist:poshmark] Login timed out after 5 min");
      // Tab left open intentionally for debugging
      reject(new Error("Login timed out — please try again"));
    }, TIMEOUT_MS);

    const onRemoved = (tabId) => {
      if (tabId !== tab.id) return;
      cleanup();
      console.warn("[relist:poshmark] Login tab closed before capture completed");
      reject(new Error("Login tab was closed before completing"));
    };

    const onUpdated = async (tabId, changeInfo, updatedTab) => {
      if (tabId !== tab.id || changeInfo.status !== "complete") return;
      const url = updatedTab.url ?? "";
      console.log("[relist:poshmark] Tab navigated →", url);

      if (!url.startsWith("https://poshmark.com")) return;
      if (url.includes("/login") || url.includes("/signup") || url.includes("/auth")) {
        console.log("[relist:poshmark] Still on auth page, waiting…");
        return;
      }

      // User is on a real Poshmark page — login succeeded
      console.log("[relist:poshmark] Login detected, waiting 1.5 s for cookies to settle…");
      cleanup();
      await new Promise((r) => setTimeout(r, 1500));

      try {
        await capturePoshmarkSession(tab.id, relistToken);
        // Tab left open intentionally for debugging — remove this comment when done
        console.log("[relist:poshmark] Session captured OK — tab left open for inspection");
        resolve({ ok: true });
      } catch (err) {
        console.error("[relist:poshmark] capturePoshmarkSession failed:", err.message);
        // Tab left open intentionally for debugging
        reject(err);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

// Captures Poshmark session data from the logged-in tab and POSTs to the ReList API.
//
// Auth cookie map (confirmed from live DevTools 2026-06):
//   jwt       — httpOnly, secure; main session JWT
//   ui        — httpOnly, secure; URL-encoded JSON: {uid, dh (handle), fn (full name), em, ...}
//   _csrf     — NOT httpOnly; raw CSRF token string (send as X-CSRF-Token on every request)
//   usegv3    — httpOnly; segment flags
//   vsegv3    — httpOnly; visitor segment flags
//   esid      — session ID
//   ses_exp   — session expiry timestamp
//   max_auth_exp — auth expiry timestamp
//
// All are read via chrome.cookies.getAll() in the service worker (which can access httpOnly
// cookies). No injected script needed for capture.
async function capturePoshmarkSession(tabId, relistToken) {
  console.log("[relist:poshmark] capturePoshmarkSession start, tabId:", tabId);

  // Read all cookies from the service worker — chrome.cookies can read httpOnly cookies
  let allCookies = [];
  try {
    allCookies = await chrome.cookies.getAll({ url: "https://poshmark.com" });
    console.log("[relist:poshmark] getAll(url) returned", allCookies.length, "cookies:",
      allCookies.map((c) => `${c.name}(httpOnly=${c.httpOnly},domain=${c.domain})`).join(", "));
  } catch (err) {
    console.error("[relist:poshmark] getAll(url) failed:", err.message);
  }

  // Also grab .poshmark.com domain cookies (subdomain-scoped ones like _ga, __ssid, etc.)
  try {
    const sub = await chrome.cookies.getAll({ domain: ".poshmark.com" });
    console.log("[relist:poshmark] getAll(domain) returned", sub.length, "cookies");
    for (const c of sub) {
      if (!allCookies.some((x) => x.name === c.name && x.domain === c.domain)) {
        allCookies.push(c);
      }
    }
  } catch (err) {
    console.warn("[relist:poshmark] getAll(domain) failed:", err.message);
  }

  console.log("[relist:poshmark] Total cookies after merge:", allCookies.length);

  // _csrf cookie — NOT httpOnly, value is the raw CSRF token
  const csrfCookie = allCookies.find((c) => c.name === "_csrf");
  const csrfToken = csrfCookie?.value ?? null;
  console.log("[relist:poshmark] _csrf cookie found:", !!csrfCookie, "| value:", csrfToken);

  // ui cookie — httpOnly JSON: {uid, dh (handle/username), fn (full name URL-encoded), em, ...}
  let accountId = null;
  let accountName = null;
  const uiCookie = allCookies.find((c) => c.name === "ui");
  console.log("[relist:poshmark] ui cookie found:", !!uiCookie, "| raw:", uiCookie?.value?.slice(0, 80));
  if (uiCookie?.value) {
    try {
      const ui = JSON.parse(decodeURIComponent(uiCookie.value));
      console.log("[relist:poshmark] ui cookie parsed:", JSON.stringify(ui));
      accountId = ui.uid ?? null;
      // dh = username handle (e.g. "flipping_studio"), fn = "Brett+Westwood"
      accountName = ui.dh ?? ui.fn?.replace(/\+/g, " ") ?? null;
    } catch (err) {
      console.warn("[relist:poshmark] Failed to parse ui cookie:", err.message);
    }
  }

  console.log("[relist:poshmark] accountId:", accountId, "| accountName:", accountName);

  // jwt cookie — httpOnly, confirms session is active
  const jwtCookie = allCookies.find((c) => c.name === "jwt");
  console.log("[relist:poshmark] jwt cookie found:", !!jwtCookie);

  if (!csrfToken && !accountId) {
    console.error("[relist:poshmark] No CSRF token and no accountId — aborting");
    throw new Error(
      "Could not capture Poshmark session.\n\nMake sure you are fully logged in, then try again."
    );
  }

  // Strip non-serializable fields before saving
  const cookiesPayload = allCookies.map(({ hostOnly, session, ...c }) => c);
  console.log("[relist:poshmark] Sending", cookiesPayload.length, "cookies to API");

  // The accessToken field is used by our API as a connection marker.
  // Poshmark uses cookie-based auth, so we store the CSRF token here as a
  // convenient single-string auth signal; the full cookie jar is what matters.
  const accessToken = csrfToken ?? `poshmark_${accountId}`;

  console.log("[relist:poshmark] POSTing to connect-token…");
  const res = await fetch(`${API_BASE}/api/marketplaces/poshmark/connect-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${relistToken}`,
    },
    body: JSON.stringify({
      accessToken,
      accountId: accountId ? String(accountId) : null,
      accountName: accountName ?? null,
      cookies: cookiesPayload,
      csrfToken: csrfToken ?? null,
    }),
  });

  const body = await res.json().catch(() => ({}));
  console.log("[relist:poshmark] connect-token response:", res.status, JSON.stringify(body));
  if (!res.ok) throw new Error(body.error ?? "Failed to save Poshmark connection");
  console.log("[relist:poshmark] Connection saved ✓ accountName:", accountName);
}

async function getPoshmarkStatus() {
  const relistToken = await getToken();
  if (!relistToken) return { connected: false };

  try {
    const res = await fetch(`${API_BASE}/api/marketplaces/connections`, {
      headers: { Authorization: `Bearer ${relistToken}` },
    });
    const data = await res.json().catch(() => ({}));
    const connections = data.data ?? [];
    const poshmark = connections.find((c) => c.marketplace === "POSHMARK");
    return {
      connected: !!poshmark,
      accountName: poshmark?.accountName ?? null,
    };
  } catch {
    return { connected: false };
  }
}

// ── Poshmark status checking (hourly sold detection) ─────────────────────────
//
// Poshmark has no webhooks and no public API, so the only way to find out that a listing sold
// is to read each post back through an authenticated poshmark.com tab. This runs once an hour
// on a chrome.alarms tick and reports everything it reads to the ReList API.
//
// The SERVER owns the schedule, not this alarm: every sweep starts with
// POST /api/poshmark/status-check/claim, which answers `due: false` if the account was already
// swept within the last hour. That way a user running the extension in two browsers (or a
// service worker that gets woken repeatedly) still polls Poshmark once per hour, and every
// claim/complete pair is recorded server-side as a MarketplacePollRun.
//
// Endpoint is the same GET the publish flow uses for its step-5 verification (see POSHMARK.md):
//   GET /vm-rest/posts/{postId}?app_version=X&pm_version=X → { data: { status, inventory, ... } }

/** Alarm name for the hourly sweep. 60 minutes matches the server-side poll interval. */
const POSHMARK_STATUS_ALARM = "poshmark-status-check";
const POSHMARK_STATUS_PERIOD_MINUTES = 60;
/** Pause between per-listing reads so a large closet doesn't hammer Poshmark in a burst. */
const POSHMARK_STATUS_GAP_MS = 400;

let poshmarkStatusCheckRunning = false;

// chrome.notifications requires an iconUrl for "basic" notifications and the extension ships no
// icon files (icons/ holds only a README), so a packaged 32x32 solid-green square is inlined here
// rather than pointing at a path that would make every sold notification fail to render.
const SOLD_NOTIFICATION_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVR42u3OIQEAAAgDMFIQipoEhRg3E/Or3rmkEhAQEBAQEBAQEBAQEBAQSAcel1EIeUbP2o4AAAAASUVORK5CYII=";

/**
 * Read one Poshmark post back and classify it.
 *
 * INFERENCE WARNING — unlike the publish flow (every field of which was confirmed against live
 * traffic, see POSHMARK.md), the sold-detection signals below are read off the same confirmed
 * GET response but were not observed on a genuinely sold listing. `raw` is therefore reported to
 * the API for every check so a misclassification can be diagnosed from stored data rather than
 * re-guessed. Signals used, in order:
 *   • post.status — "published" while live; anything else means it left the closet
 *   • post.inventory.status — "available" while live (confirmed on create); treated as sold
 *     when it reads sold_out/sold/not_for_sale
 *   • post.inventory.size_quantities — every size at quantity_available 0 with something in
 *     quantity_sold means the whole post is sold through
 */
async function fetchPoshmarkPostStatus(tabId, postId, csrfToken) {
  const url = `${POSHMARK_BASE}/vm-rest/posts/${postId}?app_version=${POSHMARK_APP_VERSION}&pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "GET", null, csrfToken);

  if (response?.status === 404) return { status: "removed", raw: { httpStatus: 404 } };

  const post = response?.data?.data;
  if (!post) {
    const errorType = response?.data?.error?.errorType;
    // Poshmark answers a deleted post with a NotFound-flavoured embedded error, HTTP 200.
    if (errorType && /notfound|not_found/i.test(errorType)) {
      return { status: "removed", raw: { errorType } };
    }
    return {
      status: "error",
      error: poshmarkErrorFromResponse(response, "Poshmark status check failed").message,
      raw: { httpStatus: response?.status ?? null, rawText: response?.rawText ?? null },
    };
  }

  const sizes = post.inventory?.size_quantities ?? [];
  const inventoryStatus = post.inventory?.status ?? null;
  const soldOutBySize =
    sizes.length > 0 &&
    sizes.every((s) => (s.quantity_available ?? 0) === 0) &&
    sizes.some((s) => (s.quantity_sold ?? 0) > 0);
  const soldByStatus = ["sold_out", "sold", "not_for_sale"].includes(inventoryStatus);

  const raw = {
    postStatus: post.status ?? null,
    inventoryStatus,
    sizeQuantities: sizes.map((s) => ({
      size_id: s.size_id ?? null,
      quantity_available: s.quantity_available ?? null,
      quantity_sold: s.quantity_sold ?? null,
    })),
  };

  if (soldByStatus || soldOutBySize) return { status: "sold", raw };
  if (post.status && post.status !== "published") return { status: "removed", raw };
  return { status: "active", raw };
}

/**
 * Called with the newly sold listings reported back by POST /status-check/:id/complete — sold on
 * Poshmark while we still had them listed, i.e. genuine new sales rather than ones already
 * reconciled.
 *
 * The server has already marked each listing SOLD, written the SOLD sync event, delisted the
 * siblings it can reach itself (eBay, Depop), and QUEUED a delist job for every Mercari and
 * Poshmark sibling. Those jobs need no handling here: they land on the same two queues this
 * worker is already long-polling, so runJob()/runPoshmarkJob() pick them up within ~750ms and
 * run them through delistFromMercari()/delistFromPoshmark().
 *
 * What is left for this hook is the part only the browser can do: tell the user.
 */
async function onSold(outcomes) {
  if (!outcomes?.length) return;
  const ids = outcomes.map((o) => o.listingId);
  const queuedDelists = outcomes.flatMap((o) =>
    (o.siblings ?? []).filter((s) => s.result === "queued_extension")
  );
  console.log(
    `[relist:poshmark] ${ids.length} newly sold listing(s):`, ids,
    queuedDelists.length ? `— ${queuedDelists.length} sibling delist job(s) queued` : ""
  );

  chrome.action.setBadgeText({ text: String(ids.length) });
  chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });

  try {
    await chrome.notifications?.create({
      type: "basic",
      iconUrl: SOLD_NOTIFICATION_ICON,
      title: ids.length === 1 ? "Poshmark sale detected" : `${ids.length} Poshmark sales detected`,
      message:
        (ids.length === 1
          ? "One listing sold on Poshmark — ReList has marked it sold."
          : `${ids.length} listings sold on Poshmark — ReList has marked them sold.`) +
        (queuedDelists.length
          ? ` Delisting ${queuedDelists.length} copy/copies from other marketplaces.`
          : ""),
    });
  } catch (err) {
    console.warn("[relist:poshmark] sold notification failed:", err.message);
  }
}

/**
 * One hourly sweep. Asks the server whether a poll is due, reads every listing it hands back,
 * reports the results, then runs onSold() for whatever came back newly sold.
 */
async function runPoshmarkStatusCheck({ force = false } = {}) {
  if (poshmarkStatusCheckRunning) return { skipped: "already_running" };
  // A publish in flight owns the Poshmark tab; skipping means the sweep is not claimed, so the
  // next alarm tick picks it up with the hour's slot still open.
  if (activePoshmarkJobId) return { skipped: "publish_in_progress" };
  if (!(await getToken())) return { skipped: "not_authenticated" };

  poshmarkStatusCheckRunning = true;
  const started = Date.now();
  let claim;

  try {
    claim = await apiFetch("/api/poshmark/status-check/claim", {
      method: "POST",
      body: JSON.stringify({ force }),
    });
    const data = claim.data ?? {};
    if (!data.due) return { skipped: data.reason ?? "not_due" };
    if (!data.listings?.length) return { checked: 0, sold: 0 };

    const sessionRes = await apiFetch("/api/marketplaces/poshmark/session");
    const storedCsrfToken = sessionRes.data?.csrfToken ?? null;

    const results = await withPoshmarkTab(async (tabId) => {
      const csrfToken = await getLivePoshmarkCsrf(storedCsrfToken);
      const out = [];
      for (const listing of data.listings) {
        try {
          const result = await fetchPoshmarkPostStatus(tabId, listing.externalId, csrfToken);
          out.push({ listingId: listing.listingId, externalId: listing.externalId, ...result });
        } catch (err) {
          out.push({
            listingId: listing.listingId,
            externalId: listing.externalId,
            status: "error",
            error: err.message ?? "Status check threw",
          });
        }
        await sleep(POSHMARK_STATUS_GAP_MS);
      }
      return out;
    });

    const completed = await apiFetch(`/api/poshmark/status-check/${data.pollRunId}/complete`, {
      method: "POST",
      body: JSON.stringify({ results }),
    });

    const newlySold = completed.data?.newlySold ?? [];
    await onSold(newlySold);

    console.log(
      `[relist:poshmark] status check: ${results.length} listing(s) in ${Date.now() - started}ms, ` +
      `${newlySold.length} newly sold`
    );
    return { checked: results.length, sold: newlySold.length };
  } catch (err) {
    console.error("[relist:poshmark] status check failed:", err.message);
    // Close the claimed run out so it isn't left RUNNING and reaped as a timeout later.
    const pollRunId = claim?.data?.pollRunId;
    if (pollRunId) {
      await apiFetch(`/api/poshmark/status-check/${pollRunId}/fail`, {
        method: "POST",
        body: JSON.stringify({ errorMessage: err.message ?? "Status check failed" }),
      }).catch(() => {});
    }
    return { error: err.message };
  } finally {
    poshmarkStatusCheckRunning = false;
  }
}

// ── Extension-driven delisting ────────────────────────────────────────────────
//
// Neither marketplace can be delisted from the ReList server: Cloudflare Bot Management blocks
// Node.js requests to www.mercari.com, and Poshmark's vm-rest API only answers a real browser
// cookie session. Both adapters' delist() are therefore no-ops server-side (see
// apps/api/src/services/marketplace/{mercari,poshmark}.ts) and the work lands here instead.
//
// A delist arrives as an ordinary job on the marketplace's existing queue, discriminated by
// `payload.type === "delist"` (the same mechanism the Mercari queue already uses for
// "fetch-addresses"). Payload: { type, listingId, externalId, reason }.
//
// What enqueues them: when the hourly Poshmark sweep finds a sale, the server marks that listing
// SOLD and queues a delist job for every sibling listing of the same inventory item — so the item
// comes off Mercari and Poshmark automatically instead of staying buyable after it is gone.

/**
 * Poshmark status to move a live post to when delisting.
 *
 * INFERENCE — unlike the publish flow (every field confirmed against live traffic, see
 * POSHMARK.md), this transition was not observed on the wire. It mirrors the CONFIRMED publish
 * call exactly — `PUT /vm-rest/posts/{id}/status/published` — with the target status swapped for
 * `not_for_sale`, which is the value Poshmark's own GET response uses for a post the seller has
 * taken off sale. `not_for_sale` is chosen over deleting the post because it is reversible: the
 * listing can be relisted, and a wrong sold-detection therefore costs nothing permanent.
 */
const POSHMARK_DELIST_STATUS = "not_for_sale";

/**
 * Take one Poshmark post off sale, then read it back to confirm the transition actually happened.
 *
 * The read-back is not optional: Poshmark's status endpoints return HTTP 200 with an
 * empty-looking body even when they silently refuse the transition (CONFIRMED on the publish
 * side, see verifyPoshmarkPublished) — so "the PUT succeeded" is not evidence the post moved.
 */
async function delistPoshmarkPost(tabId, postId, csrfToken) {
  const url =
    `${POSHMARK_BASE}/vm-rest/posts/${postId}/status/${POSHMARK_DELIST_STATUS}` +
    `?app_version=${POSHMARK_APP_VERSION}&pm_version=${POSHMARK_PM_VERSION}`;
  const response = await poshmarkTabFetchJson(tabId, url, "PUT", {}, csrfToken);

  // A 404 means the post is already gone from Poshmark — the outcome we wanted, so not an error.
  if (response?.status === 404) return { status: "removed", raw: { httpStatus: 404 } };
  if (!response?.ok) {
    console.error("[relist:poshmark] delist call failed:", response);
    throw poshmarkErrorFromResponse(response, "Poshmark delist failed");
  }

  const after = await fetchPoshmarkPostStatus(tabId, postId, csrfToken);
  if (after.status === "active") {
    console.error("[relist:poshmark] delist did not take effect:", after.raw);
    throw new Error(
      "Poshmark accepted the delist request but the listing is still published — " +
      "the post may need to be taken off sale manually."
    );
  }
  return after;
}

/** Run one Poshmark delist job end to end, in a logged-in poshmark.com tab. */
async function delistFromPoshmark(externalId) {
  if (!externalId) throw new Error("Poshmark delist job has no externalId");

  const sessionRes = await apiFetch("/api/marketplaces/poshmark/session");
  const storedCsrfToken = sessionRes.data?.csrfToken ?? null;

  return withPoshmarkTab(async (tabId) => {
    const csrfToken = await getLivePoshmarkCsrf(storedCsrfToken);
    return delistPoshmarkPost(tabId, externalId, csrfToken);
  });
}

/**
 * Confirmed via live Playwright capture (2026-08-22): clicking the "Delete" button on Mercari's
 * own edit page (testid="DeleteButton") fires this GraphQL mutation directly — no confirmation
 * dialog appears — and the page redirects to /mypage/listings/active/ on success:
 *
 *   operationName: "UpdateItemStatusMutation"
 *   sha256Hash: "55bd4e7d2bc2936638e1451da3231e484993635d7603431d1a2978e3d59656f8"
 *   variables: { input: { id: "<externalId>", status: "cancel" } }
 *   Response:  { data: { updateItemStatus: { status: "OK", __typename: "GenericResponse" } } }
 *
 * Also confirmed live: re-sending "cancel" for an item that is already cancelled still returns
 * status:"OK" (no error) — the mutation is idempotent — so a successful response is proof enough
 * that the listing is inactive. There is no separate "already gone" branch to detect, unlike the
 * publish flow's edit-page-redirect check.
 *
 * The previous approach (see git history) drove the rendered edit page instead, on the theory that
 * this mutation's persisted-query hash had never been captured. That flow was failing in
 * production with ZERO visible clickable elements on the page at all — not a label mismatch, the
 * page had nothing rendered yet. acquireMercariTab() creates its tab with active:false, and Chrome
 * throttles rAF/timers in non-visible background tabs, which is consistent with this Next.js app
 * never finishing hydration inside the flow's timeout. Calling the API directly sidesteps SPA
 * hydration entirely — this only needs the tab's cookies to be primed, not its DOM rendered.
 *
 * Bearer/CSRF resolution mirrors createListing() above: same token strategies (getMercariSession
 * cache → /v1/initialize → __NEXT_DATA__ → _mwus cookie → localStorage JWT scan), because the
 * plain-cookie request (no explicit auth/csrf headers) was confirmed live to fail with
 * {"errors":[{"status":401,"message":"Unauthorized"}]} — the session cookie alone does not
 * authorize this endpoint.
 */
async function delistFromMercari(externalId) {
  if (!externalId) throw new Error("Mercari delist job has no externalId");

  const { accessToken: bearerToken, csrfToken: storedCsrf } = await getMercariSession();

  const requestBody = {
    operationName: "UpdateItemStatusMutation",
    variables: { input: { id: externalId, status: "cancel" } },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: "55bd4e7d2bc2936638e1451da3231e484993635d7603431d1a2978e3d59656f8",
      },
    },
  };

  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (body, token, storedCsrf) => {
          // ── Resolve Bearer token in page context (same strategies as createListing) ────────
          if (!token) {
            token = await (async () => {
              try {
                const r = await fetch("https://www.mercari.com/v1/initialize", { credentials: "include" });
                if (r.ok) { const d = await r.json().catch(() => null); if (d?.accessToken) return d.accessToken; }
              } catch {}
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
              try {
                const m = document.cookie.match(/(?:^|;\s*)_mwus=([^;]+)/);
                if (m) { const p = JSON.parse(atob(decodeURIComponent(m[1]))); if (p?.accessToken) return p.accessToken; }
              } catch {}
              try {
                for (const k of Object.keys(localStorage)) {
                  const v = localStorage.getItem(k) ?? "";
                  if (JWT_RE.test(v) && v.length > 100) return v;
                }
              } catch {}
              return null;
            })();
          }

          // ── CSRF token — prefer stored value captured at connect time ──────────
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
          return { ok: res.ok, status: res.status, data };
        },
        args: [requestBody, bearerToken, storedCsrf],
      })
      .then((results) => {
        const result = results[0]?.result;
        if (!result) throw new Error("Mercari delist request returned no result");

        console.log(`[relist:mercari] delist ${externalId} response:`, JSON.stringify(result.data));

        if (!result.ok) {
          throw new Error(result.data?.errors?.[0]?.message ?? `Mercari delist failed (${result.status})`);
        }
        if (result.data?.errors?.length) {
          throw new Error(result.data.errors[0].message ?? "GraphQL error from Mercari");
        }
        if (result.data?.data?.updateItemStatus?.status !== "OK") {
          throw new Error(`Unexpected Mercari delist response: ${JSON.stringify(result.data)}`);
        }
        return { ok: true };
      })
  );
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

/**
 * One long poll against `path`. Returns an array of jobs, or null if we should stop (auth lost).
 * Both marketplaces expose the same ?wait= contract, so one helper serves both loops.
 */
async function awaitPendingJobsFrom(path, label) {
  try {
    const data = await apiFetch(`${path}?wait=${POLL_WAIT_SECONDS}`);
    return data.data ?? [];
  } catch (err) {
    if (err.message === "Not authenticated") {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return null;
    }
    console.warn(`[relist] ${label} poll failed:`, err.message);
    await sleep(POLL_ERROR_BACKOFF_MS);
    return [];
  }
}

/**
 * One marketplace's long-poll loop. Mercari and Poshmark each run their own so neither waits
 * behind the other's 25s poll window — they publish into separate tabs and never contend.
 */
async function marketplacePollLoop({ path, label, run }) {
  while (!stopRequested) {
    if (!(await getToken())) return;

    const jobs = await awaitPendingJobsFrom(path, label);
    if (jobs === null) return; // auth lost — apiFetch already cleared the token

    if (jobs.length > 0) {
      chrome.action.setBadgeText({ text: String(jobs.length) });
      chrome.action.setBadgeBackgroundColor({ color: "#f97316" });
      // Process the whole batch back-to-back; the marketplace tab stays warm across them.
      for (const job of jobs) {
        if (stopRequested) break;
        await run(job);
      }
      chrome.action.setBadgeText({ text: "" });
      continue; // re-poll immediately — more work may be queued
    }

    await sleep(POLL_GAP_MS);
  }
}

async function pollLoop() {
  if (polling) return; // already running in this worker
  polling = true;
  stopRequested = false;
  try {
    await Promise.all([
      marketplacePollLoop({ path: "/api/mercari/jobs/pending", label: "mercari", run: runJob }),
      marketplacePollLoop({
        path: "/api/poshmark/jobs/pending",
        label: "poshmark",
        run: runPoshmarkJob,
      }),
    ]);
  } finally {
    polling = false;
  }
}

function startPolling() {
  stopRequested = false;
  // Watchdog: restarts the loop if the service worker was evicted mid-wait. 1 minute is the
  // minimum period Chrome allows for MV3 alarms.
  chrome.alarms.create("relist-poll", { periodInMinutes: 1 });
  // Hourly Poshmark sold-detection sweep. Chrome coalesces this with the watchdog tick; the
  // server-side claim is what actually enforces "once an hour", so an early or repeated fire
  // costs one cheap API call and nothing more.
  chrome.alarms.create(POSHMARK_STATUS_ALARM, {
    periodInMinutes: POSHMARK_STATUS_PERIOD_MINUTES,
  });
  pollLoop();
  runPoshmarkStatusCheck();
}

function stopPolling() {
  stopRequested = true;
  chrome.alarms.clear("relist-poll");
  chrome.alarms.clear(POSHMARK_STATUS_ALARM);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POSHMARK_STATUS_ALARM) {
    getToken().then((token) => {
      if (token) runPoshmarkStatusCheck();
    });
    return;
  }
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


