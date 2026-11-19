// Local end-to-end checks for server-side sold detection + delisting — no Bright Data, no Redis,
// no real marketplace accounts needed for `flow`.
//
//   pnpm --filter @repo/api proxy:local flow
//     Seeds a throwaway user in the DATABASE_URL database, runs the REAL sweep / sold / delist /
//     worker code with the marketplace network calls stubbed, asserts the outcome, then deletes
//     everything it created. Refuses to run against a database that has real users unless
//     --allow-nonempty is passed.
//
//   pnpm --filter @repo/api proxy:local poshmark-live
//     Opens a browser; you log in to Poshmark. Your cookies are then used (in memory + a throwaway
//     DB user, deleted at the end) to call Poshmark exactly as the server would — from THIS
//     machine's IP (PROXY_LOCAL_DIRECT) instead of Bright Data. READ-ONLY: session check, the
//     sold feed, and one post read. Nothing is posted, changed or delisted.
//
//   pnpm --filter @repo/api proxy:local live
//     One browser for BOTH: log in to Mercari (then open Listings -> In Progress / Sold so the
//     sold-feed query is captured), then Poshmark. Banners in the page say what to do. Then every
//     server read runs from this machine: Mercari token + addresses + each sold-feed candidate,
//     Poshmark session + sold feed + post read. READ-ONLY. Prints the MERCARI_SOLD_FEED_QUERIES
//     candidates that worked. The raw capture (your own session data) is written to --out
//     (default ./mercari-live-capture.local.json) - keep it local. Uses your installed Chrome
//     with a separate profile (--profile, default ./.omventa-live-chrome-profile) so the sites
//     don't block the login as a bot; delete that folder to log out.
//
// All modes force NODE_ENV=development and PROXY_LOCAL_DIRECT=true for this process only.

import "dotenv/config";

process.env.NODE_ENV = "development";
process.env.PROXY_LOCAL_DIRECT = "true";

import { prisma } from "@repo/db";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { EbayStatusService } from "../../src/services/ebay-status.service";
import { ServerStatusSweepService } from "../../src/services/server-status-sweep.service";
import { MercariServerService } from "../../src/services/marketplace/mercari-server.service";
import { PoshmarkServerService } from "../../src/services/marketplace/poshmark-server.service";
import { processJob as runMercariJob } from "../../src/jobs/mercari-server.worker";
import { processJob as runPoshmarkJob } from "../../src/jobs/poshmark-server.worker";
import {
  effectiveMode,
  getAutomationMode,
  setAutomationMode,
} from "../../src/services/automation-mode";
import { soldCheckIntervalMinutes } from "../../src/config/sold-check";
import { type MercariFeedQuery, soldItemIdsFromFeed } from "../../src/services/marketplace/mercari-graphql";

const TEST_EMAIL_PREFIX = "local-check+";
let failures = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
}

function section(title: string) {
  console.log(`\n▶ ${title}`);
}

// ── Seeding ──────────────────────────────────────────────────────────────────────────────

async function createTestUser() {
  return prisma.user.create({
    data: {
      name: "Local check",
      email: `${TEST_EMAIL_PREFIX}${Date.now()}@example.invalid`,
      emailVerified: true,
    },
  });
}

