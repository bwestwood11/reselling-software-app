import { chromium, type Browser } from "playwright";

// Chromium args for headless Docker/Railway environments.
// --single-process is intentionally omitted — it causes renderer crashes that
// take down the whole browser process, especially under concurrent load.
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--disable-background-networking",
  "--disable-extensions",
];

class BrowserManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;

    // Deduplicate concurrent launch calls — only one chromium.launch() at a time
    if (!this.launching) {
      this.launching = chromium
        .launch({ headless: true, args: LAUNCH_ARGS })
        .then((b) => {
          this.browser = b;
          this.launching = null;
          return b;
        })
        .catch((err) => {
          this.launching = null;
          throw err;
        });
    }

    return this.launching;
  }

  async restart(): Promise<void> {
    try {
      await this.browser?.close();
    } catch {
      // ignore — may already be dead
    }
    this.browser = null;
    this.launching = null;
  }

  async close(): Promise<void> {
    await this.restart();
  }
}

// Module-level singleton — shared across all requests in the process
export const browserManager = new BrowserManager();
