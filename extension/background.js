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
    zipCode,
  } = job.payload;

  // Step 1 — upload images to Mercari's CDN, get UUID photoIds back
  const photoIds = await uploadImagesToMercari(images);

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

  try {
    return await fn(tab.id);
  } finally {
    if (opened) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function uploadImagesToMercari(imageUrls) {
  if (imageUrls.length === 0) return [];

  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (urls) => {
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const photoIds = [];
          for (const url of urls) {
            try {
              const imgRes = await fetch(url);
              const blob = await imgRes.blob();
              const ext =
                blob.type === "image/png" ? "png"
                : blob.type === "image/webp" ? "webp"
                : "jpg";
              const form = new FormData();
              form.append("photo", blob, `photo.${ext}`);
              const res = await fetch("/v1/photos", {
                method: "POST",
                credentials: "include",
                body: form,
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) { console.warn("[relist] Upload failed:", data); continue; }
              let photoId =
                data.photo?.id ?? data.photo?.key ?? data.id ?? data.key ?? data.photo_key ?? null;
              if (!photoId) {
                for (const val of Object.values(data)) {
                  if (typeof val === "string" && UUID_RE.test(val)) { photoId = val; break; }
                }
              }
              if (photoId) photoIds.push(String(photoId));
              else console.warn("[relist] Could not extract photoId:", JSON.stringify(data));
            } catch (err) {
              console.warn("[relist] Image upload skipped:", err.message);
            }
          }
          return photoIds;
        },
        args: [imageUrls],
      })
      .then((results) => results[0]?.result ?? [])
  );
}

// Confirmed via live DevTools capture (2025-04):
//   operationName: "createListing"
//   sha256Hash: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0"
//   Uses Apollo Automatic Persisted Queries — NO inline query string.
//   photoIds = UUID strings; conditionId = integer; price = cents.
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
    shippingClassIds = [2376],
    shippingPackageWeight = 16,
    zipCode = null,
  } = params;

  const conditionId = MERCARI_CONDITION_IDS[condition] ?? 4;
  const salesFee = Math.round(price * 0.1575);
  const minPriceForAutoPriceDrop = Math.round(price * 0.9);

  const requestBody = {
    operationName: "createListing",
    variables: {
      input: {
        photoIds,
        name: title,
        description: description ?? "",
        price,
        conditionId,
        salesFee,
        minPriceForAutoPriceDrop,
        shippingPayerId,
        shippingClassIds,
        suggestedShippingClassIds: shippingClassIds,
        shippingPackageWeight,
        ...(zipCode ? { zipCode } : {}),
        ...(categoryId ? { categoryId: String(categoryId) } : {}),
        ...(brandId ? { brandId: String(brandId) } : {}),
        ...(sizeId ? { sizeId: String(sizeId) } : {}),
      },
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0",
      },
    },
  };

  return withMercariTab((tabId) =>
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: async (body) => {
          const res = await fetch("/v1/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, status: res.status, data };
        },
        args: [requestBody],
      })
      .then((results) => {
        const result = results[0]?.result;
        if (!result) throw new Error("executeScript returned no result");
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

// Injects extractMercariTokenFromPage() into the mercari.com tab, falls back
// to chrome.cookies, then POSTs the token to the ReList API.
async function captureMercariToken(tabId, relistToken) {
  let tokenData = null;

  // Strategy 1: read localStorage via executeScript
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractMercariTokenFromPage,
    });
    tokenData = injection?.result ?? null;
  } catch {}

  // Strategy 2: chrome.cookies API (catches httpOnly auth cookies)
  // MERCARI_API: verify cookie names against live DevTools → Application → Cookies
  if (!tokenData?.accessToken) {
    try {
      const cookies = await chrome.cookies.getAll({ url: "https://www.mercari.com" });
      const authCookie = cookies.find((c) =>
        ["access_token", "accessToken", "auth_token", "Authorization"].includes(c.name)
      );
      if (authCookie?.value) {
        tokenData = { accessToken: authCookie.value };
      }
    } catch {}
  }

  if (!tokenData?.accessToken) {
    throw new Error(
      "Could not capture Mercari auth token.\n\n" +
        "Verify you are fully logged in to Mercari, then try again.\n" +
        "If this keeps failing, open DevTools on mercari.com, check " +
        "Application → LocalStorage for an access token key, and let the dev team know."
    );
  }

  const res = await fetch(`${API_BASE}/api/marketplaces/mercari/connect-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${relistToken}`,
    },
    body: JSON.stringify({
      accessToken: tokenData.accessToken,
      accountId: tokenData.accountId ?? null,
      accountName: tokenData.accountName ?? null,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to save Mercari connection");
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