async function deleteTestUser(userId: string) {
  const listings = await prisma.listing.findMany({ where: { userId }, select: { id: true } });
  await prisma.syncEvent.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
  await prisma.listing.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function connect(userId: string, marketplace: "EBAY" | "MERCARI" | "POSHMARK", extra: object = {}) {
  return prisma.marketplaceConnection.create({
    data: {
      userId,
      marketplace,
      accessToken: `test-${marketplace.toLowerCase()}`,
      expiresAt: new Date(Date.now() + 24 * 3_600_000),
      accountId: marketplace === "POSHMARK" ? "posher123" : null,
      ...extra,
    },
  });
}

async function itemListedOn(
  userId: string,
  connections: Record<string, { id: string }>,
  ids: Partial<Record<"EBAY" | "MERCARI" | "POSHMARK", string>>,
  quantity = 1
) {
  const item = await prisma.inventoryItem.create({
    data: { userId, title: `Test item ${Object.values(ids).join("/")}`, status: "ACTIVE", quantity },
  });
  const listings: Record<string, string> = {};
  for (const [marketplace, externalId] of Object.entries(ids)) {
    const l = await prisma.listing.create({
      data: {
        userId,
        inventoryItemId: item.id,
        marketplaceConnectionId: connections[marketplace]!.id,
        marketplace: marketplace as "EBAY",
        externalId,
        status: "ACTIVE",
        price: 25,
        title: item.title,
        listedAt: new Date(),
      },
    });
    listings[marketplace] = l.id;
  }
  return { itemId: item.id, listings };
}

const statusOf = async (id: string) =>
  (await prisma.listing.findUnique({ where: { id }, select: { status: true } }))?.status;

// ── eBay stub (EbayAdapter uses the global fetch) ───────────────────────────────────────

const ebayCalls: string[] = [];
let ebaySold: Array<{ itemId: string; price: string; qtyAvailable?: number }> = [];
let ebayUnsold: string[] = [];

function installEbayStub() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.includes("ebay.com/ws/api.dll")) return realFetch(input, init);
    const callName = (init?.headers as Record<string, string>)["X-EBAY-API-CALL-NAME"] ?? "?";
    const body = String(init?.body ?? "");
    ebayCalls.push(callName);
    let xml = "<Ack>Success</Ack>";
    if (callName === "GetMyeBaySelling" && body.includes("<SoldList>")) {
      xml = `<GetMyeBaySellingResponse><Ack>Success</Ack><SoldList><OrderTransactionArray>${ebaySold
        .map(
          (s) =>
            `<OrderTransaction><Transaction><Item><ItemID>${s.itemId}</ItemID>${
              s.qtyAvailable !== undefined ? `<QuantityAvailable>${s.qtyAvailable}</QuantityAvailable>` : ""
            }</Item><QuantityPurchased>1</QuantityPurchased><TransactionPrice currencyID="USD">${s.price}</TransactionPrice></Transaction></OrderTransaction>`
        )
        .join("")}</OrderTransactionArray><PaginationResult><TotalNumberOfPages>1</TotalNumberOfPages></PaginationResult></SoldList></GetMyeBaySellingResponse>`;
    } else if (callName === "GetMyeBaySelling") {
      xml = `<GetMyeBaySellingResponse><Ack>Success</Ack><UnsoldList><ItemArray>${ebayUnsold
        .map((id) => `<Item><ItemID>${id}</ItemID></Item>`)
        .join("")}</ItemArray><PaginationResult><TotalNumberOfPages>1</TotalNumberOfPages></PaginationResult></UnsoldList></GetMyeBaySellingResponse>`;
    }
    return new Response(xml, { status: 200 });
  }) as typeof fetch;
}

// ── flow ─────────────────────────────────────────────────────────────────────────────────

