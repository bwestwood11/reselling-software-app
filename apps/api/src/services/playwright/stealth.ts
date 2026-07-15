/// <reference lib="dom" />
import type { BrowserContext } from "playwright";

export interface BrowserFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
}

// A handful of internally-consistent desktop Chrome profiles. Consistency matters more
// than variety here — a UA claiming Windows with a macOS-only hardwareConcurrency value
// is a stronger bot signal than using the same profile every time.
const FINGERPRINT_POOL: BrowserFingerprint[] = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
    platform: "Win32",
    hardwareConcurrency: 8,
    deviceMemory: 8,
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "America/Chicago",
    platform: "Win32",
    hardwareConcurrency: 4,
    deviceMemory: 8,
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    platform: "MacIntel",
    hardwareConcurrency: 8,
    deviceMemory: 8,
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/Denver",
    platform: "Win32",
    hardwareConcurrency: 12,
    deviceMemory: 16,
  },
];

// djb2 — deterministic, not cryptographic. We just need a stable index per seed.
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Picks a fingerprint profile. Pass a stable seed (e.g. userId + marketplace) to
 * keep the same account presenting the same fingerprint across sessions —
 * fingerprint churn on a single account is itself a bot signal.
 */
export function pickFingerprint(seed?: string): BrowserFingerprint {
  const pool = FINGERPRINT_POOL;
  const index = seed
    ? hashSeed(seed) % pool.length
    : Math.floor(Math.random() * pool.length);
  const fingerprint = pool[index];
  if (!fingerprint) throw new Error("Fingerprint pool is empty");
  return fingerprint;
}

// Runs inside the page before any site script — patches the handful of properties
// most bot-detection scripts (Cloudflare, DataDome, PerimeterX) check first.
function stealthInitScript(fp: BrowserFingerprint): void {
  Object.defineProperty(Navigator.prototype, "webdriver", {
    get: () => undefined,
    configurable: true,
  });

  Object.defineProperty(navigator, "platform", { get: () => fp.platform });
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => fp.hardwareConcurrency });
  Object.defineProperty(navigator, "deviceMemory", { get: () => fp.deviceMemory });
  Object.defineProperty(navigator, "languages", {
    get: () => [fp.locale, fp.locale.split("-")[0]],
  });

  // Headless Chrome reports zero plugins by default — real Chrome always has the
  // built-in PDF viewer entries.
  const fakePlugins = [
    { name: "PDF Viewer", filename: "internal-pdf-viewer" },
    { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer" },
    { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer" },
  ];
  Object.defineProperty(navigator, "plugins", { get: () => fakePlugins });

  if (!(window as unknown as { chrome?: unknown }).chrome) {
    (window as unknown as { chrome: unknown }).chrome = { runtime: {} };
  }

  // Headless Chrome resolves permissions.query("notifications") to "denied" even when
  // Notification.permission reads "default" — real Chrome keeps the two in sync.
  const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
  window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
    parameters.name === "notifications"
      ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
      : originalQuery(parameters);

  // "Google SwiftShader" as the WebGL renderer is one of the most common headless tells.
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (this: WebGLRenderingContext, parameter: number) {
    if (parameter === 37445) return "Intel Inc."; // UNMASKED_VENDOR_WEBGL
    if (parameter === 37446) return "Intel Iris OpenGL Engine"; // UNMASKED_RENDERER_WEBGL
    return getParameter.call(this, parameter);
  };
}

/** Applies fingerprint-consistent stealth patches to every page/frame in the context. */
export async function applyStealth(
  context: BrowserContext,
  fingerprint: BrowserFingerprint
): Promise<void> {
  await context.addInitScript(stealthInitScript, fingerprint);
}
