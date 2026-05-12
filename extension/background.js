// Service worker — polls the ReList API for pending Mercari jobs and publishes via direct API

const POLL_INTERVAL_MS = 30_000;
const API_BASE = "http://localhost:3001";

let pollTimer = null;
let activeJobId = null;

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

async function processNextJob() {
  if (activeJobId) return;

  let pendingData;
  try {
    pendingData = await apiFetch("/api/mercari/jobs/pending");
  } catch (err) {
    if (err.message === "Not authenticated") {
      stopPolling();
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    }
    return;
  }

  const jobs = pendingData.data ?? [];
  if (jobs.length === 0) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  chrome.action.setBadgeText({ text: String(jobs.length) });
  chrome.action.setBadgeBackgroundColor({ color: "#f97316" });

  const job = jobs[0];
  activeJobId = job.id;

  try {
    await patchJob(job.id, { status: "PROCESSING" });
  } catch {
    activeJobId = null;
    return;
  }

  // ── Direct Mercari API call (no tab, no form) ────────────────────────────
  try {
    const externalId = await postToMercariApi(job);
    await patchJob(job.id, { status: "COMPLETED", externalId: externalId ?? undefined });
    activeJobId = null;
    chrome.action.setBadgeText({ text: "" });
    return;
  } catch (err) {
    console.error("[relist] Mercari API failed:", err.message);
    activeJobId = null;

    if (err.message === "Not authenticated") {
      // apiFetch already cleared the token; stop polling and show the ! badge
      stopPolling();
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return;
    }

    await patchJob(job.id, {
      status: "FAILED",
      errorMessage: err.message ?? "Mercari API error",
    }).catch(() => {});
    chrome.action.setBadgeText({ text: "" });
  }
}

// ── Mercari direct API posting ────────────────────────────────────────────────
// The extension service worker runs in Chrome's real browser context, so
// Cloudflare Bot Management does not block these requests. Session cookies set
// during the Connect Mercari flow are sent automatically via credentials:"include".

async function postToMercariApi(job) {
  // Verify Mercari is connected (we don't use the stored token as a Bearer header —
  // Mercari authenticates via httpOnly session cookies set when the user logged in).
  const connectionsData = await apiFetch("/api/marketplaces/connections");
  const connections = connectionsData.data ?? [];
  const mercariConn = connections.find((c) => c.marketplace === "MERCARI");
  if (!mercariConn) throw new Error("Mercari account not connected");

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
    shippingClassIds,
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

  // Step 1 — upload images to Mercari's CDN, get UUID photoIds back
  const photoIds = await uploadImagesToMercari(images);
 console.log("[relist] Uploaded images, got photoIds:", photoIds);
  // Step 2 — create the listing via Mercari's GraphQL API
  return createMercariListing({
    title,
    description,
    price,
    condition,
    photoIds,
    categoryId,
    brandId,
    sizeId,
    shippingPayerId,
    shippingClassIds,
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
}

// The extension service worker runs in an isolated cookie partition — credentials:"include"
// does NOT send the user's mercari.com browser cookies. We work around this by injecting
// fetch calls into a real mercari.com tab where the session cookies are naturally present.

async function withMercariTab(fn) {
  // Reuse an already-open mercari.com tab to avoid flashing a new one.
  const [existing] = await chrome.tabs.query({
    url: "https://www.mercari.com/*",
    status: "complete",
  });

  let tab = existing;
  let opened = false;

  if (!tab) {
    tab = await chrome.tabs.create({ url: "https://www.mercari.com/", active: false });
    opened = true;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error("Mercari tab load timed out"));
      }, 30_000);
      const onUpdated = (tabId, changeInfo) => {
        if (tabId !== tab.id || changeInfo.status !== "complete") return;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  }

  // Pre-populate the browser's cookie jar from the stored session so the tab
  // is authenticated even if the user hasn't visited mercari.com recently.
  await restoreMercariCookies();

  try {
    return await fn(tab.id);
  } finally {
    if (opened) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// Confirmed via live DevTools capture (2025-05):
//   operationName: "uploadTempListingPhotos"
//   sha256Hash: "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10"
//   Uses Apollo multipart upload spec (operations + map + file fields).
//   Returns photo UUIDs used as photoIds in createListing.
async function uploadImagesToMercari(imageUrls) {
  if (imageUrls.length === 0) return [];

  // ── Step 1: fetch images in the service worker ───────────────────────────
  // The injected script runs under mercari.com's CORS policy and cannot fetch
  // cross-origin S3/CDN URLs. The service worker has no such restriction.
  const imageDataList = [];
  for (const url of imageUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) { console.warn("[relist] Image fetch failed:", url, res.status); continue; }
      const buffer = await res.arrayBuffer();
      const type = res.headers.get("content-type") ?? "image/jpeg";
      // Convert ArrayBuffer → base64 in chunks to avoid stack overflow on large files
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      imageDataList.push({ base64: btoa(binary), type });
    } catch (err) {
      console.warn("[relist] Image fetch error:", err.message);
    }
  }

  if (imageDataList.length === 0) {
    console.warn("[relist] No images could be fetched — aborting upload");
    return [];
  }

  // ── Step 2: extract Bearer token from stored Mercari session ─────────────
  // multipart/form-data is a "simple" CORS request type, so Mercari enforces
  // Bearer auth on the upload endpoint (unlike JSON createListing calls).
  // The service worker can read httpOnly cookies; the injected script cannot.
  const bearerToken = await getMercariBearerToken();

  // ── Step 3: upload each image from within the mercari.com tab ────────────
  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (images, token) => {
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const photoIds = [];

          for (const { base64, type } of images) {
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

              // Resolve Bearer token inside the tab context if SW couldn't provide one
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

              const res = await fetch("https://www.mercari.com/v1/api", {
                method: "POST",
                credentials: "include",
                headers,
                body: form,
              });

              const data = await res.json().catch(() => ({}));
              console.log("[relist] uploadTempListingPhotos →", res.status, JSON.stringify(data).slice(0, 300));

              if (!res.ok) {
                console.warn("[relist] Upload rejected:", res.status, data);
                continue;
              }

              if (data?.errors?.length) {
                console.warn("[relist] GraphQL errors:", data.errors);
                continue;
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

              if (photoId) photoIds.push(String(photoId));
              else console.warn("[relist] Could not extract photoId from:", JSON.stringify(data));
            } catch (err) {
              console.warn("[relist] Upload error:", err.message);
            }
          }

          return photoIds;
        },
        args: [imageDataList, bearerToken],
      })
      .then((results) => results[0]?.result ?? [])
  );
}

