# Manual Mercari publish script

Publishes a single listing to Mercari via Mercari's **direct GraphQL API**. Reproduces the
two-step flow from [extension/background.js](../../extension/background.js):

1. **`uploadTempListingPhotos`** — multipart-upload each image → Mercari `uploadId` (UUID)
2. **`createListing`** — create the listing with those uploadIds

**Zero dependencies** — uses Node's built-in `fetch`/`FormData`/`Blob` (Node ≥ 18; tested on 26).

## Why it's split (direct upload + ZenRows createListing)

These were confirmed empirically against `www.mercari.com`:

| Call | Cloudflare | Region gate | Working transport |
|------|-----------|-------------|-------------------|
| `uploadTempListingPhotos` (multipart) | not challenged | none | **direct** (no proxy), from anywhere |
| `createListing` (JSON) | managed challenge on datacenter/non-clean IPs | **US only** (`ListingNotAllowedIpException`) | **ZenRows** (`js_render` + US premium proxy) — solves Cloudflare *and* gives a US IP |

- Auth is just the **Bearer access token** (+ `x-csrf-token`). **No session cookies needed.**
- A raw `fetch`/curl (even curl-impersonate) to `createListing` through a datacenter proxy hits
  Cloudflare's *managed challenge* (`cf-mitigated: challenge`) — unsolvable without a real
  browser. ZenRows runs a real browser server-side, solves it, and forwards your authenticated
  request. That's why `createListing` goes through ZenRows.
- **If you run this script from a US residential IP**, set `"createTransport": "direct"` and skip
  ZenRows entirely — both calls will work directly.

## Setup & run

```bash
cd scripts/mercari-publish
cp listing.example.json listing.json      # edit: session, listing, zenrowsApiKey
node publish-mercari.mjs listing.json --dry-run   # preview payload, no requests
node publish-mercari.mjs listing.json             # publish
```

## Config (see `listing.example.json`)

- **`session.accessToken`** / **`session.csrfToken`** — from a logged-in mercari.com tab, in the
  DevTools console:
  ```js
  await (await fetch("/v1/initialize", { credentials: "include" })).json()
  // → use .accessToken and .csrf
  ```
- **`createTransport`** — `"zenrows"` (default) or `"direct"` (only if you're on a US IP).
- **`zenrowsApiKey`** — required for `"zenrows"`. Photo upload never uses it.
- **`listing.price`** — in **cents**. **`listing.categoryId`** — numeric Mercari leaf id (required).
- **`listing.images`** — URLs or local file paths; uploaded directly.

## Note on `createListing` validation

`createListing` is reached and authenticated successfully; Mercari validates the listing fields
server-side. Some categories require extra fields (`brandId`, `sizeId`, `dimensions`, a size for
apparel). If Mercari returns a generic `ValidationException`, the chosen `categoryId` needs more
fields — capture a real listing's `createListing` request from your browser's DevTools to see the
exact required fields for that category, and add them to `listing.json`.
