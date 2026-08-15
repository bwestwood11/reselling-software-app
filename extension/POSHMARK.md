# Poshmark internal API — reverse-engineering notes

Poshmark has **no public API**. Everything below was captured on 2026-08-15 by driving a real
`poshmark.com/create-listing` session end-to-end with Playwright — network capture, plus a
`page.route()` intercept to read raw multipart bodies (Playwright's passive request listener
can't see multipart/FormData bodies) — and by replicating the extension's exact requests via
raw `fetch()` calls in an authenticated tab to isolate individual validation errors. Every
claim marked **CONFIRMED** was directly observed on live traffic; everything else is inference
and should be treated as lower-confidence.

This is the reference for `extension/background.js`'s Poshmark integration
(`postToPoshmarkApi` and everything it calls). If Poshmark changes their client and posting
starts failing, **redo this capture process** rather than guessing — every past guess in this
integration that wasn't verified this way turned out to be wrong at least once (see
"History of wrong guesses" at the bottom).

## Auth

Cookie-based session, no API keys or OAuth. Cookies are captured once at "connect" time
(`capturePoshmarkSession` in `background.js`) via `chrome.cookies.getAll()` (which can read
httpOnly cookies) and stored server-side; they're restored into the browser's cookie jar
before each posting run (`restorePoshmarkCookies`).

Relevant cookies (domain `poshmark.com` / `.poshmark.com`):

| Cookie | httpOnly | Purpose |
|---|---|---|
| `jwt` | yes | Main session JWT. Confirms the session is active. |
| `ui` | yes | URL-encoded JSON: `{uid, dh, fn, em, ...}`. `uid` is the Poshmark **internal user id** (24-char hex, e.g. `6a2eae99981d480d0d3e3d39`) used in every `vm-rest/users/{userId}/...` URL. `dh` = username handle (e.g. `flipping_studio`), `fn` = full name (URL-encoded, `+` for spaces). Stored as `MarketplaceConnection.accountId`. |
| `_csrf` | **no** | Raw CSRF token string. **Poshmark re-issues this cookie on every page render** — a token captured at connect time goes stale the moment the tab navigates again. Always read the *live* cookie value right before each posting run (`getLivePoshmarkCsrf`), falling back to the stored one only if the live read fails. |
| `usegv3`, `vsegv3` | yes | Segment/experiment flags. Not used by the integration, captured for completeness. |
| `esid` | — | Session id. |
| `ses_exp`, `max_auth_exp` | — | Session/auth expiry timestamps. |

**Auth header:** `x-xsrf-token: <live _csrf cookie value>` on every write. **CONFIRMED** —
NOT `X-CSRF-Token`, which was the original (wrong) guess and is silently ignored by the
server (requests still 200, they just fail downstream on the actual auth check or, worse,
partially succeed and produce the silent-failure modes documented below).

All requests use `credentials: "include"` so the browser sends cookies automatically; no
manual `Cookie` header construction. Requests must originate from a real `poshmark.com` tab
(via `chrome.scripting.executeScript`), not the extension's service worker, or CORS blocks
them.

## The listing-creation flow

Poshmark's "create listing" flow is **not one API call**. It's four calls scoped to a
mutable draft-post id, mirroring exactly what the real web client does when you fill out
poshmark.com/create-listing and click through to "List This Item":

```
1. POST /vm-rest/users/{userId}/posts?pm_version={PM_VERSION}
     body: {}
     → { id: draftId, status: "draft", pictures: [], scratch_pictures: [], ... }

2. POST /api/posts/{draftId}/media/scratch?app_type=web        (once per image)
     multipart/form-data, field name "file", filename "file{N}.{ext}"
     → { id: pictureId, url, url_small, url_large, content_type, md5_hash, ... }

3. POST /vm-rest/posts/{draftId}?pm_version={PM_VERSION}
     body: { post: { ...listing fields... } }
     → { trace_id } on success — see "Silent failures" below for what it looks like on failure

4. PUT /vm-rest/posts/{draftId}/status/published?app_version={APP_VERSION}&pm_version={PM_VERSION}
     body: {}
     → { trace_id } on success
```

**A 5th step is required and is not optional in practice**, because step 4 can silently no-op
(see below):

```
5. GET /vm-rest/posts/{draftId}?app_version=5.04&pm_version={PM_VERSION}
     → confirm response.data.status === "published"
```

### Step 1 — create draft

`POST https://poshmark.com/vm-rest/users/{userId}/posts?pm_version=2026.33.00`, body `{}`.

