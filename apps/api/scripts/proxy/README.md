# Residential proxy rollout (Bright Data)

Goal: run Mercari and Poshmark entirely from the server (posting, delisting after a sale, and the
hourly sold check) so no extension is needed, for about **$2–5 per user per month** in proxy
traffic. The extension stays available as an opt-in per marketplace (Settings → Marketplaces). Each step below is a go/no-go test. Nothing is switched on until
you set the env vars, so you can merge this before buying anything.

## What the code does

| Piece | File |
|---|---|
| Bright Data config, one fixed IP per user per marketplace | `src/services/proxy/residential-proxy.ts` |
| Metered HTTP through that IP | `src/services/proxy/proxy-fetch.ts` |
| Per-user byte metering + 1,000 cross-posts/month cap | `src/services/proxy/proxy-usage.service.ts` (`ProxyUsage` table) |
| Photo compression (≤1200px JPEG, ~100–150 KB) | `src/services/images/marketplace-image.ts` |
| Mercari publish/delist: HTTP first, browser only if Cloudflare challenges | `src/services/marketplace/mercari-server.service.ts` |
| Worker: extension gets first go if online, server otherwise | `src/jobs/mercari-server.worker.ts` |
| Server vs extension, per user per marketplace (server by default) | `src/services/automation-mode.ts`, `src/routes/automation.ts` |
| Poshmark publish / delist / status over the proxy | `src/services/marketplace/poshmark-server.service.ts`, `src/jobs/poshmark-server.worker.ts` |
| Hourly Mercari/Poshmark sold check from the server (sold feeds, not per-item pages) | `src/services/server-status-sweep.service.ts` (cron in `src/jobs/sync.job.ts`) |
| eBay sold check: GetMyeBaySelling, ~2 calls/hour per store | `src/services/ebay-status.service.ts` |
| Browsers: same IP per user, images/fonts/trackers blocked, bytes metered | `src/services/playwright/base-marketplace-browser.service.ts` |

## Step 0: before buying (done)
- `pnpm --filter @repo/api proxy:test compression`: 4.8 MB synthetic photo → 117 KB.
  Real eBay-imported photos: about 450 KB → 230 KB.
- Apply the DB migration: `pnpm db:migrate` (adds `ProxyUsage`).

## Step 1: buy Bright Data, check the proxy
1. Create a **Residential** zone. Complete KYC so the zone has full access; otherwise Bright Data
   intercepts SSL and blocks some sites. Ask support whether mercari.com and poshmark.com are allowed.
2. Put `BRIGHTDATA_CUSTOMER_ID / ZONE / PASSWORD` in `apps/api/.env` and in Railway.
3. Run `pnpm --filter @repo/api proxy:test check`
   - `userA.sticky: true`: the same user keeps the same IP
   - `separateIpsPerUser: true`
   - `mercariHome.challenged`: shows whether Cloudflare challenges a plain request

## Step 2: option B (direct photo upload) — must run on Railway
Set `PROXY_TEST_TOKEN` (any random string of 16+ characters) in Railway and deploy, then:
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/mercari-upload \
  -H "x-proxy-test-token: <token>" -H "content-type: application/json" \
  -d '{"userId":"<a user with Mercari connected>"}'
```
- `direct` ok → set `MERCARI_UPLOAD_DIRECT=true`. Photos skip the proxy, which removes about
  75% of proxy cost.
- Only `proxied` ok → leave it off. Earlier ZenRows work suggests this is the likely result: a
  datacenter IP got HTTP 403.

## Step 3: Cloudflare (createListing/delist path)
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/mercari-cloudflare \
  -H "x-proxy-test-token: <token>" -H "content-type: application/json" -d '{"userId":"<id>"}'
```
Run it twice. Ideal result: the second run shows `usedBrowser: false`, meaning the saved clearance
cookie was reused and the cheap path works. If it errors with a Cloudflare challenge, the fallback
is Bright Data's Scraping Browser for createListing only.

## Step 4: turn it on for real
`MERCARI_SERVER_PUBLISH=true` (needs `REDIS_URL`). Cross-list one item from your phone with the
extension closed. Then check the bytes it cost:
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/usage -H "x-proxy-test-token: <token>"
```

## Step 5: Poshmark over the proxy (read-only test)
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/poshmark-read   -H "x-proxy-test-token: <token>" -H "content-type: application/json" -d '{"userId":"<id>"}'
```
- `session.ok` → the cookies the extension captured work from the residential IP.
- `postRead.result.status` should be `active` for a live listing. This endpoint is confirmed.
- `soldFeed.ok` → the closet sold filter works (this endpoint is an **inference**, never captured).
  If it fails, the sweep falls back to up to `POSHMARK_SWEEP_MAX_POST_READS` per-post reads an
  hour (oldest first), which costs more. Send me the error and I'll fix the request shape.
- Each result has `bytes`, which feeds the cost estimate.

Then set `POSHMARK_SERVER_AUTOMATION=true`, cross-list one item to Poshmark with the extension
closed, and delist it from Omventa.

## Step 6: capture Mercari's sold-feed query (needed for server sale detection)
Today the extension reads every item page (~300 KB each) to detect a sale. Through a paid proxy
that would be tens of GB per user, so the server reads the seller's sold feed instead. Mercari
only runs registered queries, so it has to be captured:
```bash
pnpm --filter @repo/api proxy:capture-mercari
```
Log in, then open My Page → Listings → **In Progress** and **Sold/Complete**, and one sold item.
Close the window. The script prints "Sold-feed candidates" as JSON. Check each candidate's
`responseSample` in the capture file: keep the ones that list *your* sold/in-progress items. Then
set `MERCARI_SOLD_FEED_QUERIES` to that JSON on one line and test it:
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/mercari-sold-feed   -H "x-proxy-test-token: <token>" -H "content-type: application/json" -d '{"userId":"<id>"}'
```
Until this is set, the server can **post and delist** on Mercari but **can't detect Mercari
sales**. Users in server mode see a notice to keep the extension installed. Sweep runs fail
with a clear message; they never report "nothing sold".

## Step 7: eBay sold check (no proxy)
```bash
curl -X POST https://<api-host>/api/internal/proxy-tests/ebay-activity   -H "x-proxy-test-token: <token>" -H "content-type: application/json" -d '{"userId":"<id>","days":7}'
```
`calls` should be about 2. `soldButStillActiveHere` lists sales the next hourly sweep will act on.

When testing is done, remove `PROXY_TEST_TOKEN` from Railway.
