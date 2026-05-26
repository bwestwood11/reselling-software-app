# eBay Import Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to browse their existing eBay listings and bulk-import selected ones into platform inventory as `InventoryItem` + `Listing` records.

**Architecture:** Two new API endpoints hang off the existing `marketplaces.ts` route. A new `ImportService` class fetches from the eBay Trading API, cross-references local DB for duplicate detection, and creates records transactionally. The eBay adapter gets three new methods: status-aware listing fetch, single-item detail fetch, and a static condition reverse-mapper. The frontend adds `/inventory/import` with multi-select, status filter, and imported-item toggle.

**Tech Stack:** Fastify 5, Prisma + PostgreSQL, eBay Trading API (GetMyeBaySelling + GetItem XML), Next.js 15 App Router, React Query (`@tanstack/react-query`), Tailwind CSS, Sonner toasts.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/api/src/services/marketplace/ebay.ts` | Add `listingStatus` to interface, `getSellerListingsByStatus()`, `EbayItemDetail`, `getItemById()`, `reverseMapConditionId()` |
| Create | `apps/api/src/services/marketplace/import.service.ts` | `getImportableListings()`, `importItems()`, DB writes |
| Modify | `apps/api/src/routes/marketplaces.ts` | Add GET + POST import routes |
| Modify | `apps/web/src/lib/api.ts` | Add `importApi` |
| Create | `apps/web/src/hooks/use-import.ts` | React Query hooks for import |
| Create | `apps/web/src/app/(dashboard)/inventory/import/page.tsx` | Import UI page |
| Modify | `apps/web/src/app/(dashboard)/inventory/page.tsx` | Add "Import from eBay" button |

---

## Task 1: Extend EbayAdapter in `ebay.ts`

**Files:**
- Modify: `apps/api/src/services/marketplace/ebay.ts`

### Step 1.1 — Add `listingStatus` to `EbayImportedListing` interface

At the top of the file, change the existing `EbayImportedListing` interface from:

```typescript
export interface EbayImportedListing {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  conditionId: number;
  categoryId: string;
  categoryName: string;
  imageUrls: string[];
  listedAt: Date | null;
}
```

To:

```typescript
export interface EbayImportedListing {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  conditionId: number;
  categoryId: string;
  categoryName: string;
  imageUrls: string[];
  listedAt: Date | null;
  listingStatus: string; // "Active" | "Completed" | "Ended"
}
```

- [ ] Apply the interface change above

### Step 1.2 — Add `EbayItemDetail` interface after `EbayImportedListing`

```typescript
export interface EbayItemDetail {
  itemId: string;
  title: string;
  description: string;
  price: number;       // current price in USD (dollars)
  startPrice: number;  // original listing price in USD (dollars)
  quantity: number;
  conditionId: number;
  categoryId: string;
  categoryName: string;
  imageUrls: string[];
  viewItemUrl: string;
  listingStatus: string;
  itemSpecifics: Array<{ name: string; value: string }>;
  listedAt: Date | null;
}
```

- [ ] Add `EbayItemDetail` after the `EbayImportedListing` interface

### Step 1.3 — Update `parseImportedItem` to extract `listingStatus`

In the existing `parseImportedItem` private method, find the line that starts `return { itemId, title, price, ...` and update the return statement to include `listingStatus`:

```typescript
// Add this line before the return statement:
const listingStatus = this.xmlValue(itemXml, "ListingStatus") ?? "Active";

// Update the return to include listingStatus:
return { itemId, title, price, quantity, conditionId, categoryId, categoryName, imageUrls, listedAt, listingStatus };
```

- [ ] Update `parseImportedItem` to parse and return `listingStatus`

### Step 1.4 — Add `parseNameValuePairs` private method

Add this private method inside the `EbayAdapter` class, after `parseItemBlocks`:

```typescript
/** Parse all <NameValueList> blocks from ItemSpecifics XML into name/value pairs. */
private parseNameValuePairs(xml: string): Array<{ name: string; value: string }> {
  const pairs: Array<{ name: string; value: string }> = [];
  const regex = /<NameValueList>([\s\S]*?)<\/NameValueList>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1] ?? "";
    const name = this.xmlValue(block, "Name");
    const value = this.xmlValue(block, "Value");
    if (name && value) pairs.push({ name, value });
  }
  return pairs;
}
```

- [ ] Add `parseNameValuePairs` private method to `EbayAdapter`

### Step 1.5 — Add `static reverseMapConditionId` method

Add this static method inside `EbayAdapter`, after `mapConditionDescription`:

```typescript
/** Reverse-map an eBay ConditionID to our internal Condition enum value. */
static reverseMapConditionId(conditionId: number): "NEW_WITH_TAGS" | "NEW_WITHOUT_TAGS" | "VERY_GOOD" | "GOOD" | "SATISFACTORY" {
  if (conditionId === 1000) return "NEW_WITH_TAGS";
  if (conditionId === 1500) return "NEW_WITHOUT_TAGS";
  if (conditionId === 3000 || conditionId === 4000) return "VERY_GOOD";
  if (conditionId === 5000) return "GOOD";
  if (conditionId === 6000) return "SATISFACTORY";
  return "GOOD";
}
```

- [ ] Add `static reverseMapConditionId` method to `EbayAdapter`

### Step 1.6 — Add `getSellerListingsByStatus` method

Add this method after the existing `getSellerListings` method. It supports fetching Active, Ended (UnsoldList), and Sold listings using the same `parseItemBlocks` parser:

```typescript
/**
 * Fetches seller listings from eBay by status using GetMyeBaySelling.
 * - active  → <ActiveList>
 * - ended   → <UnsoldList>
 * - sold    → <SoldList> (items are nested inside <Transaction> blocks)
 * Handles pagination automatically (up to 1 000 items as a safety cap).
 */