async function flow(allowNonEmpty: boolean) {
  const realUsers = await prisma.user.count({ where: { NOT: { email: { startsWith: TEST_EMAIL_PREFIX } } } });
  if (realUsers > 0 && !allowNonEmpty) {
    throw new Error(
      `DATABASE_URL has ${realUsers} real user(s). This test only touches its own throwaway user, ` +
        "but re-run with --allow-nonempty if you're sure this isn't production."
    );
  }

  installEbayStub();
  // Stub the marketplace HTTP layer for Mercari/Poshmark — the live checks cover that part.
  const delisted: string[] = [];
  MercariServerService.prototype.delist = async (_u, id) => void delisted.push(`MERCARI:${id}`);
  PoshmarkServerService.prototype.delist = async (_u, id) => void delisted.push(`POSHMARK:${id}`);
  let poshFeed: string[] = [];
  let mercariFeed: string[] = [];
  PoshmarkServerService.prototype.getSession = async () => ({ posherId: "posher123", jar: new Map() });
  PoshmarkServerService.prototype.soldFeedPostIds = async () => poshFeed;
  PoshmarkServerService.prototype.getPostStatus = async (_u, id) =>
    poshFeed.includes(id) ? { status: "sold", raw: {} } : { status: "active", raw: {} };
  MercariServerService.prototype.soldFeedItemIds = async () => ({ ids: new Set(mercariFeed), usedBrowser: false });

  // Server automation OFF to start: Redis/feature flags unset, so nothing tries to reach a queue.
  delete process.env.REDIS_URL;
  delete process.env.MERCARI_SERVER_PUBLISH;
  delete process.env.POSHMARK_SERVER_AUTOMATION;
  delete process.env.MERCARI_SOLD_FEED_QUERIES;
  process.env.SOLD_CHECK_INTERVAL_MINUTES = "720";

  const user = await createTestUser();
  console.log(`Throwaway user ${user.id}`);
  try {
    const conns = {
      EBAY: await connect(user.id, "EBAY"),
      MERCARI: await connect(user.id, "MERCARI"),
      POSHMARK: await connect(user.id, "POSHMARK"),
    };

    section("Config");
    check("SOLD_CHECK_INTERVAL_MINUTES=720 is read", soldCheckIntervalMinutes() === 720, soldCheckIntervalMinutes());

    // ── 1. eBay sale → GetMyeBaySelling → delist siblings ──
    section("eBay sale found by GetMyeBaySelling → siblings queued for delisting");
    const a = await itemListedOn(user.id, conns, { EBAY: "1001", MERCARI: "m10000000001", POSHMARK: "p1001" });
    const partial = await itemListedOn(user.id, conns, { EBAY: "1002" }, 3);
    const ended = await itemListedOn(user.id, conns, { EBAY: "1003" });
    ebaySold = [
      { itemId: "1001", price: "24.00" },
      { itemId: "1002", price: "10.00", qtyAvailable: 2 },
    ];
    ebayUnsold = ["1003"];
    ebayCalls.length = 0;

    const ebay = new EbayStatusService(prisma);
    const r1 = await ebay.sweep(user.id);
    check("sweep ran", r1.due === true, r1);
    check("only GetMyeBaySelling calls (no GetItem per listing)", ebayCalls.every((c) => c === "GetMyeBaySelling"), ebayCalls);
    check("2 eBay calls for the whole store", ebayCalls.length === 2, ebayCalls.length);
    check("eBay listing marked SOLD", (await statusOf(a.listings.EBAY!)) === "SOLD");
    const soldRow = await prisma.listing.findUnique({ where: { id: a.listings.EBAY! }, select: { soldPrice: true } });
    check("sold price from the transaction (24.00)", Number(soldRow?.soldPrice) === 24, soldRow?.soldPrice);
    check("partial sale of a 3-qty listing stays ACTIVE", (await statusOf(partial.listings.EBAY!)) === "ACTIVE");
    check("unsold/ended listing marked ENDED", (await statusOf(ended.listings.EBAY!)) === "ENDED");
    const mJob = await prisma.mercariJob.findFirst({ where: { listingId: a.listings.MERCARI! } });
    const pJob = await prisma.poshmarkJob.findFirst({ where: { listingId: a.listings.POSHMARK! } });
    check("Mercari delist job queued", (mJob?.payload as { type?: string })?.type === "delist", mJob?.payload);
    check("Poshmark delist job queued", (pJob?.payload as { type?: string })?.type === "delist", pJob?.payload);
    check("siblings stay ACTIVE until the delist runs", (await statusOf(a.listings.MERCARI!)) === "ACTIVE");

    section("Sold-check interval (twice a day)");
    ebayCalls.length = 0;
    const r2 = await ebay.sweep(user.id);
    check("second sweep right away is 'not due'", r2.due === false && r2.reason === "not_due", r2.reason);
    check("…and makes no eBay calls", ebayCalls.length === 0, ebayCalls);
    const r3 = await ebay.sweep(user.id, { force: true });
    check("'check now' (force) still runs", r3.due === true);

    // ── 2. Server workers run the queued delists ──
    section("Server workers run the queued delists");
    await runMercariJob({ data: { mercariJobId: mJob!.id }, attemptsMade: 0 });
    await runPoshmarkJob({ data: { poshmarkJobId: pJob!.id }, attemptsMade: 0 });
    check("Mercari + Poshmark delist calls made", delisted.includes("MERCARI:m10000000001") && delisted.includes("POSHMARK:p1001"), delisted);
    check("Mercari listing ENDED", (await statusOf(a.listings.MERCARI!)) === "ENDED");
    check("Poshmark listing ENDED", (await statusOf(a.listings.POSHMARK!)) === "ENDED");
    const inv = await prisma.inventoryItem.findUnique({ where: { id: a.itemId } });
    check("inventory item retired to SOLD (via EBAY)", inv?.status === "SOLD" && inv?.soldVia === "EBAY", inv?.status);
    const ev = await prisma.syncEvent.findFirst({ where: { listingId: a.listings.POSHMARK!, type: "DELIST", status: "success" } });
    check("sync event says delisted by Omventa", ev?.message?.includes("by Omventa") === true, ev?.message);

    // ── 3. Automation mode ──
    section("Server vs extension mode");
    check("server automation off → extension", (await getAutomationMode(prisma, user.id, "POSHMARK")) === "extension");
    process.env.REDIS_URL = "redis://unused-by-this-test";
    process.env.POSHMARK_SERVER_AUTOMATION = "true";
    check("server automation on → server by default", (await getAutomationMode(prisma, user.id, "POSHMARK")) === "server");
    await setAutomationMode(prisma, user.id, "POSHMARK", "extension");
    check("user opts into extension → extension", (await getAutomationMode(prisma, user.id, "POSHMARK")) === "extension");
    await setAutomationMode(prisma, user.id, "POSHMARK", "server");
    check("Mercari stays extension while MERCARI_SERVER_PUBLISH is off", effectiveMode("MERCARI", {}) === "extension");

    // ── 4. Server sold check for Poshmark (feed → confirm → delist eBay sibling) ──
    section("Server sold check: Poshmark sale → eBay sibling ended");
    const b = await itemListedOn(user.id, conns, { POSHMARK: "p2001", EBAY: "2001" });
    await itemListedOn(user.id, conns, { POSHMARK: "p2002" });
    poshFeed = ["p2001", "p-not-ours"];
    ebayCalls.length = 0;
    const sweeper = new ServerStatusSweepService(prisma);
    const s1 = await sweeper.sweep(user.id, "POSHMARK");
    check("Poshmark sweep ran and found 1 sale", s1.swept === true && s1.sold === 1, s1);
    check("Poshmark listing SOLD", (await statusOf(b.listings.POSHMARK!)) === "SOLD");
    check("eBay sibling ended with EndItem", ebayCalls.includes("EndItem"), ebayCalls);
    check("eBay sibling ENDED", (await statusOf(b.listings.EBAY!)) === "ENDED");
    const s2 = await sweeper.sweep(user.id, "POSHMARK");
    check("next Poshmark sweep is 'not due' (interval)", s2.swept === false && s2.reason === "not_due", s2);

    // ── 5. Mercari server sold check needs the captured feed ──
    section("Server sold check: Mercari");
    process.env.MERCARI_SERVER_PUBLISH = "true";
    const c = await itemListedOn(user.id, conns, { MERCARI: "m30000000001" });
    const m1 = await sweeper.sweep(user.id, "MERCARI");
    check("without MERCARI_SOLD_FEED_QUERIES the server doesn't claim the check", m1.swept === false && m1.reason === "server_sold_detection_unavailable", m1);
    process.env.MERCARI_SOLD_FEED_QUERIES = JSON.stringify([
      { operationName: "TestSoldFeed", sha256Hash: "a".repeat(64), variables: {} },
    ]);
    mercariFeed = ["m30000000001"];
    const m2 = await sweeper.sweep(user.id, "MERCARI");
    check("with the feed configured, the Mercari sale is found", m2.swept === true && m2.sold === 1, m2);
    check("Mercari listing SOLD", (await statusOf(c.listings.MERCARI!)) === "SOLD");

    // ── 6. Extension-mode fallback ──
    section("Extension mode: server covers a closed browser");
    await setAutomationMode(prisma, user.id, "POSHMARK", "extension");
    await prisma.marketplaceConnection.update({ where: { id: conns.POSHMARK.id }, data: { lastPolledAt: new Date() } });
    const e1 = await sweeper.sweep(user.id, "POSHMARK");
    check("extension swept recently → server leaves it alone", e1.swept === false && e1.reason === "extension_mode", e1);
    await prisma.marketplaceConnection.update({
      where: { id: conns.POSHMARK.id },
      data: { lastPolledAt: new Date(Date.now() - 14 * 3_600_000) },
    });
    const e2 = await sweeper.sweep(user.id, "POSHMARK");
    check("extension missed its slot (14h ago) → server sweeps", e2.swept === true, e2);
  } finally {
    await deleteTestUser(user.id);
    console.log("\nCleaned up the throwaway user and everything it created.");
  }
}

