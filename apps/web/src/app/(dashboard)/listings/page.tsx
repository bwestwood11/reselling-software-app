"use client";

import { useEffect, useRef, useState } from "react";
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
  AlertTriangle,
  RotateCcw,
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
import { PublishProgress } from "./_components/ui/PublishProgress";
import { MarkSoldDialog } from "@/components/inventory/MarkSoldDialog";

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

/**
 * A listing may be published once and retried at most twice — mirrors
 * MAX_PUBLISH_ATTEMPTS in the API's listing service.
 */
const MAX_PUBLISH_ATTEMPTS = 3;

/**
 * An item can accumulate several listings per marketplace over time (a failed
 * attempt, an ended one, the live one). Show the most meaningful one rather than
 * whichever happens to come back first.
 */
const LISTING_PRIORITY: Record<string, number> = {
  ACTIVE: 0,
  PENDING: 1,
  FAILED: 2,
  DRAFT: 3,
  SOLD: 4,
  ENDED: 5,
};

function pickListing(listings: any[] | undefined, marketplace: string): any | undefined {
  const matches = (listings ?? []).filter((l: any) => l.marketplace === marketplace);
  if (matches.length <= 1) return matches[0];

  return [...matches].sort((a: any, b: any) => {
    const rank = (LISTING_PRIORITY[a.status] ?? 9) - (LISTING_PRIORITY[b.status] ?? 9);
    if (rank !== 0) return rank;
    // Same status → newest first.
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  })[0];
}

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
  const [soldTarget, setSoldTarget] = useState<
    { id: string; price: number; marketplace: string; title?: string } | null
  >(null);

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
    // Count an item as listed when it has a live listing, even if its own status
    // was never flipped off DRAFT.
    includeListed: "true",
    page: String(page),
    limit: "20",
  };
  if (statusTab) params.status = statusTab;
  if (debouncedSearch) params.search = debouncedSearch;
  // Filtered server-side so pagination stays correct.
  if (marketplaceFilter) params.marketplace = marketplaceFilter;

  // Mercari's publish endpoint returns as soon as the job is queued — the extension then takes
  // ~25s to actually post it. Remember when each publish started so the cell keeps showing
  // progress while the listing sits in PENDING, instead of flashing a spinner for one second.
  const [publishStartedAt, setPublishStartedAt] = useState<Record<string, number>>({});
  const awaitingPublish = Object.keys(publishStartedAt).length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-crosslist", params],
    queryFn: () => inventoryApi.list(params),
    // Tighter cadence while a publish is in flight so the cell settles as soon as it lands.
    refetchInterval: awaitingPublish ? 5_000 : 15_000,
  });

  const { data: connectionsData } = useQuery({
    queryKey: ["connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const publishMutation = useMutation({
    mutationFn: listingsApi.publish,
    onMutate: (listingId: string) =>
      setPublishStartedAt((prev) => ({ ...prev, [listingId]: Date.now() })),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      // A PENDING result means the job was only queued — the extension posts it next.
      if (res?.data?.status === "PENDING") {
        toast.success("Publishing — the extension is posting it now");
      } else {
        toast.success("Published!");
      }
    },
    onError: (err: Error, listingId: string) => {
      setPublishStartedAt(({ [listingId]: _dropped, ...rest }) => rest);
      // Refetch so the cell picks up the new error and the decremented retry count.
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      toast.error(err.message);
    },
  });

  const isPublishing = (listingId: string) =>
    publishMutation.isPending && publishMutation.variables === listingId;

  const delistMutation = useMutation({
    mutationFn: listingsApi.delist,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      // Mercari and Poshmark delists run in the browser extension — the listing only turns
      // ENDED once the extension confirms, so don't claim it already has.
      toast.success(
        result?.data?.delistQueued
          ? "Delist queued — the ReList extension is removing it now"
          : "Delisted"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markSoldMutation = useMutation({
    mutationFn: ({ id, soldPrice }: { id: string; soldPrice?: number }) =>
      listingsApi.markSold(id, soldPrice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-crosslist"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Marked as sold");
      setSoldTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  // Stop showing progress once a refetch says the listing left PENDING (published, or failed).
  // The 5s floor covers the gap before the first refetch lands; the 2min ceiling makes sure a
  // job the extension never picks up can't pin the overlay open forever.
  useEffect(() => {
    if (!awaitingPublish) return;
    const pending = new Set<string>(
      items.flatMap((item: any) =>
        (item.listings ?? [])
          .filter((l: any) => l.status === "PENDING")
          .map((l: any) => l.id as string)
      )
    );
    setPublishStartedAt((prev) => {
      const next: Record<string, number> = {};
      for (const [id, at] of Object.entries(prev)) {
        const age = Date.now() - at;
        if (age < 5_000 || (pending.has(id) && age < 120_000)) next[id] = at;
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [items, awaitingPublish]);

  const connections: any[] = connectionsData?.data ?? [];
  const connectedSet = new Set<string>(
    connections.filter((c: any) => c.isActive).map((c: any) => c.marketplace as string)
  );

  const visibleItems = items;

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
      {/* ── Mark Sold Dialog ── */}
      <MarkSoldDialog
        open={soldTarget !== null}
        onClose={() => setSoldTarget(null)}
        isPending={markSoldMutation.isPending}
        itemTitle={soldTarget?.title}
        defaultPrice={soldTarget?.price}
        defaultChannel={soldTarget?.marketplace}
        hideChannel
        onConfirm={(values) => {
          if (soldTarget) {
            markSoldMutation.mutate({ id: soldTarget.id, soldPrice: values.soldPrice });
          }
        }}
      />

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
              onChange={(e) => {
                setMarketplaceFilter(e.target.value as MarketplaceKey | "");
                setPage(1);
              }}
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
                        const listing = pickListing(item.listings, mp.key);
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
                        const hasFailed = listing.status === "FAILED";
                        const retriesLeft = Math.max(
                          0,
                          MAX_PUBLISH_ATTEMPTS - (listing.publishAttempts ?? 0)
                        );

                        const showPublishProgress =
                          isPublishing(listing.id) || publishStartedAt[listing.id] != null;

                        return (
                          <td key={mp.key} className="p-2 align-top">
                            <div
                              className={`relative flex h-[136px] flex-col overflow-hidden rounded-lg border bg-white ${
                                hasFailed ? "border-red-200" : "border-zinc-200"
                              }`}
                            >
                              <PublishProgress
                                active={showPublishProgress}
                                marketplaces={[mp.key]}
                                variant="compact"
                              />
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
                              {hasFailed ? (
                                <div className="flex flex-1 flex-col gap-1 overflow-hidden bg-red-50/60 px-2 py-1.5">
                                  <div className="flex items-start gap-1 text-[11px] leading-tight text-red-700">
                                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                                    <span
                                      className="line-clamp-3"
                                      title={listing.syncError ?? "Publishing failed"}
                                    >
                                      {listing.syncError ?? "Publishing failed"}
                                    </span>
                                  </div>
                                  <div className="mt-auto">
                                    {retriesLeft > 0 ? (
                                      <button
                                        onClick={() => publishMutation.mutate(listing.id)}
                                        disabled={isPublishing(listing.id)}
                                        className="flex w-full items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                                      >
                                        <RotateCcw
                                          className={`h-3 w-3 ${isPublishing(listing.id) ? "animate-spin" : ""}`}
                                        />
                                        {isPublishing(listing.id)
                                          ? "Retrying…"
                                          : `Retry (${retriesLeft} left)`}
                                      </button>
                                    ) : (
                                      <Link
                                        href={`/inventory/${item.id}`}
                                        className="block rounded-md border border-red-200 bg-white px-2 py-1 text-center text-[11px] font-medium text-red-700 hover:bg-red-100"
                                        title="No retries left — edit the listing to try again"
                                      >
                                        No retries left · Edit
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 overflow-hidden bg-zinc-100">
                                  {primaryImage ? (
                                    <img src={primaryImage.url} alt={item.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-2xl text-zinc-200">📦</div>
                                  )}
                                </div>
                              )}
                              <div className={`flex shrink-0 items-center justify-between px-2 py-1 text-xs font-medium ${statusStyle}`}>
                                <span>● {statusLabel}</span>
                                <div className="flex items-center gap-1.5">
                                  {listing.status === "DRAFT" && (
                                    <button onClick={() => publishMutation.mutate(listing.id)} disabled={isPublishing(listing.id)} className="font-semibold underline underline-offset-2 disabled:opacity-50">
                                      {isPublishing(listing.id) ? "Publishing…" : "Publish"}
                                    </button>
                                  )}
                                  {hasFailed && (
                                    <span className="text-[11px] font-normal opacity-70">
                                      {listing.publishAttempts ?? 0}/{MAX_PUBLISH_ATTEMPTS} tries
                                    </span>
                                  )}
                                  {listing.status === "ACTIVE" && (
                                    <>
                                      <button onClick={() => setSoldTarget({ id: listing.id, price: Number(listing.price ?? 0), marketplace: mp.label, title: item.title })} disabled={markSoldMutation.isPending} className="opacity-50 hover:opacity-100 disabled:opacity-30" title="Mark sold">Sold</button>
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