async getSellerListingsByStatus(
  status: "active" | "ended" | "sold"
): Promise<EbayImportedListing[]> {
  const sectionTag =
    status === "active" ? "ActiveList" : status === "ended" ? "UnsoldList" : "SoldList";

  const all: EbayImportedListing[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <${sectionTag}>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </${sectionTag}>
</GetMyeBaySellingRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("GetMyeBaySelling"),
      body: xml,
    });

    const text = await res.text();
    const ack = this.xmlValue(text, "Ack");
    console.log("[eBay GetMyeBaySelling:%s] page=%d http=%d ack=%s", status, page, res.status, ack ?? "?");

    if (ack === "Failure" || !res.ok) {
      const errors = this.parseXmlErrors(text);
      throw new Error(`eBay GetMyeBaySelling failed: ${errors.join(" | ") || text.slice(0, 300)}`);
    }

    const items = this.parseItemBlocks(text);
    for (const block of items) {
      const listing = this.parseImportedItem(block);
      if (listing) all.push(listing);
    }

    const totalPagesStr = this.xmlValue(text, "TotalNumberOfPages") ?? "1";
    const totalPages = parseInt(totalPagesStr) || 1;
    hasMore = page < totalPages;
    page++;

    if (all.length >= 1000) break;
  }

  console.log("[eBay GetMyeBaySelling:%s] fetched %d listings", status, all.length);
  return all;
}
```

- [ ] Add `getSellerListingsByStatus` method to `EbayAdapter`

### Step 1.7 — Add `getItemById` method

Add this method after `getSellerListingsByStatus`. It calls `GetItem` with `DetailLevel=ReturnAll` to retrieve full item data for import:

```typescript
/**
 * Fetches full details for a single eBay listing by ItemID using GetItem.
 * Used during import to get description, item specifics, and authoritative prices.
 */