// ── poshmark-live ────────────────────────────────────────────────────────────────────────

async function poshmarkLive() {
  console.log("A browser will open. Log in to Poshmark; it closes by itself once you're in.");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://poshmark.com/login");

  let cookies = await context.cookies("https://poshmark.com");
  const deadline = Date.now() + 5 * 60_000;
  while (!cookies.some((c) => c.name === "jwt") && Date.now() < deadline) {
    await page.waitForTimeout(1_500);
    cookies = await context.cookies("https://poshmark.com");
  }
  await browser.close();
  if (!cookies.some((c) => c.name === "jwt")) throw new Error("Didn't see a Poshmark login within 5 minutes");

  const ui = cookies.find((c) => c.name === "ui");
  const posherId = ui ? (JSON.parse(decodeURIComponent(ui.value)) as { uid?: string }).uid : undefined;
  if (!posherId) throw new Error("Couldn't read your Poshmark user id from the ui cookie");
  console.log(`Logged in (Poshmark user id ${posherId}). Calling Poshmark as the server would…\n`);

  process.env.REDIS_URL ||= "redis://unused";
  process.env.POSHMARK_SERVER_AUTOMATION = "true";

  const user = await createTestUser();
  try {
    await prisma.marketplaceConnection.create({
      data: {
        userId: user.id,
        marketplace: "POSHMARK",
        accessToken: "live-check",
        accountId: posherId,
        // Same shape the extension stores (Chrome cookie objects).
        sessionCookies: JSON.stringify(
          cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            ...(c.expires > 0 ? { expirationDate: c.expires } : {}), // session cookies have none
          }))
        ),
      },
    });

    const svc = new PoshmarkServerService(prisma);
    const bytes = async () =>
      Number(
        (await prisma.proxyUsage.findFirst({ where: { userId: user.id, marketplace: "POSHMARK" } }))?.bytes ?? 0
      );

    section("Session");
    const session = await svc.getSession(user.id);
    check("cookie jar loaded (has jwt + _csrf)", session.jar.has("jwt") && session.jar.has("_csrf"));

    section("Sold feed (the INFERRED endpoint)");
    let soldIds: string[] = [];
    const b0 = await bytes();
    try {
      soldIds = await svc.soldFeedPostIds(user.id, 1, session);
      check(`sold feed answered (${soldIds.length} sold posts on page 1)`, true);
      console.log(`        sample: ${soldIds.slice(0, 3).join(", ") || "(none — no sold items yet?)"}`);
      console.log(`        size: ${((await bytes()) - b0) / 1000} KB`);
    } catch (err) {
      check("sold feed answered", false, (err as Error).message);
    }

    section("Per-post read (the CONFIRMED endpoint)");
    if (soldIds[0]) {
      const b1 = await bytes();
      const status = await svc.getPostStatus(user.id, soldIds[0], session);
      check(`a sold post reads as "sold"`, status.status === "sold", status);
      console.log(`        size: ${((await bytes()) - b1) / 1000} KB`);
    } else {
      console.log("  SKIP  no sold post to read — run again after a sale, or pass a post id");
    }

    const total = await bytes();
    console.log(`\nTotal traffic: ${(total / 1000).toFixed(1)} KB (≈ $${((total / 1e9) * 8).toFixed(5)} at $8/GB)`);
  } finally {
    await deleteTestUser(user.id);
    console.log("Cleaned up. Your cookies were only used in this run and are not stored anywhere.");
  }
}

