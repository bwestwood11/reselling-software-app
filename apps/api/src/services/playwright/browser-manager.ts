import { chromium, type Browser } from "playwright";

// Chromium args that keep the browser stable in headless server environments
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
];

class BrowserManager {
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (!this.browser?.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: LAUNCH_ARGS,
      });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Module-level singleton — shared across all workers in the process
export const browserManager = new BrowserManager();
