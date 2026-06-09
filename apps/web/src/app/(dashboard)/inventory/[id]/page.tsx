"use client";

import { use } from "react";
import Link from "next/link";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { useInventoryItem } from "@/hooks/use-inventory";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { ArrowLeft, Package, Tag, ExternalLink, Pencil, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
    <div className="mx-auto max-w-5xl space-y-6 bg-[#f6f5f3] pb-4">
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_18%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_52%),radial-gradient(circle_at_88%_30%,_#f59e0b_0%,_#fbbf24_18%,_transparent_44%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-5 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)] lg:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/25" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-3 text-orange-50 hover:bg-white/10 hover:text-white" asChild>
              <Link href="/inventory">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Inventory
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white">{item.title}</h1>
              <Badge variant={STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                {item.status}
              </Badge>
            </div>
            {item.brand && <p className="mt-1 text-sm text-orange-50">{item.brand}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {item.sku && (
                <span className="rounded-full border border-white/35 bg-white/15 px-2.5 py-1 font-medium text-orange-50">
                  SKU: {item.sku}
                </span>
              )}
              <span className="rounded-full border border-white/35 bg-white/15 px-2.5 py-1 font-medium text-orange-50">
                Qty: {item.quantity}
              </span>
              {item.targetPrice && (
                <span className="rounded-full border border-white/35 bg-white/15 px-2.5 py-1 font-medium text-orange-50">
                  Target: {formatCurrency(Number(item.targetPrice))}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild>
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Images */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-0">
              {item.images?.length > 0 ? (
                <div className="space-y-3 p-4">
                  <PhotoProvider
                    toolbarRender={({ scale, onScale }) => (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onScale(scale + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                        >
                          <ZoomIn className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onScale(scale - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                        >
                          <ZoomOut className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onScale(1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  >
                    <PhotoView src={item.images[0].url}>
                      <div className="group relative cursor-zoom-in">
                        <img
                          src={item.images[0].url}
                          alt={item.title}
                          className="w-full rounded-xl object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover:bg-black/10">
                          <ZoomIn className="h-7 w-7 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>
                    </PhotoView>
                    {item.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {item.images.slice(1).map((img: any) => (
                          <PhotoView key={img.id} src={img.url}>
                            <div className="group relative cursor-zoom-in">
                              <img
                                src={img.url}
                                alt=""
                                className="h-16 w-full rounded-lg object-cover"
                              />
                              <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/20" />
                            </div>
                          </PhotoView>
                        ))}
                      </div>
                    )}
                  </PhotoProvider>
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center bg-zinc-100">
                  <Package className="h-16 w-16 text-zinc-300" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
              <CardTitle className="text-base text-zinc-900">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-5 text-sm">
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
            <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
                <CardTitle className="text-base text-zinc-900">Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{normalizeText(item.description)}</p>
              </CardContent>
            </Card>
          )}

          {/* Listings on this item */}
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
              <CardTitle className="text-base text-zinc-900">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Listings ({item.listings?.length ?? 0})
                </div>
              </CardTitle>
              <Button size="sm" asChild>
                <Link href={`/listings/new?itemId=${item.id}`}>Add listing</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              {item.listings?.length === 0 ? (
                <p className="text-sm text-zinc-500">No listings yet</p>
              ) : (
                <div className="space-y-2">
                  {item.listings?.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-3 shadow-[0_8px_22px_-18px_rgba(24,24,27,0.45)]"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {getMarketplaceLabel(listing.marketplace)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatCurrency(Number(listing.price))} · {listing.status}
                        </p>
                      </div>
                      {listing.externalUrl && (
                        <a
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-zinc-600"
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

function normalizeText(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="font-medium text-zinc-900">{value}</p>
    </div>
  );
}