Response is the full (mostly empty) post object. The only field the caller needs is `id`.
Everything else (`status: "draft"`, empty `pictures`/`scratch_pictures`/`catalog`, an
auto-created `inventory_unit_id`, etc.) is server-generated scaffolding.

### Step 2 — upload each image

`POST https://poshmark.com/api/posts/{draftId}/media/scratch?app_type=web`

Note the host path is `/api/posts/...`, **not** `/vm-rest/posts/...` like every other call in
this flow — easy to get wrong.

Multipart body, one field:

```
Content-Disposition: form-data; name="file"; filename="file0.jpeg"
Content-Type: image/jpeg
```

**CONFIRMED** field name is `file` (originally guessed as `photo` — wrong, produced a
same-shaped 404 as described below). Filename observed as `file{index}.jpeg` for the Nth
image in a multi-image upload (0-indexed) — this is almost certainly cosmetic (only the
`Content-Type` header governs server-side decoding), but the extension matches it anyway
since it costs nothing.

Response:

```json
{
  "id": "6a806ff7c9ddec66084c6255",
  "creator_id": "6a2eae99981d480d0d3e3d39",
  "picture": "6a806ff7c9ddec66084c6255.jpeg",
  "path": "posts/2026/08/15/{draftId}/m_6a806ff7c9ddec66084c6255.jpeg",
  "path_small": "...", "path_large": "...",
  "content_type": "image/jpeg",
  "storage_location": "or",
  "md5_hash": "09ae0b3fb0fa1fa09fd8e8c8910f4c80",
  "created_at": null,
  "url": "https://di2ponv0v5otw.cloudfront.net/posts/2026/08/15/{draftId}/m_6a806ff7c9ddec66084c6255.jpeg",
  "url_small": "...", "url_large": "...",
  "url_webp": null, "url_small_webp": null, "url_large_webp": null
}
```

The picture `id` (top-level, not nested under `data`) is what step 3 references. Until step 3
successfully references it, the image sits in the draft's `scratch_pictures` array — it is
**not** automatically attached to the listing just by being uploaded.

The real web client always re-encodes to JPEG client-side (a `<canvas>` crop step) before
upload, regardless of the source file format — every captured `Content-Type` was
`image/jpeg`. The extension instead forwards the source image's real content-type (JPEG/PNG/
WebP/GIF) with a matching extension, since it doesn't have a cropper; this has worked in
testing (source images from eBay/inventory are essentially always real JPEGs) but hasn't been
verified against a non-JPEG source image.

### Step 3 — save listing fields

`POST https://poshmark.com/vm-rest/posts/{draftId}?pm_version=2026.33.00`

Full confirmed body shape (from a real 2-image, sized, priced submission):

```json
{
  "post": {
    "external_source": null,
    "external_source_id": null,
    "catalog": {
      "department": "000e8975d97b4e80ef00a955",
      "category": "00188975d97b4e80ef00a955",
      "category_features": ["007a9287d97b4e80ef00a955"]
    },
    "colors": [],
    "inventory": {
      "size_quantity_revision": 0,
      "status": "available",
      "size_quantities": [
        {
          "size_id": "M",
          "size_obj": { "id": "M", "display": "M", "size_system": "us" },
          "size_system": "us",
          "quantity_available": 1,
          "quantity_sold": 0
        }
      ]
    },
    "price_amount": { "val": 25, "currency_code": "USD" },
    "original_price_amount": { "val": 0, "currency_code": "USD" },
    "offer_auto_actions_v2_enabled": false,
    "offer_auto_actions_min_price_amount": null,
    "title": "...",
    "description": "...",
    "condition": "ug",
    "cover_shot": { "id": "<pictureId of the first uploaded image>" },
    "pictures": [{ "id": "<pictureId of a subsequent image>" }],
    "videos": [],
    "seller_private_info": {},
    "style_tags": [],
    "autolist_draft": false,
    "seller_shipping_discount": { "id": null }
  }
}
```

Field-by-field notes, all **CONFIRMED** by isolating individual validation errors:

- **`catalog.department` / `catalog.category`** — required. IDs come from Poshmark's static
  department→category→subcategory tree, bundled in `apps/web/src/lib/poshmark/data.ts` (there
  is no category-search API the way eBay/Mercari have one — see "Category taxonomy" below).
  A post with no department/category is accepted by this endpoint (HTTP 200, no embedded
  error) but never becomes publishable — see "Silent failures" below.
