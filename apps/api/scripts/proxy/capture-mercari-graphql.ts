// Records Mercari's GraphQL operations while YOU browse — the way to find the "sold items" query
// that cheap server-side sale detection needs.
//
// Why: Mercari only runs registered persisted queries, so we can't guess the hash. Today sale
// detection reads every item page one by one (~300 KB each) — through a paid proxy that would be
// tens of GB per user per month. One sold-feed query per sweep is ~50 KB.
//
//   pnpm --filter @repo/api proxy:capture-mercari [output.json]
//
// A normal (visible) Chromium window opens on your own connection — no proxy. Log in to Mercari,
// then visit: My Page → Listings → Sold / Complete, In Progress, Active; open one sold item.
// Close the window when done. Every /v1/api operation seen is written to the output file
// (default ./mercari-graphql-capture.json) with its hash, variables and a response sample.
// The file contains your session's data — keep it local, don't commit it.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { chromium } from "playwright";

interface CapturedOp {
  operationName: string;
  sha256Hash: string | null;
  method: string;
  variables: unknown;
  pageUrl: string;
  status: number;
  responseKb: number;
  responseSample: string;
  seen: number;
}

const outFile = resolve(process.argv[2] ?? "mercari-graphql-capture.json");
const ops = new Map<string, CapturedOp>();

function parseOperation(url: URL, postData: string | null) {
  if (postData) {
    try {
      const body = JSON.parse(postData) as {
        operationName?: string;
        variables?: unknown;
        extensions?: { persistedQuery?: { sha256Hash?: string } };
      };
      return {
        operationName: body.operationName ?? "(unnamed)",
        variables: body.variables ?? null,
        sha256Hash: body.extensions?.persistedQuery?.sha256Hash ?? null,
      };
    } catch {
      // multipart upload etc.
    }
  }
  let ext: { persistedQuery?: { sha256Hash?: string } } | null = null;
  let variables: unknown = null;
  try {
    ext = JSON.parse(url.searchParams.get("extensions") ?? "null");
    variables = JSON.parse(url.searchParams.get("variables") ?? "null");
  } catch {
    /* ignore */
  }
  return {
    operationName: url.searchParams.get("operationName") ?? "(unknown)",
    variables,
    sha256Hash: ext?.persistedQuery?.sha256Hash ?? null,
  };
}

function save() {
  const list = [...ops.values()].sort((a, b) => a.operationName.localeCompare(b.operationName));
  writeFileSync(outFile, JSON.stringify(list, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  context.on("response", async (response) => {
    const req = response.request();
    const url = new URL(req.url());
    if (!url.hostname.endsWith("mercari.com") || !url.pathname.startsWith("/v1/api")) return;

    const op = parseOperation(url, req.postData());
    const key = `${op.operationName}:${op.sha256Hash}`;
    let body = "";
    try {
      body = await response.text();
    } catch {
      /* streamed or aborted */
    }
    const existing = ops.get(key);
    if (existing) {
      existing.seen += 1;
      return;
    }
    ops.set(key, {
      ...op,
      method: req.method(),
      pageUrl: page.url(),
      status: response.status(),
      responseKb: Math.round(Buffer.byteLength(body) / 1024),
      responseSample: body.slice(0, 3000),
      seen: 1,
    });
    console.log(`  captured ${op.operationName} (${op.sha256Hash?.slice(0, 12) ?? "no hash"}…) on ${page.url()}`);
    save();
  });

  await page.goto("https://www.mercari.com/login/");
  console.log(
    "\nLog in, then visit My Page → Listings → Sold/Complete, In Progress, Active, and open a sold item." +
      "\nClose the browser window when you're done.\n"
  );

  // Done when the browser goes away or the last tab is closed (closing the window on Windows
  // closes the pages but can leave the browser process running).
  await new Promise<void>((done) => {
    browser.on("disconnected", () => done());
    context.on("page", (p) => p.on("close", () => context.pages().length === 0 && done()));
    page.on("close", () => context.pages().length === 0 && done());
  });
  await browser.close().catch(() => {});
  save();
  console.log(`\nSaved ${ops.size} operation(s) to ${outFile}`);

  // Likely sold-feed candidates, pre-formatted for MERCARI_SOLD_FEED_QUERIES. Check each one's
  // responseSample in the file: the right ones list YOUR sold / in-progress items (ids like
  // "m12345678901"). Keep only those entries, then set the env var to that JSON on one line.
  const candidates = [...ops.values()].filter(
    (o) =>
      o.sha256Hash &&
      (/sold|complete|in.?progress|transaction|order/i.test(o.pageUrl) ||
        /sold|transaction|order|listing/i.test(o.operationName)) &&
      /"m\d{6,}"/.test(o.responseSample)
  );
  if (candidates.length > 0) {
    console.log("\nSold-feed candidates (verify, keep the right ones, set as MERCARI_SOLD_FEED_QUERIES):");
    console.log(
      JSON.stringify(
        candidates.map((o) => ({
          operationName: o.operationName,
          sha256Hash: o.sha256Hash,
          variables: o.variables,
        }))
      )
    );
  } else {
    console.log("\nNo sold-feed candidates found — make sure you opened Listings → Sold / In Progress.");
  }
}

main().catch((err) => {
  console.error(err);
  save();
  process.exit(1);
});
