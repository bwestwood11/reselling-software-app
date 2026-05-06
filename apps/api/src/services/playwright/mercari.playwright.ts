// IMPORTANT: Selectors are inferred from Mercari's web app structure.
// Verify them against live network traffic (Chrome DevTools › Elements) before deploying.
// Mercari's UI is subject to change without notice.

import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, unlinkSync } from "fs";
import type { BrowserContext, Page } from "playwright";
import { prisma, type PrismaClient } from "@repo/db";
import { browserManager } from "./browser-manager";

const MERCARI_BASE = "https://www.mercari.com";

// Maps internal Condition enum values to Mercari's displayed condition labels.
// Verify these labels match the current Mercari UI.
const CONDITION_LABEL: Record<string, string> = {
  NEW_WITH_TAGS: "Brand New",
  NEW_WITHOUT_TAGS: "Like New",
  VERY_GOOD: "Good",
  GOOD: "Fair",
  SATISFACTORY: "Poor",
};

export interface MercariJobPayload {
  action: "PUBLISH" | "UPDATE" | "DELIST";
  title: string;
  description: string;
  /** Selling price in USD (dollars, not cents) */
  price: number;
  condition: "NEW_WITH_TAGS" | "NEW_WITHOUT_TAGS" | "VERY_GOOD" | "GOOD" | "SATISFACTORY";
  category?: string;
  brand?: string;
  /** CDN/S3 image URLs — downloaded and uploaded via the file input */
  images?: string[];
  /** Required for UPDATE and DELIST actions */
  externalId?: string;
}

export class MercariPlaywrightService {
  constructor(private readonly db: PrismaClient) {}

  static async testBrowser() {    
    const connection = await prisma.marketplaceConnection.findFirst({
      where: { marketplace: "MERCARI", isActive: true },
    });

    if(!connection) {
      console.error("No active Mercari connection found. Please connect your Mercari account first.");
      return;
    }

    const browser = await browserManager.getBrowser();
    const context = await browser.newContext({
      // Match a recent Chrome desktop UA to reduce bot-detection signals
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });
    

        // Restore stored browser session (cookies saved from a prior authenticated run)
    if (connection.refreshToken) {
      try {
        const cookies = JSON.parse(connection.refreshToken) as Parameters<
          BrowserContext["addCookies"]
        >[0];
        await context.addCookies(cookies);
      } catch {
        // Malformed cookie JSON — proceed without; will likely fail auth check
      }
    }

    

    const page = await browser.newPage();
    await page.goto(MERCARI_BASE, { waitUntil: "domcontentloaded" });
    const title = await page.title();

    console.log(`Mercari homepage title: ${title}`);
    return title;
  }