- **`catalog.category_features`** — the subcategory, as a **1-element array**, not a scalar
  (`subcategoryId ? [subcategoryId] : []`). Optional.
- **`colors`** — **CONFIRMED the naive `{ name: "Black" }` shape is invalid.** Sending it
  produces `InvalidInputError: Invalid color {"name"=>"Black"}` and fails the *entire* save
  (not just the color). A real published listing's color object, read back from a `GET`, has
  the shape `{ "name": "Brown", "rgb": "#663509", "message_id": "brown" }` — a canonical
  triple from Poshmark's own color catalog. No metadata endpoint for this list was
  discoverable (`/vm-rest/meta/colors`, `/vm-rest/metadata/colors`,
  `/vm-rest/meta/catalog_colors` all 404). **Current extension behavior: `colors` is always
  sent as `[]`** — colors are dropped from Poshmark listings until real canonical data is
  found. Do not re-enable this without first finding the real color list.
- **`inventory.size_quantities[].size_obj`** — **CONFIRMED a reduced shape is sufficient.**
  The real web client sends a fully denormalized object (`short`, `long`,
  `display_with_size_set`, `display_with_size_system`, `display_with_system_and_set`,
  `equivalent_sizes: {au, eu, uk}`) sourced from its local size-metadata cache. Sending only
  `{ id, display, size_system: "us" }` and letting Poshmark fill in the rest server-side
  (confirmed via a raw-fetch test: category Men → Sweaters, size `XLT` came back from a `GET`
  with `display_with_size_set`, `display_with_size_system`, `display_with_system_and_set`,
  and `size_set_tags: ["big_&_tall"]` all populated) **works and publishes correctly.**
- **`inventory.size_quantities`** — if empty (no size), the save is accepted but the listing
  can never publish. See "Silent failures".
- **`price_amount.val` / `original_price_amount.val`** — **CONFIRMED must be a whole dollar
  integer.** Sending `19.99` produces `InvalidInputError: "Whole dollar amount required"`.
  Every real captured listing in this session used an integer price (`25`, `20`, `34`, ...).
  The extension rounds to the nearest dollar (`Math.round(cents / 100)`) — a $19.99 listing
  posts as $20, not $19. This is a genuine Poshmark platform constraint on the *creation* API,
  not a bug in this integration; if you see cent-priced listings live on Poshmark elsewhere,
  they were likely created by a different path (Smart Sell auto-adjustment, mobile app, an
  older API version) or edited after creation.
- **`condition`** — a short code, not the display label. **CONFIRMED** by reading the
  `data-et-prop-content` attribute directly off the live condition-dropdown DOM on
  poshmark.com/create-listing (not inferred from behavior):

  | Display label | Code |
  |---|---|
  | New With Tags (NWT) | `nwt` |
  | Like New | `uln` |
  | Good | `ug` |
  | Fair | `uf` |

- **`cover_shot.id`** — the first (or "primary") uploaded picture id. In the one real capture
  with 2 images, the client actually put the *second*-uploaded image's id here and the
  *first*-uploaded image's id in `pictures` — cover/rest ordering does not appear to matter to
  the server (a test with the opposite ordering still published correctly), only that both ids
  are valid pictures belonging to this draft.
- **`pictures`** — array of `{ id }` for every uploaded image *except* the one used as
  `cover_shot`.
