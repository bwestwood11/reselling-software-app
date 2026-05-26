"use client";

import { useState } from "react";
import Link from "next/link";
import { useInventory, useDeleteInventoryItem } from "@/hooks/use-inventory";
import {
  Button,
  Badge,
  Card,
  CardContent,
} from "@repo/ui";
import { Plus, Search, Package, Trash2, ExternalLink, Tag, Pencil, Download } from "lucide-react";
import { formatCurrency } from "@repo/utils";

const STATUS_COLORS = {
  DRAFT: "secondary",
  ACTIVE: "success",
  SOLD: "default",
  ARCHIVED: "outline",
} as const;

export default function InventoryPage(): import("react").JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (status) params.status = status;

  const { data, isLoading } = useInventory(params);
  const deleteMutation = useDeleteInventoryItem();

  const items = data?.data ?? [];

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
            <p className="mt-1 text-sm text-orange-50">
              {data?.total ?? 0} items total
            </p>
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="ARCHIVED">Archived</option>
        </select>
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
          {items.map((item: any) => (
            <Card
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* SKU badge for internal tracking */}
              <div className="absolute right-3 top-3 z-20 rounded-full border border-orange-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700 shadow-sm backdrop-blur">
                SKU: {item.sku || "Unassigned"}
              </div>

              {/* Primary image */}
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
                  </div>
                  <Badge variant={STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                    {item.status}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    {item.targetPrice && (
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatCurrency(Number(item.targetPrice))}
                      </p>
                    )}
                    {item.costPrice && (
                      <p className="text-xs text-zinc-500">
                        Cost: {formatCurrency(Number(item.costPrice))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Tag className="h-3 w-3" />
                    {item._count?.listings ?? 0} listings
                  </div>
                </div>

                {/* Actions */}
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
          ))}
        </div>
      )}
    </div>
  );
}

