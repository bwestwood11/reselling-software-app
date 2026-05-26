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
          <p className="text-xs text-zinc-400">
            Large imports (50+ items) may take a minute.
          </p>
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