async getItemById(itemId: string): Promise<EbayItemDetail> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${this.escapeXml(itemId)}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>true</IncludeItemSpecifics>
</GetItemRequest>`;

  const res = await fetch(this.tradingUrl, {
    method: "POST",
    headers: this.tradingHeaders("GetItem"),
    body: xml,
  });

  const text = await res.text();
  const ack = this.xmlValue(text, "Ack");
  console.log("[eBay GetItem] itemId=%s http=%d ack=%s", itemId, res.status, ack ?? "?");

  if (ack === "Failure" || !res.ok) {
    const errors = this.parseXmlErrors(text);
    throw new Error(`eBay GetItem failed for ${itemId}: ${errors.join(" | ") || text.slice(0, 300)}`);
  }

  const rawDesc = this.xmlValue(text, "Description") ?? "";
  // Strip CDATA wrapper if present
  const description = rawDesc.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();

  const priceStr =
    this.xmlValue(text, "CurrentPrice") ??
    this.xmlValue(text, "BuyItNowPrice") ??
    this.xmlValue(text, "StartPrice") ??
    "0";
  const price = parseFloat(priceStr) || 0;

  const startPriceStr = this.xmlValue(text, "StartPrice") ?? "0";
  const startPrice = parseFloat(startPriceStr) || 0;

  const conditionId = parseInt(this.xmlValue(text, "ConditionID") ?? "5000") || 5000;
  const categoryId = this.xmlValue(text, "CategoryID") ?? "";
  const categoryName = this.xmlValue(text, "CategoryName") ?? "";
  const quantityStr = this.xmlValue(text, "Quantity") ?? "1";
  const quantity = Math.max(1, parseInt(quantityStr) || 1);
  const imageUrls = this.xmlValues(text, "PictureURL").filter((u) => u.startsWith("http"));
  const viewItemUrl =
    this.xmlValue(text, "ViewItemURL") ?? `https://www.ebay.com/itm/${itemId}`;
  const listingStatus = this.xmlValue(text, "ListingStatus") ?? "Active";
  const startTimeStr = this.xmlValue(text, "StartTime");
  const listedAt = startTimeStr ? new Date(startTimeStr) : null;
  const itemSpecifics = this.parseNameValuePairs(text);

  return {
    itemId,
    title: this.xmlValue(text, "Title") ?? "",
    description,
    price,
    startPrice,
    quantity,
    conditionId,
    categoryId,
    categoryName,
    imageUrls,
    viewItemUrl,
    listingStatus,
    itemSpecifics,
    listedAt,
  };
}
```

- [ ] Add `getItemById` method to `EbayAdapter`

### Step 1.8 — Verify the file compiles

```bash
cd /home/diwanshu/Projects/reselling-software-app
pnpm --filter api typecheck 2>&1 | head -40
```

Expected: no errors related to `ebay.ts`. Fix any type errors before proceeding.

- [ ] Run typecheck and fix any errors in `ebay.ts`

### Step 1.9 — Commit

```bash
git add apps/api/src/services/marketplace/ebay.ts
git commit -m "feat(ebay): add status-aware listing fetch, GetItem detail, and condition reverse-map"
```

- [ ] Commit ebay.ts changes

---

## Task 2: Create `ImportService`

**Files:**
- Create: `apps/api/src/services/marketplace/import.service.ts`

### Step 2.1 — Create the file

```typescript
import type { PrismaClient, Condition, ListingStatus } from "@repo/db";
import { EbayAdapter } from "./ebay";
import { refreshConnectionIfNeeded } from "./token-refresh";

export interface ImportableItem {
  ebayItemId: string;
  title: string;
  price: number;       // USD dollars from eBay
  quantity: number;
  conditionId: number;
  categoryName: string;
  imageUrl: string | null;
  listingStatus: string;
  isImported: boolean;
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
  failed: Array<{ id: string; error: string }>;
}

export class ImportService {
  constructor(private db: PrismaClient) {}