// ── live (Mercari + Poshmark, real accounts, read-only) ─────────────────────────────────

interface CapturedOp {
  operationName: string;
  sha256Hash: string;
  variables: unknown;
  pageUrl: string;
  responseSample: string;
  itemIds: number;
}

/** A banner on every page with the current instruction and a Continue button. */
async function withBanner(context: BrowserContext) {
  let stage = "";
  let resolveStep: (() => void) | null = null;
  await context.exposeBinding("omventaStage", () => stage);
  await context.exposeBinding("omventaContinue", () => {
    resolveStep?.();
  });
  await context.addInitScript(() => {
    const render = async () => {
      if (!document.body) return;
      const w = window as unknown as {
        omventaStage: () => Promise<string>;
        omventaContinue: () => void;
      };
      const text = await w.omventaStage();
      let el = document.getElementById("__omventa_banner");
      if (!text) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("div");
        el.id = "__omventa_banner";
        el.setAttribute(
          "style",
          "position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;padding:14px 16px;" +
            "background:#111;color:#fff;font:14px/1.4 system-ui,sans-serif;border-radius:12px;" +
            "box-shadow:0 8px 30px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center"
        );
        document.body.appendChild(el);
      }
      if (el.dataset.text === text) return;
      el.dataset.text = text;
      el.innerHTML = "";
      const span = document.createElement("span");
      span.style.flex = "1";
      span.textContent = "Omventa test: " + text;
      const btn = document.createElement("button");
      btn.textContent = "Continue";
      btn.setAttribute(
        "style",
        "background:#f97316;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer"
      );
      btn.onclick = () => w.omventaContinue();
      el.append(span, btn);
    };
    document.addEventListener("DOMContentLoaded", () => void render());
    setInterval(() => void render(), 1500);
  });
  return {
    /** Show `text` and wait until Continue is clicked (or the timeout passes). */
    step(text: string, timeoutMs = 10 * 60_000) {
      stage = text;
      console.log(`\n[browser] ${text}`);
      return new Promise<void>((done) => {
        const t = setTimeout(done, timeoutMs);
        resolveStep = () => {
          clearTimeout(t);
          resolveStep = null;
          stage = "";
          done();
        };
      });
    },
  };
}

