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
import { Plus, Search, Package, Trash2, ExternalLink, Tag } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.total ?? 0} items total
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No items yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first inventory item to get started
          </p>
          <Button className="mt-4" asChild>
            <Link href="/inventory/new">
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => (
            <Card key={item.id} className="group relative overflow-hidden">
              {/* Primary image */}
              {item.images?.[0] ? (
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.images[0].url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center bg-gray-100">
                  <Package className="h-12 w-12 text-gray-300" />
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-gray-900">
                      {item.title}
                    </h3>
                    {item.brand && (
                      <p className="text-xs text-gray-500">{item.brand}</p>
                    )}
                  </div>
                  <Badge variant={STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                    {item.status}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    {item.targetPrice && (
                      <p className="text-sm font-semibold">
                        {formatCurrency(Number(item.targetPrice))}
                      </p>
                    )}
                    {item.costPrice && (
                      <p className="text-xs text-gray-500">
                        Cost: {formatCurrency(Number(item.costPrice))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Tag className="h-3 w-3" />
                    {item._count?.listings ?? 0} listings
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/inventory/${item.id}`}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View
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