  async getImportableListings(
    userId: string,
    status: "active" | "ended" | "sold" = "active",
    showImported = false,
    page = 1,
    limit = 50
  ): Promise<{ data: ImportableItem[]; total: number; page: number; totalPages: number }> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });

    if (!connection?.isActive) {
      throw new Error("eBay account not connected. Connect your eBay account first.");
    }

    const refreshed = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(refreshed);

    const ebayListings = await adapter.getSellerListingsByStatus(status);

    // Determine which eBay item IDs are already tracked in our DB
    const ebayIds = ebayListings.map((l) => l.itemId);
    const existingListings = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", externalId: { in: ebayIds } },
      select: { externalId: true },
    });
    const importedIds = new Set(
      existingListings.map((l) => l.externalId).filter((id): id is string => id !== null)
    );

    let items: ImportableItem[] = ebayListings.map((l) => ({
      ebayItemId: l.itemId,
      title: l.title,
      price: l.price,
      quantity: l.quantity,
      conditionId: l.conditionId,
      categoryName: l.categoryName,
      imageUrl: l.imageUrls[0] ?? null,
      listingStatus: l.listingStatus,
      isImported: importedIds.has(l.itemId),
    }));

    if (!showImported) {
      items = items.filter((i) => !i.isImported);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { data: paged, total, page, totalPages };
  }

  async importItems(userId: string, ebayItemIds: string[]): Promise<ImportResult> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "EBAY" } },
    });

    if (!connection?.isActive) {
      throw new Error("eBay account not connected. Connect your eBay account first.");
    }

    // Server-side guard: skip any IDs already imported (race condition protection)
    const existing = await this.db.listing.findMany({
      where: { userId, marketplace: "EBAY", externalId: { in: ebayItemIds } },
      select: { externalId: true },
    });
    const alreadyImported = new Set(
      existing.map((l) => l.externalId).filter((id): id is string => id !== null)
    );

    const toImport = ebayItemIds.filter((id) => !alreadyImported.has(id));
    const skipped = ebayItemIds.filter((id) => alreadyImported.has(id));
    const imported: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    const refreshed = await refreshConnectionIfNeeded(this.db, connection);
    const adapter = new EbayAdapter(refreshed);

    for (const itemId of toImport) {
      try {
        const detail = await adapter.getItemById(itemId);
        const condition = EbayAdapter.reverseMapConditionId(detail.conditionId) as Condition;
        const listingStatus = this.mapListingStatus(detail.listingStatus);

        await this.db.$transaction(async (tx) => {
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              userId,
              title: detail.title,
              description: detail.description || undefined,
              condition,
              quantity: detail.quantity,
              // Prices from eBay are in USD dollars; store as cents
              targetPrice: detail.price > 0 ? Math.round(detail.price * 100) : undefined,
              costPrice: detail.startPrice > 0 ? Math.round(detail.startPrice * 100) : undefined,
              category: detail.categoryName || undefined,
              status: "ACTIVE",
              images:
                detail.imageUrls.length > 0
                  ? {
                      create: detail.imageUrls.map((url, i) => ({
                        url,
                        key: url,
                        isPrimary: i === 0,
                        sortOrder: i,
                      })),
                    }
                  : undefined,
              attributes:
                detail.itemSpecifics.length > 0
                  ? { create: detail.itemSpecifics }
                  : undefined,
            },
          });

          await tx.listing.create({
            data: {
              userId,
              inventoryItemId: inventoryItem.id,
              marketplaceConnectionId: connection.id,
              marketplace: "EBAY",
              externalId: detail.itemId,
              externalUrl: detail.viewItemUrl || undefined,
              title: detail.title,
              price: detail.price > 0 ? Math.round(detail.price * 100) : 0,
              status: listingStatus,
              listedAt: detail.listedAt,
            },
          });
        });

        imported.push(itemId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[ImportService] Failed to import eBay item %s: %s", itemId, message);
        failed.push({ id: itemId, error: message });
      }
    }

    return { imported, skipped, failed };
  }

  private mapListingStatus(ebayStatus: string): ListingStatus {
    if (ebayStatus === "Active") return "ACTIVE";
    if (ebayStatus === "Completed") return "SOLD";
    if (ebayStatus === "Ended") return "ENDED";
    return "ACTIVE";
  }
}
```

- [ ] Create `apps/api/src/services/marketplace/import.service.ts` with the content above

### Step 2.2 — Typecheck

```bash
pnpm --filter api typecheck 2>&1 | head -40
```

Expected: no errors. Common issue: `Condition` and `ListingStatus` import. If the types aren't exported from `@repo/db`, change the import to use string literals directly (`"ACTIVE" as const` etc.).

- [ ] Run typecheck and fix any errors

### Step 2.3 — Commit

```bash
git add apps/api/src/services/marketplace/import.service.ts
git commit -m "feat: add ImportService for eBay listing import"
```

- [ ] Commit `import.service.ts`

---

## Task 3: Add import routes to `marketplaces.ts`

**Files:**
- Modify: `apps/api/src/routes/marketplaces.ts`

### Step 3.1 — Add `ImportService` import

At the top of `apps/api/src/routes/marketplaces.ts`, after the existing import lines, add:

```typescript
import { ImportService } from "../services/marketplace/import.service";
```

- [ ] Add `ImportService` import

### Step 3.2 — Add `GET /ebay/importable-listings` route

Find the last `fastify.get` or `fastify.post` route in the eBay section (around the category-aspects route) and add the following two routes after it, before the Mercari section:

```typescript
// GET /api/marketplaces/ebay/importable-listings
fastify.get(
  "/ebay/importable-listings",
  { preHandler: [requireAuth] },
  async (request, reply) => {
    const {
      status = "active",
      showImported = "false",
      page = "1",
      limit = "50",
    } = request.query as Record<string, string>;

    if (!["active", "ended", "sold"].includes(status)) {
      return reply.status(400).send({ success: false, error: "status must be active, ended, or sold" });
    }

    try {
      const service = new ImportService(fastify.prisma);
      const result = await service.getImportableListings(
        request.user!.id,
        status as "active" | "ended" | "sold",
        showImported === "true",
        Math.max(1, parseInt(page) || 1),
        Math.min(100, Math.max(1, parseInt(limit) || 50))
      );
      return reply.send({ success: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch eBay listings";
      return reply.status(400).send({ success: false, error: message });
    }
  }
);

// POST /api/marketplaces/ebay/import
fastify.post(
  "/ebay/import",
  { preHandler: [requireAuth] },
  async (request, reply) => {
    const { ebayItemIds } = request.body as { ebayItemIds?: unknown };

    if (!Array.isArray(ebayItemIds) || ebayItemIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: "ebayItemIds must be a non-empty array of strings",
      });
    }

    const ids = ebayItemIds.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) {
      return reply.status(400).send({ success: false, error: "No valid eBay item IDs provided" });
    }

    try {
      const service = new ImportService(fastify.prisma);
      const result = await service.importItems(request.user!.id, ids);
      return reply.send({ success: true, data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      return reply.status(400).send({ success: false, error: message });
    }
  }
);
```

- [ ] Add both routes to `marketplaces.ts`

### Step 3.3 — Typecheck

```bash
pnpm --filter api typecheck 2>&1 | head -40
```

Expected: no errors.

- [ ] Typecheck and fix any errors

### Step 3.4 — Commit

```bash
git add apps/api/src/routes/marketplaces.ts
git commit -m "feat: add GET importable-listings and POST import routes for eBay"
```

- [ ] Commit route changes

---

## Task 4: Add `importApi` to the web API client

**Files:**
- Modify: `apps/web/src/lib/api.ts`

### Step 4.1 — Add `importApi` export

After the `marketplacesApi` block (around line 113) and before the `mercariApi` block, add:

```typescript
// ─── eBay Import ──────────────────────────────────────────────────────────────

export const importApi = {
  getImportableListings: (params?: {
    status?: string;
    showImported?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)] as [string, string]);
    const qs = entries.length > 0 ? `?${new URLSearchParams(entries).toString()}` : "";
    return request<any>(`/api/marketplaces/ebay/importable-listings${qs}`);
  },

  importItems: (ebayItemIds: string[]) =>
    request<any>("/api/marketplaces/ebay/import", {
      method: "POST",
      body: JSON.stringify({ ebayItemIds }),
    }),
};
```

- [ ] Add `importApi` to `apps/web/src/lib/api.ts`

### Step 4.2 — Typecheck

```bash
pnpm --filter web typecheck 2>&1 | head -30
```

Expected: no errors.

- [ ] Typecheck and fix any errors

### Step 4.3 — Commit

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat: add importApi client methods for eBay import"
```