- **`seller_shipping_discount.id`** — `null` for no discount, otherwise one of the discount
  ids from `GET /vm-rest/users/{userId}/seller_shipping_discounts/post` (see "Other metadata
  endpoints" below). Observed real ids: `5ff7647a5d29bbebfa25f9d0` (No Discount),
  `5ff7647a5d29bbebfa25f9d2` ($4.99 label / $1.50 discount),
  `5ff7647a5d29bbebfa25f9d3` (Free / $6.49 discount) — these are **account/region-scoped**,
  not universal constants; always fetch them live rather than hardcoding.
- **`brand`** — plain string, optional.
- **`style_tags`** — `[{ name: "..." }]`, optional, max 3 in the web UI (not confirmed as a
  hard server-side limit).

### Step 4 — publish

`PUT https://poshmark.com/vm-rest/posts/{draftId}/status/published?app_version=2.55&pm_version=2026.33.00`,
body `{}`. Success response is just `{ trace_id }`.

### Step 5 — verify (not optional — see below)

`GET https://poshmark.com/vm-rest/posts/{draftId}?app_version=5.04&pm_version=2026.33.00`

Check `response.data.status === "published"`. This step is required because of:

## Silent failures — the most important thing in this document

**CONFIRMED, repeatedly, across three separate root causes:** Poshmark's `vm-rest` API
frequently returns **HTTP 200 with the real error embedded in the JSON body**, not as an HTTP
error status:

```json
{
  "error": {
    "errorType": "InvalidInputError",
    "params": null,
    "pmErrorCode": null,
    "userMessage": "Whole dollar amount required",
    "stackTrace": null,
    "errorMessage": null,
    "statusCode": 400
  },
  "meta": { "api_url": "/posts/{draftId}?pm_version=2026.33.00" },
  "trace_id": "..."
}
```

`statusCode: 400` here is a field *inside the JSON*, describing what the status *should* have
been — the actual HTTP response is 200 OK. Checking `res.ok` (or any status-code-based check)
alone will treat this as success.

Confirmed error shapes:
- `userMessage` populated: `{"errorType":"InvalidInputError","userMessage":"Whole dollar amount required",...}`,
  `{"errorType":"InvalidInputError","userMessage":"Invalid color {\"name\"=>\"Black\"}",...}`
- `userMessage: null`, only `errorType` useful: `{"errorType":"ValidationError","userMessage":null,...}`
  (observed on the *publish* endpoint when the draft has missing required fields — the publish
  call "succeeds" at HTTP level and returns this generic embedded error with no further
  detail; the draft is left as `status: "draft"`).

The unmatched-route 404 case (see "Wrong URL" below) is a *different*, correctly-signaled
failure — that one does come back as a real non-200 HTTP status.

**Second-order silent failure — publish can no-op even without an embedded error.** In at
least one observed case, `PUT .../status/published` returned a clean `{"trace_id": "..."}`
(no embedded error, HTTP 200) and yet the draft was left at `status: "draft"`, with its
uploaded images still sitting in `scratch_pictures` (never promoted to `pictures`). Root
cause that time: the draft had no size set. **The only reliable way to know a listing
actually published is step 5 — a follow-up `GET` checking `status === "published"`.** Do not
trust the publish call's own response, even when it looks clean.

Diagnostic signal for "why didn't this publish": on the `GET` response, check
`inventory.size_quantities.length === 0` (no size — very likely cause) and
`scratch_pictures.length > 0` (images never got attached — a symptom of the save never truly
taking effect, whatever the underlying cause).

## Category taxonomy

Poshmark's department → category → subcategory tree has **no query/search API** — it's a
static tree, bundled client-side and reproduced in `apps/web/src/lib/poshmark/data.ts`. The
authoritative live version can be re-fetched from:

`GET /vm-rest/meta/catalog_display?pm_version=2026.33.00` — the raw tree, `{type, id,
children: [...]}` nodes, ids only (no display names — cross-reference against
`catalog_v2` or the bundled data for display labels).

`GET /vm-rest/meta/catalog_v2?pm_version=2026.33.00` — presumably the display-name-annotated
version (not fully inspected this session).

Known department ids: `000e8975d97b4e80ef00a955` = Women, `01008c10d97b4e1245005764` = Men
(others un-enumerated).

**Prefilling this taxonomy for a cross-listed item is fundamentally limited**: there is no
eBay/Mercari → Poshmark category mapping (`apps/api/src/services/prefill/poshmark.ts`), so a
category can only ever be carried over from a *prior* Poshmark listing of the same item. A
brand-new item being cross-listed to Poshmark for the first time gets **no** department/
category/subcategory/size prefill and must have them set manually in the crosslist form
before submitting (`use-crosslist-form.ts` / `use-listing-form.ts`'s `validatePoshmarkFields`
blocks submission if department+category, or size when the category has one, are missing).

**Sizes are category-scoped**, not global — `POSHMARK_SIZE_MAP[subcategoryId] ??
POSHMARK_SIZE_MAP[categoryId]` in `use-poshmark-fields.ts`. `GET
/vm-rest/metadata/sizes?pm_version=...` exists but returns a **different, unrelated** size-id
namespace (`womens_dresses_xxs` style ids used by Poshmark's "My Size" profile feature) — do
not use it for listing-creation size ids.

## Other metadata endpoints observed (not all fully documented)

All under `https://poshmark.com/vm-rest/...` unless noted, all take `?pm_version=2026.33.00`
(and sometimes `&app_version=X`):

| Endpoint | Purpose |
|---|---|
| `GET /users/{userId}/drafts` | List the user's saved drafts. |
| `GET /users/{userId}/external_services` | Connected external services (Pinterest, Facebook, etc.) for share options. |
| `GET /users/{userId}/state/summary?tags=...&host_promo_tag=...` | Account tags/flags (`lister`, `seller`, `promoted_posts_eligible`, ...). |
| `GET /users/{userId}/seller_shipping_discounts/post?price_amount=...&object_id={draftId}` | Available shipping-discount options + labels for this draft, scoped to the current price. |
| `GET /users/{userId}/seller_earnings/post?price_amount=...&object_id={draftId}` | Seller payout preview for a given price. |
| `GET /users/{userId}/suggested_offer_auto_action_min_price/post?price_amount=...&object_id={draftId}` | Smart-Sell / offer auto-accept price suggestion. |
| `GET /users/{userId}/promoted_posts_promotion_types` | Ad/promotion options for the closet. |
| `GET /users/{userId}/promoted_posts_promotions/latest` | Latest promotion status. |
| `GET /posts/comparables?input={json}&suggest_price=true&count=8` | "Similar sold listings" + suggested price, shown while filling the price field. `input` is a URL-encoded JSON blob mirroring the in-progress post (title, description, condition, catalog, cover_shot, pictures). |
| `GET /meta/style_tags/top` | Popular style tags for the tag-picker. |
| `GET /metadata/size_chart/{categoryId}?chartType=measurements` | Measurement chart for a category (shown in the size picker). |
| `GET /current_parties/us`, `GET /current_block_parties/us` | Poshmark Party/live-selling event listings — unrelated to posting. |
| `POST /api/posts/{postId}/media/scratch?app_type=web` | Image upload (see step 2). Note `/api/posts/...`, not `/vm-rest/posts/...`. |
| `POST /vm-api/logger?pm_version=...` | Client-side error/telemetry logging. Irrelevant to posting logic. |

Delete a listing (used to clean up test listings during this investigation, not currently
automated in the extension): navigate to `https://poshmark.com/edit-listing/{id}`, click the
**"Delete Listing"** link/heading, confirm with the **"Yes"** button in the resulting
"Confirm Delete Listing" dialog. Works on both draft and published listings.

## `pm_version` / `app_version`

Every `vm-rest` call carries `pm_version` (observed: `2026.33.00`); publish additionally
carries `app_version` (observed: `2.55` on the publish call, `5.04` on most `GET`s). These
read as client-build version strings tied to Poshmark's own web deploys and **will drift over
time**. They don't appear to be strictly validated (no version-mismatch errors were observed
in this session), but if calls start failing in a way that looks version-related, re-capture
current values from a live `poshmark.com/create-listing` session the same way this whole
document was produced, rather than guessing new ones.

Current values live in `extension/background.js` as `POSHMARK_PM_VERSION` /
`POSHMARK_APP_VERSION`.

## History of wrong guesses (why "verify against live traffic" matters here)

Every one of these was written into the extension at some point *without* being checked
against real traffic, and every one turned out to be wrong when finally tested:

- `POST /api/v2/post` and `POST /api/v2/post.picture` as the listing-creation and
  image-upload endpoints — **don't exist**. Poshmark returned a 404 whose body echoes the
  method+path back as the error message (`{"error":{"error_type":"InternalError","message":
  "POST /v2/post.picture"}}`), which reads deceptively like a real API error rather than an
  unmatched-route 404 — this is what made it look like a validation failure instead of a
  wrong URL for a while.
- `X-CSRF-Token` as the auth header name — real header is `x-xsrf-token`.
- `photo` as the image-upload multipart field name — real field name is `file`.
- Condition codes `good` / `like_new` / `fair` — real codes are `ug` / `uln` / `uf` (`nwt` was
  coincidentally right).
- Checking `response.ok` (HTTP status only) as sufficient to detect a failed `vm-rest` call —
  Poshmark returns embedded errors with outer HTTP 200 (see "Silent failures" above).
- Reading `response.data.error.message` for an error string — the real field is
  `.userMessage` (`.message` doesn't exist on the embedded error object).
- Sending decimal prices (`19.99`) — Poshmark requires whole-dollar integers on creation.
- Sending `colors` as `[{ name: "Black" }]` — real shape needs `{name, rgb, message_id}`
  from a canonical catalog with no discoverable metadata endpoint; currently disabled.

If you're debugging a new Poshmark failure and none of the above explains it, **don't guess a
fix** — go capture real traffic first (see the top of this document for the method), because
history says the guess will very likely be wrong in some non-obvious way.
