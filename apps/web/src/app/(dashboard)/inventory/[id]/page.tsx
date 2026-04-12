"use client";

import { use } from "react";
import Link from "next/link";
import { useInventoryItem } from "@/hooks/use-inventory";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { ArrowLeft, Package, Tag, ExternalLink } from "lucide-react";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";

const STATUS_COLORS = {
  DRAFT: "secondary",
  ACTIVE: "success",
  SOLD: "default",
  ARCHIVED: "outline",
} as const;

export default function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): import("react").JSX.Element {
  const { id } = use(params);
  const { data, isLoading } = useInventoryItem(id);
  const item = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">Item not found</p>
        <Button className="mt-4" asChild>
          <Link href="/inventory">Back to inventory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Inventory
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
          <Badge variant={STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
            {item.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Images */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              {item.images?.length > 0 ? (
                <div className="space-y-2 p-4">
                  <img
                    src={item.images[0].url}
                    alt={item.title}
                    className="w-full rounded-md object-cover"
                  />
                  {item.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {item.images.slice(1).map((img: any) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center">
                  <Package className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Brand" value={item.brand} />
              <Detail label="Condition" value={item.condition?.replace(/_/g, " ")} />
              <Detail label="Category" value={item.category} />
              <Detail label="SKU" value={item.sku} />
              <Detail label="Quantity" value={item.quantity} />
              <Detail label="Cost" value={item.costPrice ? formatCurrency(Number(item.costPrice)) : undefined} />
              <Detail label="Target price" value={item.targetPrice ? formatCurrency(Number(item.targetPrice)) : undefined} />
            </CardContent>
          </Card>

          {item.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{item.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Listings on this item */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Listings ({item.listings?.length ?? 0})
                </div>
              </CardTitle>
              <Button size="sm" asChild>
                <Link href={`/listings/new?itemId=${item.id}`}>Add listing</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {item.listings?.length === 0 ? (
                <p className="text-sm text-gray-500">No listings yet</p>
              ) : (
                <div className="space-y-2">
                  {item.listings?.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {getMarketplaceLabel(listing.marketplace)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(Number(listing.price))} · {listing.status}
                        </p>
                      </div>
                      {listing.externalUrl && (
                        <a
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
