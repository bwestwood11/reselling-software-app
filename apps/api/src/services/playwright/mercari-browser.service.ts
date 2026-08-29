// IMPORTANT: Selectors are inferred from Mercari's web app structure.
// Verify them against live network traffic (Chrome DevTools › Elements) before deploying.
// Mercari's UI is subject to change without notice.

import type { Page } from "playwright";
import type { MarketplaceType } from "@repo/db";
import {
  BaseMarketplaceBrowserService,
  type MarketplaceCredentials,
} from "./base-marketplace-browser.service";

const MERCARI_BASE = "https://www.mercari.com";

interface MercariProfileResponse {
  data?: {
    id?: string | number;
    name?: string;
  };
}

/**
 * Reference implementation of `BaseMarketplaceBrowserService` for Mercari — drives
 * the real login form in a headless browser so Mercari's own reCAPTCHA challenge
 * runs and resolves itself, and demonstrates `runFetch`/`fetchJson` for hitting
 * Mercari's API from inside the authenticated page context.
 *
 * Unused: real Mercari (and Poshmark) account connection goes through the ReList
 * Chrome extension exclusively — see /api/marketplaces/mercari/connect-token and
 * /api/marketplaces/poshmark/connect-token. Kept only as a pattern reference for
 * other marketplaces (Facebook Marketplace, Etsy) that don't expose a public API:
 * set `marketplace`/`baseUrl`, implement `performLogin` and `assertLoggedIn`, then
 * add whatever site actions you need using `this.runFetch(page, ...)` or plain
 * Playwright calls on `page`.
 */
export class MercariBrowserService extends BaseMarketplaceBrowserService {
  protected readonly marketplace: MarketplaceType = "MERCARI";
  protected readonly baseUrl = MERCARI_BASE;

  protected async performLogin(
    page: Page,
    credentials: MarketplaceCredentials,
    userId: string
  ): Promise<void> {
    const { email, password } = credentials;
    if (!email || !password) {
      throw new Error("Mercari login requires email and password");
    }

    await page.goto(`${this.baseUrl}/login/`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await this.humanType(page, 'input[name="email"], input[type="email"]', email);
    await this.humanDelay();
    await this.humanType(page, 'input[name="password"], input[type="password"]', password);
    await this.humanDelay();

    await page.click('button[type="submit"]:not([disabled]), button:has-text("Log in")');
    await page.waitForLoadState("networkidle", { timeout: 30_000 });

    await this.assertLoggedIn(page);

    // Same authenticated page, same cookies — fetch the account identity to store
    // alongside the connection row.
    const profile = await this.runFetch<MercariProfileResponse>(page, "/v1/users/me");
    const accountId = profile.data?.data?.id != null ? String(profile.data.data.id) : null;
    const accountName = profile.data?.data?.name ?? null;

    await this.db.marketplaceConnection.upsert({
      where: { userId_marketplace: { userId, marketplace: this.marketplace } },
      update: {
        accessToken: "playwright-session", // no bearer token in this flow — auth lives in cookies
        accountId,
        accountName,
        isActive: true,
      },
      create: {
        userId,
        marketplace: this.marketplace,
        accessToken: "playwright-session",
        accountId,
        accountName,
      },
    });
  }

  protected async assertLoggedIn(page: Page): Promise<void> {
    const loggedIn =
      (await page.locator('[data-testid="user-menu"], [href="/mypage/"], .UserName').count()) >
      0;

    if (!loggedIn) {
      throw new Error("Mercari login did not complete — check credentials or selector drift.");
    }
  }
}
