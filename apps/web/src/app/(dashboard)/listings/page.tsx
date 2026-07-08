"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, marketplacesApi, syncApi, listingsApi } from "@/lib/api";
import { Button } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreateListingForm } from "./_components/CreateListingForm";

// ─── Marketplace config ───────────────────────────────────────────────────────

const MARKETPLACES = [
  { key: "EBAY", label: "eBay", dot: "bg-red-500" },
  { key: "MERCARI", label: "Mercari", dot: "bg-pink-600" },
  { key: "POSHMARK", label: "Poshmark", dot: "bg-rose-800" },
  { key: "DEPOP", label: "Depop", dot: "bg-orange-600" },
  { key: "ETSY", label: "Etsy", dot: "bg-orange-500" },
  { key: "FACEBOOK_MARKETPLACE", label: "Facebook", dot: "bg-blue-600" },
] as const;

type MarketplaceKey = (typeof MARKETPLACES)[number]["key"];

const LISTING_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-zinc-100 text-zinc-500",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-600",
  SOLD: "bg-sky-50 text-sky-700",
  ENDED: "bg-zinc-100 text-zinc-400",
};

type InventoryStatusFilter = "ACTIVE" | "SOLD" | "DRAFT" | "ARCHIVED" | "";

const TABS: Array<{ label: string; value: InventoryStatusFilter }> = [
  { label: "Listed", value: "ACTIVE" },
  { label: "Sold", value: "SOLD" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Archived", value: "ARCHIVED" },
  { label: "All", value: "" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListingsPage(): import("react").JSX.Element {
  const [statusTab, setStatusTab] = useState<InventoryStatusFilter>("ACTIVE");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<MarketplaceKey | "">("");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInventoryItemId, setDialogInventoryItemId] = useState<string | undefined>();
  const [dialogMarketplace, setDialogMarketplace] = useState<string | undefined>();
  const [dialogConnectionId, setDialogConnectionId] = useState<string | undefined>();

  function openListingDialog(inventoryItemId: string, marketplace: string) {
    const conn = connections.find((c: any) => c.marketplace === marketplace && c.isActive);
    setDialogInventoryItemId(inventoryItemId);
    setDialogMarketplace(marketplace);
    setDialogConnectionId(conn?.id);
    setDialogOpen(true);
  }

  function closeListingDialog() {
    setDialogOpen(false);
    setDialogInventoryItemId(undefined);
    setDialogMarketplace(undefined);
    setDialogConnectionId(undefined);
  }

  const params: Record<string, string> = {
    withListings: "true",
    page: String(page),
    limit: "20",
  };
  if (statusTab) params.status = statusTab;
  if (debouncedSearch) params.search = debouncedSearch;

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-crosslist", params],
    queryFn: () => inventoryApi.list(params),
    refetchInterval: 15_000,
  });

  const { data: connectionsData } = useQuery({
    queryKey: ["connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const publishMutation = useMutation({
    mutationFn: listingsApi.publish,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      toast.success("Published!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const delistMutation = useMutation({
    mutationFn: listingsApi.delist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      toast.success("Delisted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markSoldMutation = useMutation({
    mutationFn: listingsApi.markSold,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      toast.success("Marked as sold");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  const connections: any[] = connectionsData?.data ?? [];
  const connectedSet = new Set<string>(
    connections.filter((c: any) => c.isActive).map((c: any) => c.marketplace as string)
  );

  const visibleItems =
    marketplaceFilter
      ? items.filter((item: any) =>
          item.listings?.some(
            (l: any) => l.marketplace === marketplaceFilter && l.status === "ACTIVE"
          )
        )
      : items;

  const mpCounts = Object.fromEntries(
    MARKETPLACES.map((mp) => [
      mp.key,
      items.filter((item: any) =>
        item.listings?.some((l: any) => l.marketplace === mp.key && l.status === "ACTIVE")
      ).length,
    ])
  );

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleTabChange = (val: InventoryStatusFilter) => {
    setStatusTab(val);
    setPage(1);
  };

  const handleResync = async () => {
    setSyncing(true);
    try {
      await syncApi.syncAll();
      setLastSynced(new Date());
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      toast.success("Sync complete");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const marketplaceLabel = dialogMarketplace
    ? (MARKETPLACES.find((m) => m.key === dialogMarketplace)?.label ?? dialogMarketplace)
    : undefined;

  return (
    <>
      {/* ── Create Listing Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeListingDialog(); }}>
        <DialogContent
          showCloseButton
          className="flex max-h-[92vh] w-full max-w-5xl flex-col gap-0 overflow-hidden bg-[#f6f5f3] p-0 sm:max-w-5xl"
        >
          <DialogHeader className="shrink-0 border-b border-zinc-200 bg-white px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              Create Listing
              {marketplaceLabel && (
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  {marketplaceLabel}
                </span>
              )}
            </DialogTitle>
            {dialogInventoryItemId && (
              <DialogDescription className="text-xs text-zinc-400">
                Pre-filled from your inventory
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {dialogOpen && (
              <CreateListingForm
                defaultInventoryItemId={dialogInventoryItemId}
                defaultConnectionId={dialogConnectionId}
                onClose={closeListingDialog}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {/* ── Top controls ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusTab === tab.value
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={marketplaceFilter}
              onChange={(e) => setMarketplaceFilter(e.target.value as MarketplaceKey | "")}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              <option value="">Any marketplace</option>
              {MARKETPLACES.map((mp) => (
                <option key={mp.key} value={mp.key}>{mp.label}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <Button
              className="bg-orange-600 text-white hover:bg-orange-500"
              onClick={() => { setDialogInventoryItemId(undefined); setDialogMarketplace(undefined); setDialogOpen(true); }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New listing
            </Button>
          </div>
        </div>

        {/* ── Sync bar ── */}
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {lastSynced ? `Last synced ${formatSyncTime(lastSynced)}` : "Not yet synced this session"}
          </span>
          <button
            onClick={handleResync}
            disabled={syncing}
            className="flex items-center gap-1.5 font-medium text-orange-600 hover:text-orange-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Resync"}
          </button>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="w-8 p-3" />
                  <th className="min-w-[220px] p-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Item name</th>
                  {MARKETPLACES.map((mp) => (
                    <th key={mp.key} className="w-[148px] p-3 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${mp.dot}`} />
                        <span className="text-xs font-semibold text-zinc-500">{mp.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3"><div className="h-4 w-4 rounded bg-zinc-100" /></td>
                    <td className="p-3"><div className="h-4 w-40 rounded bg-zinc-100" /><div className="mt-2 h-3 w-24 rounded bg-zinc-50" /></td>
                    {MARKETPLACES.map((mp) => (
                      <td key={mp.key} className="p-2"><div className="h-[136px] rounded-lg bg-zinc-50" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center shadow-sm">
            <p className="text-lg font-medium text-zinc-900">No items found</p>
            <p className="mt-1 text-sm text-zinc-500">
              {marketplaceFilter || debouncedSearch ? "Try adjusting your search or filters" : "Nothing here yet"}
            </p>
            {!marketplaceFilter && !debouncedSearch && (
              <Button className="mt-4 bg-orange-600 text-white hover:bg-orange-500" asChild>
                <Link href="/inventory/new">
                  <Plus className="mr-2 h-4 w-4" />Add inventory item
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="w-8 p-3">
                    <input type="checkbox" className="rounded border-zinc-300" />
                  </th>
                  <th className="min-w-[220px] p-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Item name</th>
                  {MARKETPLACES.map((mp) => (
                    <th key={mp.key} className="w-[148px] p-3 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${mp.dot}`} />
                        <span className="text-xs font-semibold text-zinc-700">{mp.label}</span>
                        {connectedSet.has(mp.key) && (
                          <span className="ml-auto text-xs font-normal tabular-nums text-zinc-400">
                            {mpCounts[mp.key]}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibleItems.map((item: any) => {
                  const primaryImage =
                    item.images?.find((img: any) => img.isPrimary) ?? item.images?.[0];
                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/60">
                      <td className="p-3 align-top">
                        <input type="checkbox" className="mt-1 rounded border-zinc-300" />
                      </td>

                      <td className="p-3 align-top">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="block font-medium leading-snug text-zinc-900 hover:text-orange-600 line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        {item.notes ? (
                          <p className="mt-0.5 text-xs italic text-zinc-400 line-clamp-1">{item.notes}</p>
                        ) : (
                          <Link
                            href={`/inventory/${item.id}/edit`}
                            className="mt-0.5 block text-xs italic text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-400"
                          >
                            Add private notes
                          </Link>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button title="More actions" className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {MARKETPLACES.map((mp) => {
                        const listing = item.listings?.find((l: any) => l.marketplace === mp.key);
                        const isConnected = connectedSet.has(mp.key);

                        if (!isConnected) {
                          return (
                            <td key={mp.key} className="p-2 align-top">
                              <Link
                                href="/marketplaces"
                                className="flex h-[136px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-100 bg-zinc-50/50 transition-colors hover:border-zinc-200 hover:bg-zinc-50"
                                title={`Connect ${mp.label}`}
                              >
                                <span className="text-xl opacity-20">🪝</span>
                                <span className="text-[10px] text-zinc-300">Connect</span>
                              </Link>
                            </td>
                          );
                        }

                        if (!listing) {
                          return (
                            <td key={mp.key} className="p-2 align-top">
                              <button
                                onClick={() => openListingDialog(item.id, mp.key)}
                                className="group/cell flex h-[136px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 bg-white transition-colors hover:border-orange-200 hover:bg-orange-50/40"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white transition-colors group-hover/cell:border-orange-200 group-hover/cell:bg-orange-50">
                                  <Plus className="h-4 w-4 text-zinc-300 group-hover/cell:text-orange-500" />
                                </div>
                                <span className="text-center text-xs font-medium text-zinc-400 group-hover/cell:text-orange-600">
                                  List on {mp.label}
                                </span>
                              </button>
                            </td>
                          );
                        }

                        const statusStyle = LISTING_STATUS_STYLE[listing.status] ?? "bg-zinc-100 text-zinc-500";
                        const statusLabel =
                          listing.status.charAt(0) + listing.status.slice(1).toLowerCase().replace("_", " ");

                        return (
                          <td key={mp.key} className="p-2 align-top">
                            <div className="flex h-[136px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
                              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-2 py-1.5">
                                <span className="text-xs font-semibold text-zinc-800">
                                  {formatCurrency(Number(listing.price ?? 0))}
                                </span>
                                {listing.externalUrl && (
                                  <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="View on marketplace">
                                    <ExternalLink className="h-3 w-3 text-zinc-400 hover:text-orange-500" />
                                  </a>
                                )}
                              </div>
                              <div className="flex-1 overflow-hidden bg-zinc-100">
                                {primaryImage ? (
                                  <img src={primaryImage.url} alt={item.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-2xl text-zinc-200">📦</div>
                                )}
                              </div>
                              <div className={`flex shrink-0 items-center justify-between px-2 py-1 text-xs font-medium ${statusStyle}`}>
                                <span>● {statusLabel}</span>
                                <div className="flex items-center gap-1.5">
                                  {listing.status === "DRAFT" && (
                                    <button onClick={() => publishMutation.mutate(listing.id)} disabled={publishMutation.isPending} className="font-semibold underline underline-offset-2 disabled:opacity-50">
                                      Publish
                                    </button>
                                  )}
                                  {listing.status === "ACTIVE" && (
                                    <>
                                      <button onClick={() => markSoldMutation.mutate(listing.id)} disabled={markSoldMutation.isPending} className="opacity-50 hover:opacity-100 disabled:opacity-30" title="Mark sold">Sold</button>
                                      <span className="opacity-30">·</span>
                                      <button onClick={() => delistMutation.mutate(listing.id)} disabled={delistMutation.isPending} className="opacity-50 hover:opacity-100 disabled:opacity-30" title="Delist">End</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {(total > 0 || totalPages > 1) && (
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>{total} item{total !== 1 ? "s" : ""}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-1 tabular-nums">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
