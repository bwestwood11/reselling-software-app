"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useInventory, useDeleteInventoryItem } from "@/hooks/use-inventory";
import {
  Button,
  Badge,
  Card,
  CardContent,
} from "@repo/ui";
import {
  Plus,
  Search,
  Package,
  Trash2,
  ExternalLink,
  Tag,
  Pencil,
  Download,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { SourceSelect } from "@/components/ui/source-select";
import { formatCurrency } from "@repo/utils";

const STATUS_COLORS = {
  DRAFT: "secondary",
  ACTIVE: "success",
  SOLD: "default",
  ARCHIVED: "outline",
} as const;

const PAGE_SIZE = 20;

function ProfitPill({ cost, target }: { cost: number | null; target: number | null }) {
  if (!cost || !target) return null;
  const profit = target - cost;
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums " +
        (profit > 0
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
          : profit < 0
            ? "bg-red-50 text-red-600 ring-1 ring-red-200/70"
            : "bg-zinc-100 text-zinc-500")
      }
    >
      {profit > 0 ? "+" : ""}
      {formatCurrency(profit)}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  const seen = new Set<number | "…">();
  function push(n: number) {
    if (n >= 1 && n <= totalPages && !seen.has(n)) {
      seen.add(n);
      pages.push(n);
    }
  }
  push(1);
  if (page - 2 > 2) pages.push("…");
  push(page - 1);
  push(page);
  push(page + 1);
  if (page + 2 < totalPages - 1) pages.push("…");
  push(totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-zinc-500">
        Showing{" "}
        <span className="font-medium text-zinc-800">
          {start}–{end}
        </span>{" "}
        of{" "}
        <span className="font-medium text-zinc-800">{total}</span> items
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`el-${i}`} className="px-1 text-xs text-zinc-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={
                "flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors " +
                (p === page
                  ? "border-orange-400 bg-orange-500 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50")
              }
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function InventoryPage(): import("react").JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  function handleSearch(val: string) {
    updateParams({ search: val || undefined, page: undefined });
  }
  function handleStatus(val: string) {
    updateParams({ status: val || undefined, page: undefined });
  }
  function handleSource(val: string | undefined) {
    updateParams({ sourceId: val, page: undefined });
  }
  function handlePage(p: number) {
    updateParams({ page: String(p) });
  }

  const apiParams: Record<string, string> = {
    page: String(page),
    limit: String(PAGE_SIZE),
  };
  if (search) apiParams.search = search;
  if (status) apiParams.status = status;
  if (sourceId) apiParams.sourceId = sourceId;

  const { data, isLoading } = useInventory(apiParams);
  const deleteMutation = useDeleteInventoryItem();

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_15%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_54%),radial-gradient(circle_at_82%_20%,_#f59e0b_0%,_#fbbf24_22%,_transparent_48%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/25" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
              Inventory Hub
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventory</h1>
            <p className="mt-1 text-sm text-orange-50">{total} items total</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-orange-50 backdrop-blur-sm">
            Internal tracking enabled
          </div>
        </div>
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
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1" style={{ minWidth: 180 }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-colors focus-visible:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleStatus(e.target.value)}
            className={
              "h-10 appearance-none rounded-xl border bg-white py-2 pl-3 pr-8 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400/20 " +
              (status
                ? "border-orange-400 font-medium text-orange-700 focus:border-orange-400"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 focus:border-orange-400")
            }
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="SOLD">Sold</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <ChevronDown
            className={
              "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 " +
              (status ? "text-orange-400" : "text-zinc-400")
            }
          />
        </div>

        <div className="w-48">
          <SourceSelect
            value={sourceId}
            onChange={handleSource}
            placeholder="All sources"
          />
        </div>
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse rounded-2xl border-zinc-200 bg-white">
              <CardContent className="h-52" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center shadow-sm">
          <Package className="mb-4 h-12 w-12 text-zinc-300" />
          <h3 className="text-lg font-medium text-zinc-900">No items yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Add your first inventory item to get started
          </p>
          <Button className="mt-4 bg-orange-600 text-white hover:bg-orange-500" asChild>
            <Link href="/inventory/new">
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item: any) => {
            const cost = item.costPrice ? Number(item.costPrice) : null;
            const target = item.targetPrice ? Number(item.targetPrice) : null;

            return (
              <Card
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="absolute right-3 top-3 z-20 rounded-full border border-orange-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700 shadow-sm backdrop-blur">
                  SKU: {item.sku || "Unassigned"}
                </div>

                {item.images?.[0] ? (
                  <div className="aspect-square overflow-hidden bg-zinc-100">
                    <img
                      src={item.images[0].url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-zinc-100">
                    <Package className="h-12 w-12 text-zinc-300" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-900">
                        {item.title}
                      </h3>
                      {item.brand && (
                        <p className="text-xs text-zinc-500">{item.brand}</p>
                      )}
                      {item.source && (
                        <p className="flex items-center gap-1 text-xs text-zinc-400">
                          <MapPin className="h-3 w-3" />
                          {item.source.name}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ??
                        "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <div className="space-y-0.5">
                      {target && (
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatCurrency(target)}
                        </p>
                      )}
                      {cost && (
                        <p className="text-xs text-zinc-500">
                          Cost: {formatCurrency(cost)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ProfitPill cost={cost} target={target} />
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Tag className="h-3 w-3" />
                        {item._count?.listings ?? 0} listings
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
                      asChild
                    >
                      <Link href={`/inventory/${item.id}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                      asChild
                    >
                      <Link href={`/inventory/${item.id}/edit`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={handlePage}
        />
      )}
    </div>
  );
}