// Returns the Mercari access token stored in the ReList database.
// Called from the service worker (which has no Mercari session cookies) so it fetches
// the token via the ReList API and passes it to injected scripts as the first-priority Bearer.
async function getMercariBearerToken() {
  try {
    const relistToken = await getToken();
    const res = await fetch(`${API_BASE}/api/marketplaces/mercari/token`, {
      headers: { Authorization: `Bearer ${relistToken}` },
    });
    const data = await res.json().catch(() => ({}));
    return data.data?.accessToken ?? null;
  } catch (err) {
    console.warn("[relist] getMercariBearerToken failed:", err.message);
  }
  return null;
}

// Returns the CSRF token stored in the connection metadata (captured at connect time from /v1/initialize).
async function getMercariCsrfToken() {
  try {
    const relistToken = await getToken();
    const res = await fetch(`${API_BASE}/api/marketplaces/mercari/session`, {
      headers: { Authorization: `Bearer ${relistToken}` },
    });
    const data = await res.json().catch(() => ({}));
    return data.data?.csrfToken ?? null;
  } catch (err) {
    console.warn("[relist] getMercariCsrfToken failed:", err.message);
  }
  return null;
}

// Confirmed via live DevTools capture (2025-05):
//   operationName: "createListing"
//   sha256Hash: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0"
//   Uses Apollo Automatic Persisted Queries — NO inline query string.
//   photoIds = UUID strings; conditionId/brandId/sizeId/categoryId = integers; price = cents.
//   salesFee ≈ price * 0.10; minPriceForAutoPriceDrop ≈ price * 0.80 (confirmed from traffic).
async function createMercariListing(params) {
  const {
    title,
    description,
    price,
    condition,
    photoIds,
    categoryId,
    brandId,
    
    
    shippingPayerId = 1,
    shippingClassIds = [2376],
    shippingPackageWeight = 16,
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
  const priceInCents = price * 100
  const salesFee = Math.round(priceInCents * 0.10);
  const minPriceForAutoPriceDrop = Math.round(priceInCents * 0.80);

  const bearerToken = await getMercariBearerToken();
  const storedCsrf = await getMercariCsrfToken();

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
        categoryId: parseInt(String(categoryId), 10),
        shippingPayerId: 2,
        shippingClassIds: [2550],
        suggestedShippingClassIds: [],
            "shippingPackageWeight": 8,
       
            "sizeId": 11,
        // shippingPackageWeight,
        // shippingWeightUnit,
        ...(isShippingSoyo ? { isShippingSoyo } : {}),
        // ...(shippingPackageWidth != null ? { shippingPackageWidth } : {}),
        // ...(shippingPackageHeight != null ? { shippingPackageHeight } : {}),
        // ...(shippingPackageLength != null ? { shippingPackageLength } : {}),
        // ...(shippingPackageWidth != null || shippingPackageHeight != null || shippingPackageLength != null
        //   ? { shippingDimensionUnit }
        //   : {}),

        ...(offerConfig ? { offerConfig } : {}),
        ...(zipCode ? { zipCode } : {}),
        ...(brandId ? { brandId: parseInt(String(brandId), 10) } : {}),
        ...(sizeId ? { sizeId: parseInt(String(sizeId), 10) } : {}),
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
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to save Mercari connection");
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

// ── Polling ───────────────────────────────────────────────────────────────────

function startPolling() {
  if (pollTimer) return;
  processNextJob();
  pollTimer = setInterval(processNextJob, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Auto-start polling if already authenticated when service worker wakes
getToken().then((token) => {
  if (token) startPolling();
});