function captureMercariOps(context: BrowserContext, ops: Map<string, CapturedOp>, page: Page) {
  context.on("response", async (response) => {
    const req = response.request();
    let url: URL;
    try {
      url = new URL(req.url());
    } catch {
      return;
    }
    if (!url.hostname.endsWith("mercari.com") || !url.pathname.startsWith("/v1/api")) return;
    let operationName = url.searchParams.get("operationName") ?? "";
    let variables: unknown = null;
    let hash: string | null = null;
    try {
      const post = req.postData();
      if (post) {
        const b = JSON.parse(post) as {
          operationName?: string;
          variables?: unknown;
          extensions?: { persistedQuery?: { sha256Hash?: string } };
        };
        operationName = b.operationName ?? operationName;
        variables = b.variables ?? null;
        hash = b.extensions?.persistedQuery?.sha256Hash ?? null;
      } else {
        variables = JSON.parse(url.searchParams.get("variables") ?? "null");
        const ext = JSON.parse(url.searchParams.get("extensions") ?? "null") as {
          persistedQuery?: { sha256Hash?: string };
        } | null;
        hash = ext?.persistedQuery?.sha256Hash ?? null;
      }
    } catch {
      /* multipart upload etc. */
    }
    if (!hash || !operationName) return;
    let body = "";
    try {
      body = await response.text();
    } catch {
      return;
    }
    let itemIds = 0;
    try {
      itemIds = soldItemIdsFromFeed(JSON.parse(body)).size;
    } catch {
      /* not JSON */
    }
    const key = `${operationName}:${hash}:${JSON.stringify(variables)}`;
    if (!ops.has(key)) {
      ops.set(key, {
        operationName,
        sha256Hash: hash,
        variables,
        pageUrl: page.url(),
        responseSample: body.slice(0, 2000),
        itemIds,
      });
    }
  });
}

const CHROME_PATH =
  process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DEBUG_PORT = Number(process.env.LIVE_CHROME_DEBUG_PORT ?? 9333);

/** Tab URLs from Chrome's debug HTTP endpoint — read from outside, nothing touches the pages. */
async function listTabs(): Promise<Array<{ type: string; url: string }>> {
  try {
    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    return res.ok ? ((await res.json()) as Array<{ type: string; url: string }>) : [];
  } catch {
    return [];
  }
}

const isLoggedInMercari = (url: string) =>
  /^https:\/\/www\.mercari\.com\//.test(url) && !/\/(login|signup|auth|verify)/i.test(url);
const isLoggedInPoshmark = (url: string) =>
  /^https:\/\/poshmark\.com\//.test(url) && !/\/(login|signup)/i.test(url);