- [ ] Commit api.ts changes

---

## Task 5: Create `use-import.ts` hook

**Files:**
- Create: `apps/web/src/hooks/use-import.ts`

### Step 5.1 — Create the hook file

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { importApi } from "@/lib/api";
import { toast } from "sonner";

interface ImportParams {
  status?: string;
  showImported?: boolean;
  page?: number;
  limit?: number;
}

export function useImportableListings(params: ImportParams) {
  return useQuery({
    queryKey: ["ebay-importable", params],
    queryFn: () => importApi.getImportableListings(params),
    retry: 1,
  });
}

export function useImportItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ebayItemIds: string[]) => importApi.importItems(ebayItemIds),
    onSuccess: (res: any) => {
      const { imported = [], failed = [] } = res.data ?? {};
      if (imported.length > 0) {
        toast.success(`Imported ${imported.length} item${imported.length > 1 ? "s" : ""}`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} item${failed.length > 1 ? "s" : ""} failed to import`);
      }
      // Refresh both the import list and the main inventory
      qc.invalidateQueries({ queryKey: ["ebay-importable"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Import failed");
    },
  });
}
```

- [ ] Create `apps/web/src/hooks/use-import.ts` with the content above

### Step 5.2 — Commit

```bash
git add apps/web/src/hooks/use-import.ts
git commit -m "feat: add useImportableListings and useImportItems React Query hooks"
```

- [ ] Commit the hook file

---

## Task 6: Create the import page

**Files:**
- Create: `apps/web/src/app/(dashboard)/inventory/import/page.tsx`

### Step 6.1 — Create the directory and page file

```bash
mkdir -p /home/diwanshu/Projects/reselling-software-app/apps/web/src/app/\(dashboard\)/inventory/import
```

Then create `apps/web/src/app/(dashboard)/inventory/import/page.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useImportableListings, useImportItems } from "@/hooks/use-import";
import { Button, Badge } from "@repo/ui";
import { ArrowLeft, Download, Package, CheckSquare, Square } from "lucide-react";
import { formatCurrency } from "@repo/utils";

export default function ImportPage(): import("react").JSX.Element {
  const [status, setStatus] = useState("active");
  const [showImported, setShowImported] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useImportableListings({
    status,
    showImported,
    page,
    limit: 50,
  });
  const importMutation = useImportItems();

  const items: any[] = data?.data ?? [];
  const importableItems = items.filter((i) => !i.isImported);
  const allImportableSelected =
    importableItems.length > 0 && selected.size === importableItems.length;

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allImportableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importableItems.map((i) => i.ebayItemId)));
    }
  }, [allImportableSelected, importableItems]);

  const handleStatusChange = (next: string) => {
    setStatus(next);
    setPage(1);
    setSelected(new Set());
  };

  const handleImport = useCallback(async () => {
    if (selected.size === 0 || importMutation.isPending) return;
    await importMutation.mutateAsync([...selected]);
    setSelected(new Set());
  }, [selected, importMutation]);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_15%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_54%),radial-gradient(circle_at_82%_20%,_#f59e0b_0%,_#fbbf24_22%,_transparent_48%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/25" />
        <div className="relative">
          <Link
            href="/inventory"
            className="mb-2 inline-flex items-center gap-1 text-xs text-orange-100 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Inventory
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
                eBay
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Import Listings</h1>
              <p className="mt-1 text-sm text-orange-50">
                {data?.total ?? 0} listing{data?.total !== 1 ? "s" : ""} available
              </p>
            </div>
            <Button
              className="bg-white text-orange-700 hover:bg-orange-50 disabled:opacity-60"
              onClick={handleImport}
              disabled={selected.size === 0 || importMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {importMutation.isPending
                ? "Importing…"
                : selected.size > 0
                ? `Import ${selected.size} selected`
                : "Import selected"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700"
          >
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="sold">Sold</option>
          </select>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={showImported}
              onChange={(e) => {
                setShowImported(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-zinc-300 accent-orange-500"
            />
            Show already imported
          </label>

          {importableItems.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="ml-auto flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
            >
              {allImportableSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allImportableSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {(error as Error).message ?? "Failed to load eBay listings"}
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-zinc-300" />
          <h3 className="text-lg font-medium text-zinc-900">No listings found</h3>
          <p className="mt-1 text-sm text-zinc-500">
            No eBay listings match the current filter
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isImported: boolean = item.isImported;
            const isSelected = selected.has(item.ebayItemId);
            return (
              <div
                key={item.ebayItemId}
                onClick={() => !isImported && toggleItem(item.ebayItemId)}
                className={[
                  "flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all",
                  isImported
                    ? "cursor-default border-zinc-100 opacity-50"
                    : isSelected
                    ? "cursor-pointer border-orange-400 ring-1 ring-orange-400"
                    : "cursor-pointer border-zinc-200 hover:border-zinc-300 hover:shadow-sm",
                ].join(" ")}
              >
                {/* Checkbox */}
                <div className="shrink-0">
                  <div
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded border-2",
                      isImported
                        ? "border-zinc-200 bg-zinc-100"
                        : isSelected
                        ? "border-orange-500 bg-orange-500"
                        : "border-zinc-300 bg-white",
                    ].join(" ")}
                  >
                    {isSelected && !isImported && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 12 12"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                    <Package className="h-6 w-6 text-zinc-300" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Qty {item.quantity}
                    {item.categoryName ? ` · ${item.categoryName}` : ""}
                  </p>
                </div>

                {/* Price + badge */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(Math.round(item.price * 100))}
                  </p>
                  <div className="mt-1">
                    {isImported ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Imported
                      </Badge>
                    ) : (
                      <Badge
                        variant={item.listingStatus === "Active" ? "success" : "outline"}
                        className="text-[10px]"
                      >
                        {item.listingStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-zinc-500">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] Create the directory and page file with the content above

### Step 6.2 — Typecheck

```bash
pnpm --filter web typecheck 2>&1 | head -40
```

Expected: no errors. Common issue: `Badge` `variant="success"` — if this variant doesn't exist in `@repo/ui`, change it to `variant="default"` or check what variants `Badge` supports in `packages/ui/src/components/badge.tsx`.

- [ ] Typecheck and fix any errors

### Step 6.3 — Commit

```bash
git add "apps/web/src/app/(dashboard)/inventory/import/page.tsx" apps/web/src/hooks/use-import.ts
git commit -m "feat: add /inventory/import page with multi-select eBay import UI"
```

- [ ] Commit the page and hook

---

## Task 7: Add "Import from eBay" button to the inventory page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/inventory/page.tsx`

### Step 7.1 — Add the Import button

In `apps/web/src/app/(dashboard)/inventory/page.tsx`, find the existing "Add item" button block:

```tsx
<Button className="mt-5 bg-white text-orange-700 hover:bg-orange-50" asChild>
  <Link href="/inventory/new">
    <Plus className="mr-2 h-4 w-4" />
    Add item
  </Link>
</Button>
```

Replace it with:

```tsx
<div className="mt-5 flex gap-3">
  <Button className="bg-white text-orange-700 hover:bg-orange-50" asChild>
    <Link href="/inventory/new">
      <Plus className="mr-2 h-4 w-4" />
      Add item
    </Link>
  </Button>
  <Button
    className="border-white/40 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
    variant="outline"
    asChild
  >
    <Link href="/inventory/import">
      <Download className="mr-2 h-4 w-4" />
      Import from eBay
    </Link>
  </Button>
</div>
```

- [ ] Replace the single button with the two-button group

### Step 7.2 — Add `Download` to the import statement

In the same file, find the lucide-react import line and add `Download`:

```typescript
import { Plus, Search, Package, Trash2, ExternalLink, Tag, Pencil, Download } from "lucide-react";
```

- [ ] Add `Download` to the lucide-react import

### Step 7.3 — Typecheck

```bash
pnpm --filter web typecheck 2>&1 | head -30
```

Expected: no errors.

- [ ] Typecheck and fix any errors

### Step 7.4 — Commit

```bash
git add "apps/web/src/app/(dashboard)/inventory/page.tsx"
git commit -m "feat: add Import from eBay button to inventory page"
```

- [ ] Commit inventory page change

---

## Task 8: Manual verification

### Step 8.1 — Start the dev server

```bash
pnpm dev
```

- [ ] Server starts on `:3001` (API) and `:3000` (web) without errors

### Step 8.2 — Verify the button appears

Open `http://localhost:3000/inventory`. The "Import from eBay" button should appear in the header next to "Add item".

- [ ] "Import from eBay" button is visible on the inventory page

### Step 8.3 — Verify the import page loads

Click "Import from eBay" (or navigate to `http://localhost:3000/inventory/import`).

- If eBay is connected: listings should appear in the list
- If eBay is not connected: an error message "eBay account not connected" should show

- [ ] Import page renders correctly with no JS console errors

### Step 8.4 — Verify selection and import flow

1. Select 1-3 listings using the checkboxes
2. Click "Import X selected"
3. Expect success toast with count
4. Expect imported items to show "Imported" badge and become greyed out
5. Navigate to `/inventory` — imported items should appear there

- [ ] End-to-end import flow works correctly

### Step 8.5 — Verify duplicate detection

Try to import the same items again (toggle "Show already imported", items show as greyed-out with "Imported" badge and unchecked checkbox). Confirm they cannot be selected.

- [ ] Already-imported items are not selectable

### Step 8.6 — Final commit if any fixes were made during verification

```bash
git add -p  # stage only verified changes
git commit -m "fix: address issues found during manual verification"
```

- [ ] All verification steps pass; any fixes committed