  async processJob(
    jobId: string,
    payload: MercariJobPayload,
    userId: string
  ): Promise<{ externalId?: string }> {
    const connection = await this.db.marketplaceConnection.findFirst({
      where: { userId, marketplace: "MERCARI", isActive: true },
    });

    if (!connection) {
      throw new Error("No active Mercari connection. Please connect your Mercari account first.");
    }

    const browser = await browserManager.getBrowser();
    const context = await browser.newContext({
      // Match a recent Chrome desktop UA to reduce bot-detection signals
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    // Restore stored browser session (cookies saved from a prior authenticated run)
    if (connection.refreshToken) {
      try {
        const cookies = JSON.parse(connection.refreshToken) as Parameters<
          BrowserContext["addCookies"]
        >[0];
        await context.addCookies(cookies);
      } catch {
        // Malformed cookie JSON — proceed without; will likely fail auth check
      }
    }

    try {
      const page = await context.newPage();

      switch (payload.action) {
        case "PUBLISH":
          return await this.publishListing(page, payload);
        case "UPDATE":
          await this.updateListing(page, payload);
          return {};
        case "DELIST":
          await this.delistListing(page, payload.externalId!);
          return {};
        default:
          throw new Error(`Unknown action: ${(payload as MercariJobPayload).action}`);
      }
    } finally {
      // Persist updated cookies so the next job can skip the login check
      const cookies = await context.cookies();
      await this.db.marketplaceConnection.update({
        where: { id: connection.id },
        data: { refreshToken: JSON.stringify(cookies) },
      });
      await context.close();
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  private async assertLoggedIn(page: Page): Promise<void> {
    await page.goto(MERCARI_BASE, { waitUntil: "networkidle", timeout: 30_000 });

    // Mercari renders a user avatar or "My Page" link when authenticated
    const loggedIn =
      (await page
        .locator('[data-testid="user-menu"], [href="/mypage/"], .UserName')
        .count()) > 0;

    if (!loggedIn) {
      throw new Error(
        "Mercari session expired or invalid. Please reconnect your Mercari account to refresh the session cookies."
      );
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  private async publishListing(
    page: Page,
    payload: MercariJobPayload
  ): Promise<{ externalId?: string }> {
    await this.assertLoggedIn(page);

    await page.goto(`${MERCARI_BASE}/sell/`, { waitUntil:"domcontentloaded" });

    // Photos — must be uploaded before filling in other fields
    if (payload.images && payload.images.length > 0) {
      await this.uploadImages(page, payload.images);
    }

    // Title
    await page.fill('input[name="name"], textarea[name="name"]', payload.title);

    // Description
    await page.fill('textarea[name="description"]', payload.description);

    // Category (optional — if Mercari requires it, select the first suggestion)
    if (payload.category) {
      const catInput = page.locator('input[placeholder*="category"], [data-testid="category-input"]');
      if ((await catInput.count()) > 0) {
        await catInput.fill(payload.category);
        await page.waitForTimeout(500);
        // Pick the first auto-complete suggestion
        const firstSuggestion = page.locator('[data-testid*="category-option"], .CategoryOption').first();
        if ((await firstSuggestion.count()) > 0) await firstSuggestion.click();
      }
    }

    // Brand (optional)
    if (payload.brand) {
      const brandInput = page.locator('input[name="brand"], input[placeholder*="brand"]');
      if ((await brandInput.count()) > 0) {
        await brandInput.fill(payload.brand);
      }
    }

    // Condition
    await this.selectCondition(page, payload.condition);

    // Price
    await page.fill(
      'input[name="price"], input[placeholder*="Price"], input[placeholder*="$"]',
      String(payload.price)
    );

    // Submit
    await page.click(
      'button[type="submit"]:not([disabled]), button:has-text("List it"), button:has-text("Sell")'
    );

    // Wait for navigation to the item page — URL contains /item/<id>
    await page.waitForURL(/\/item\//i, { timeout: 30_000 });

    const url = page.url();
    const match = url.match(/\/item\/([^/?#]+)/);
    return { externalId: match?.[1] };
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  private async updateListing(page: Page, payload: MercariJobPayload): Promise<void> {
    if (!payload.externalId) throw new Error("externalId is required for UPDATE");

    await this.assertLoggedIn(page);

    await page.goto(`${MERCARI_BASE}/item/edit/${payload.externalId}/`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    await page.fill('input[name="name"], textarea[name="name"]', payload.title);
    await page.fill('textarea[name="description"]', payload.description);
    await page.fill(
      'input[name="price"], input[placeholder*="Price"], input[placeholder*="$"]',
      String(payload.price)
    );

    await this.selectCondition(page, payload.condition);

    await page.click('button[type="submit"]:not([disabled]), button:has-text("Save")');
    await page.waitForLoadState("networkidle");
  }

  // ── Delist ───────────────────────────────────────────────────────────────────

  private async delistListing(page: Page, externalId: string): Promise<void> {
    await this.assertLoggedIn(page);

    await page.goto(`${MERCARI_BASE}/item/${externalId}/`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    // Open the action menu (⋯ button or similar)
    await page.click(
      '[data-testid="item-action-menu"], [aria-label*="more"], button:has-text("…")'
    );

    // Click Delete / Delist
    await page.click(
      'text="Delete listing", text="Delete", text="Delist", [data-testid="delete-item"]'
    );

    // Confirm the modal
    const confirmBtn = page.locator(
      'button:has-text("Delete"), button:has-text("Yes"), button:has-text("Confirm")'
    ).first();
    await confirmBtn.waitFor({ timeout: 5_000 });
    await confirmBtn.click();

    await page.waitForLoadState("networkidle");
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async selectCondition(page: Page, condition: string): Promise<void> {
    const label = CONDITION_LABEL[condition] ?? "Good";

    // Mercari renders condition as either a <select> or a button group
    const select = page.locator('select[name="condition"]');
    if ((await select.count()) > 0) {
      await select.selectOption({ label });
      return;
    }

    // Button-group variant: click the condition trigger then pick the option
    const trigger = page.locator(
      '[data-testid*="condition"], .ConditionButton, button:has-text("Condition")'
    ).first();
    if ((await trigger.count()) > 0) {
      await trigger.click();
      await page.click(`text="${label}"`);
    }
  }

  private async uploadImages(page: Page, imageUrls: string[]): Promise<void> {
    const tmpPaths: string[] = [];

    try {
      // Download each image to a temp file
      for (const [i, url] of imageUrls.entries()) {
        const res = await fetch(url);
        if (!res.ok) continue;

        const buf = Buffer.from(await res.arrayBuffer());
        const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
        const tmpPath = join(tmpdir(), `mercari_${Date.now()}_${i}.${ext}`);
        writeFileSync(tmpPath, buf);
        tmpPaths.push(tmpPath);
      }

      if (tmpPaths.length === 0) return;

      // Mercari typically exposes an <input type="file"> for photo upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ timeout: 10_000 });
      await fileInput.setInputFiles(tmpPaths);

      // Wait for the preview thumbnails to appear before continuing
      await page
        .locator('[data-testid*="photo-preview"], .PhotoPreview, .UploadedPhoto')
        .first()
        .waitFor({ timeout: 15_000 })
        .catch(() => {
          // Non-fatal — proceed even if preview selector doesn't match
        });
    } finally {
      for (const p of tmpPaths) {
        try {
          unlinkSync(p);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