async function live(outFile: string, profileDir: string) {
  // Human checks (Cloudflare / captcha) fail whenever an automation driver is attached, even to
  // your real Chrome. So Chrome starts as a PLAIN process (own test profile, no automation flags),
  // you log in untouched, and the script only watches tab URLs from outside. Once both sites show
  // you're logged in, it attaches over the debug port for the read-only part.
  const chrome = spawn(
    CHROME_PATH,
    [
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      "https://www.mercari.com/login/",
      "https://poshmark.com/login",
    ],
    { stdio: "ignore" }
  );
  chrome.on("error", (err) => {
    console.error(`Couldn't start Chrome at ${CHROME_PATH} (set CHROME_PATH): ${err.message}`);
    process.exit(1);
  });
  console.log(
    "\nChrome is open with two tabs. Log in to MERCARI and to POSHMARK (any order) like you normally would." +
      "\nThe script isn't attached yet, so the human checks see a normal browser. It continues by itself once both are logged in."
  );

  const deadline = Date.now() + 15 * 60_000;
  let mercariOk = false;
  let poshOk = false;
  while (Date.now() < deadline && !(mercariOk && poshOk)) {
    await new Promise((r) => setTimeout(r, 2_000));
    const urls = (await listTabs()).filter((t) => t.type === "page").map((t) => t.url);
    const m = urls.some(isLoggedInMercari);
    const p = urls.some(isLoggedInPoshmark);
    if (m && !mercariOk) console.log("  Mercari: logged in");
    if (p && !poshOk) console.log("  Poshmark: logged in");
    mercariOk = m;
    poshOk = p;
  }
  if (!(mercariOk && poshOk)) {
    chrome.kill();
    throw new Error("Didn't see both logins within 15 minutes");
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  if (!context) throw new Error("Couldn't attach to Chrome");
  const pages = context.pages();
  const mPage = pages.find((pg) => isLoggedInMercari(pg.url())) ?? (await context.newPage());

  const init = (await mPage
    .evaluate(async () => {
      const r = await fetch("https://www.mercari.com/v1/initialize", { credentials: "include" });
      return r.ok ? r.json() : null;
    })
    .catch(() => null)) as { accessToken?: string; csrf?: string } | null;
  const mercariToken = init?.accessToken ?? null;
  console.log(`Mercari token captured: ${mercariToken ? "yes" : "NO"}`);

  const banner = await withBanner(context);
  const ops = new Map<string, CapturedOp>();
  captureMercariOps(context, ops, mPage);
  await mPage.bringToFront();
  await mPage.goto("https://www.mercari.com/mypage/listings/").catch(() => {});
  await banner.step(
    "Open your Mercari listings: the In Progress tab, then Sold / Complete, then click one sold item. Then click Continue."
  );

  const poshCookies = await context.cookies("https://poshmark.com");
  await browser.close().catch(() => {});
  chrome.kill();

  writeFileSync(outFile, JSON.stringify([...ops.values()], null, 2));
  console.log(`\nCaptured ${ops.size} Mercari operation(s) -> ${outFile}`);

  process.env.REDIS_URL ||= "redis://unused";
  process.env.MERCARI_SERVER_PUBLISH = "true";
  process.env.POSHMARK_SERVER_AUTOMATION = "true";

  const user = await createTestUser();
  const bytesFor = async (marketplace: "MERCARI" | "POSHMARK") =>
    Number((await prisma.proxyUsage.findFirst({ where: { userId: user.id, marketplace } }))?.bytes ?? 0);
  const kb = (n: number) => `${(n / 1000).toFixed(1)} KB`;

  try {
    // ── Mercari checks ──
    section("Mercari: server calls from this machine");
    if (!mercariToken) {
      check("Mercari login token", false, "no accessToken from /v1/initialize");
    } else {
      await prisma.marketplaceConnection.create({
        data: {
          userId: user.id,
          marketplace: "MERCARI",
          accessToken: mercariToken,
          metadata: init?.csrf ? { csrfToken: init.csrf } : {},
        },
      });
      const svc = new MercariServerService(prisma);
      try {
        const b0 = await bytesFor("MERCARI");
        const r = await svc.fetchDeliveryAddresses(user.id);
        check(
          `logged-in read works (${r.addresses.length} address(es); ${
            r.usedBrowser ? "Cloudflare challenged plain HTTP, browser fallback used" : "plain HTTP, no Cloudflare challenge"
          })`,
          true
        );
        console.log(`        size: ${kb((await bytesFor("MERCARI")) - b0)}`);
      } catch (err) {
        check("logged-in read (delivery addresses)", false, (err as Error).message);
      }

      const candidates = [...ops.values()].filter(
        (o) =>
          o.itemIds > 0 &&
          (/listing|sold|complete|progress|transaction|order/i.test(o.pageUrl) ||
            /listing|sold|transaction|order|item/i.test(o.operationName))
      );
      console.log(`\n  Sold-feed candidates captured: ${candidates.length}`);
      const working: Array<MercariFeedQuery & { seenOn: string; items: number }> = [];
      for (const c of candidates) {
        process.env.MERCARI_SOLD_FEED_QUERIES = JSON.stringify([
          { operationName: c.operationName, sha256Hash: c.sha256Hash, variables: c.variables },
        ]);
        const b0 = await bytesFor("MERCARI");
        const seenOn = new URL(c.pageUrl).pathname;
        try {
          const { ids, usedBrowser } = await svc.soldFeedItemIds(user.id);
          console.log(
            `    ${c.operationName.padEnd(34)} ${String(ids.size).padStart(3)} non-active item(s), ` +
              `${kb((await bytesFor("MERCARI")) - b0)}${usedBrowser ? " (browser)" : ""}, seen on ${seenOn}`
          );
          if (ids.size > 0) {
            working.push({
              operationName: c.operationName,
              sha256Hash: c.sha256Hash,
              variables: c.variables,
              seenOn,
              items: ids.size,
            });
          }
        } catch (err) {
          console.log(`    ${c.operationName.padEnd(34)} failed: ${(err as Error).message.slice(0, 140)}`);
        }
      }
      check("at least one sold-feed query works over the server path", working.length > 0);
      if (working.length > 0) {
        console.log("\n  Working candidates (pick only the In Progress / Sold ones):");
        for (const w of working) console.log(`    ${JSON.stringify(w)}`);
      }
    }

    // ── Poshmark checks ──
    section("Poshmark: server calls from this machine");
    const ui = poshCookies.find((c) => c.name === "ui");
    let posherId: string | undefined;
    try {
      posherId = ui ? (JSON.parse(decodeURIComponent(ui.value)) as { uid?: string }).uid : undefined;
    } catch {
      posherId = undefined;
    }
    if (!poshCookies.some((c) => c.name === "jwt") || !posherId) {
      check("Poshmark login cookies", false, "no jwt/ui cookie, not logged in?");
    } else {
      await prisma.marketplaceConnection.create({
        data: {
          userId: user.id,
          marketplace: "POSHMARK",
          accessToken: "live-check",
          accountId: posherId,
          sessionCookies: JSON.stringify(
            poshCookies.map((c) => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              ...(c.expires > 0 ? { expirationDate: c.expires } : {}),
            }))
          ),
        },
      });
      const svc = new PoshmarkServerService(prisma);
      const session = await svc.getSession(user.id);
      check("cookie jar loaded (jwt + _csrf)", session.jar.has("jwt") && session.jar.has("_csrf"));

      let soldIds: string[] = [];
      const b0 = await bytesFor("POSHMARK");
      try {
        soldIds = await svc.soldFeedPostIds(user.id, 1, session);
        check(`sold feed (inferred endpoint) answered: ${soldIds.length} sold post(s)`, true);
        console.log(`        size: ${kb((await bytesFor("POSHMARK")) - b0)}`);
      } catch (err) {
        check("sold feed (inferred endpoint)", false, (err as Error).message);
      }
      if (soldIds[0]) {
        const b1 = await bytesFor("POSHMARK");
        const st = await svc.getPostStatus(user.id, soldIds[0], session);
        check(`sold post ${soldIds[0]} reads as "sold"`, st.status === "sold", st);
        console.log(`        size: ${kb((await bytesFor("POSHMARK")) - b1)}`);
      } else {
        console.log("  SKIP  no sold Poshmark post to confirm against");
      }
    }

    const total = (await bytesFor("MERCARI")) + (await bytesFor("POSHMARK"));
    console.log(`\nTotal traffic this run: ${kb(total)}`);
  } finally {
    await deleteTestUser(user.id);
    console.log("Cleaned up the throwaway user. Tokens/cookies were not kept in the database.");
  }
}

// ── main ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...flags] = process.argv.slice(2);
  if (cmd === "flow") await flow(flags.includes("--allow-nonempty"));
  else if (cmd === "poshmark-live") await poshmarkLive();
  else if (cmd === "live") {
    const outIdx = flags.indexOf("--out");
    const out = outIdx >= 0 && flags[outIdx + 1] ? flags[outIdx + 1]! : "mercari-live-capture.local.json";
    const profIdx = flags.indexOf("--profile");
    const profile =
      profIdx >= 0 && flags[profIdx + 1] ? flags[profIdx + 1]! : ".omventa-live-chrome-profile";
    await live(resolve(out), resolve(profile));
  }
  else {
    console.log("Usage: pnpm --filter @repo/api proxy:local <flow|live|poshmark-live>");
    process.exit(1);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\nERROR:", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
