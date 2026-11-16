# Residential proxy rollout (Bright Data)

Goal: post to Mercari from any device without the Chrome extension, for about **$2–5 per user
per month** in proxy traffic. Each step below is a go/no-go test. Nothing is switched on until
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

## Step 5: capture the sold-feed query (for cheap sale detection)
Today sale detection reads every item page (~300 KB each). That's fine in the extension, but through
a paid proxy it would be tens of GB per user. Capture the query instead:
```bash
pnpm --filter @repo/api proxy:capture-mercari
```
Log in, then open My Page → Listings → Sold/Complete, In Progress, Active, and one sold item.
Close the window and send me the operation names (the file holds your session data; keep it local).

When testing is done, remove `PROXY_TEST_TOKEN` from Railway.
