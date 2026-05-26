# eBay Import Feature — Design Spec

**Date:** 2026-05-26  
**Status:** Approved  
**Scope:** Import existing eBay listings into the platform inventory (eBay only for now; architecture supports future platforms)

---

## Overview

Users with a connected eBay account can browse their existing eBay listings and bulk-import selected ones into the platform. Each imported listing creates an `InventoryItem` + `Listing` record in the database. The `Listing.externalId` field (already in schema) stores the eBay `ItemID`, which serves as the authoritative duplicate-detection key.

---

## Architecture

### New API endpoints (added to `apps/api/src/routes/marketplaces.ts`)

```
GET  /api/marketplaces/ebay/importable-listings
     ?status=active|ended|sold   (default: active)
     ?showImported=true|false     (default: false)
     ?page=1&limit=50            (in-memory pagination — all fetched from eBay at once, then sliced)

POST /api/marketplaces/ebay/import
     body: { ebayItemIds: string[] }
```

### New service class

`apps/api/src/services/marketplace/import.service.ts` — `ImportService`

Responsible for:
- Fetching listings from the eBay adapter
- Cross-referencing with local `Listing` table to determine import status
- Atomically creating `InventoryItem` + `InventoryImage[]` + `Listing` records per import

### Existing code reused

- `EbayAdapter.getSellerListings()` — already fetches active eBay listings via GetMyeBaySelling API
- `refreshConnectionIfNeeded()` — handles token refresh before API calls
- `MarketplaceFactory.create()` — resolves the eBay adapter from the user's connection

---

## API Design

### `GET /api/marketplaces/ebay/importable-listings`

1. Resolve user's active `MarketplaceConnection` for `EBAY`
2. Call `EbayAdapter.getSellerListings()` with the requested `status` filter
3. Extract all `ItemID` values from the response
4. Query `Listing` table: `WHERE marketplace = EBAY AND userId = <user> AND externalId IN (<ids>)`
5. Build a Set of already-imported IDs
6. Attach `isImported: boolean` to each result
7. If `showImported = false`, filter out imported items before returning

**Response shape:**
```json
{
  "success": true,
  "data": [
    {
      "ebayItemId": "123456789",
      "title": "Nike Air Max",
      "price": 12000,
      "conditionId": "1000",
      "quantity": 1,
      "status": "Active",
      "imageUrl": "https://...",
      "category": "Sneakers",
      "viewItemUrl": "https://ebay.com/itm/123456789",
      "isImported": false
    }
  ],
  "total": 47,
  "page": 1,
  "totalPages": 1
}
```

### `POST /api/marketplaces/ebay/import`

1. Receive `ebayItemIds: string[]`
2. Re-fetch full details for each item via eBay `GetItem` Trading API call (one call per item, fresh data at import time)
3. Query DB for any IDs already imported — skip those (race condition guard)
4. For each remaining item, run a Prisma transaction:
   - Create `InventoryItem`
   - Create `InventoryImage[]`
   - Create `Listing` (status mirrors eBay status, `externalId = ebayItemId`)
5. Return per-item result array

**Request:**
```json
{ "ebayItemIds": ["123456789", "987654321"] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": ["123456789"],
    "skipped": ["987654321"],
    "failed": []
  }
}
```

---

## Data Mapping

| eBay field | Our field | Notes |
|---|---|---|
| `ItemID` | `Listing.externalId` | Duplicate-detection key |
| `Title` | `InventoryItem.title` + `Listing.title` | |
| `Description` | `InventoryItem.description` + `Listing.description` | |
| `SellingStatus.CurrentPrice` | `InventoryItem.targetPrice` + `Listing.price` | Converted to cents |
| `StartPrice` | `InventoryItem.costPrice` | Best approximation; no cost data from eBay |
| `ConditionID` | `InventoryItem.condition` | See reverse map below |
| `PictureDetails.PictureURL[]` | `InventoryImage[]` | First = `isPrimary`, rest sorted by index |
| `PrimaryCategory.CategoryName` | `InventoryItem.category` | |
| `Quantity` | `InventoryItem.quantity` | |
| `ListingStatus` | `Listing.status` | Active→ACTIVE, Completed→SOLD, Ended→ENDED |
| `ListingDetails.ViewItemURL` | `Listing.externalUrl` | |
| `ItemSpecifics.NameValueList[]` | `InventoryAttribute[]` | name/value pairs |

**Condition reverse map:**

| eBay ConditionID | Our Condition |
|---|---|
| 1000 | NEW_WITH_TAGS |
| 1500 | NEW_WITHOUT_TAGS |
| 3000, 4000 | VERY_GOOD |
| 5000 | GOOD |
| 6000 | SATISFACTORY |
| (unknown) | GOOD (fallback) |

**Defaults on import:**
- `InventoryItem.status` = `ACTIVE`
- `InventoryItem.sku` = `""` (no SKU equivalent in eBay Trading API)
- `Listing.marketplace` = `EBAY`

---

## Frontend

### Entry point

New "Import from eBay" button on `/inventory` page (top-right, beside "Add Item").  
Links to new page: `/inventory/import`.

### `/inventory/import` page

```
┌─────────────────────────────────────────────────────────┐
│  Import from eBay                                        │
│  ─────────────────────────────────────────────────────  │
│  [Status: Active ▾]  [☐ Show already imported]   Search │
│                                                          │
│  ☐  Select all (23 items)          [Import 0 selected]  │
│  ─────────────────────────────────────────────────────  │
│  ☐  [img] Nike Air Max · Active · $120.00 · Qty 1       │
│  ☐  [img] Levi's Jeans · Active · $45.00 · Qty 2        │
│  ✓  [img] Vintage Tee · Active · $30.00  [Imported]     │
│  ☐  [img] Sony Headphones · Active · $89.99 · Qty 1     │
│                                                          │
│                                           [Load more]    │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Already-imported rows: greyed out, checkbox disabled, "Imported" badge shown
- "Show already imported" toggle: includes/excludes imported rows
- Status dropdown: Active (default), Ended, Sold
- "Import X selected" button: fixed at top, count updates live as user selects
- Select all / deselect all (only selects non-imported items)
- After import: success toast, imported rows flip to greyed-out "Imported" in place (no page reload)
- Per-row error shown inline if an individual item fails to import
- No eBay connection: prompt user to connect eBay first

### New files

| File | Purpose |
|---|---|
| `apps/web/src/app/(dashboard)/inventory/import/page.tsx` | Import page |
| `apps/web/src/hooks/use-import.ts` | React Query hooks (fetch + mutation) |

### Modified files

| File | Change |
|---|---|
| `apps/web/src/lib/api.ts` | Add `importApi.getImportableListings()` + `importApi.importItems()` |
| `apps/web/src/app/(dashboard)/inventory/page.tsx` | Add "Import from eBay" button |
| `apps/api/src/routes/marketplaces.ts` | Add two new routes |
| `apps/api/src/services/marketplace/import.service.ts` | New service (create) |

---

## Error Handling

- No eBay connection found → 400 with clear message
- eBay API call fails → 502 with `syncError` message
- Token expired and refresh fails → 401, user prompted to reconnect
- Individual item import fails → logged in response `failed[]` array, does not abort batch
- Duplicate detected server-side → silently added to `skipped[]` array

---

## Out of Scope (this iteration)

- Caching / local snapshot of eBay catalog
- Import from Mercari, Depop, Poshmark, etc.
- Importing eBay draft listings
- Syncing price/quantity changes after import (handled by existing sync job)
