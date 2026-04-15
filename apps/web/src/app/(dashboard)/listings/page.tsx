"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useListings,
  usePublishListing,
  useDelistListing,
  useMarkSold,
} from "@/hooks/use-listings";
import { Button, Badge, Card, CardContent } from "@repo/ui";
import { Plus, Tag, ExternalLink } from "lucide-react";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";

const STATUS_COLORS = {
  DRAFT: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  SOLD: "default",
  ENDED: "outline",
  FAILED: "destructive",
} as const;

export default function ListingsPage(): import("react").JSX.Element {
  const [marketplace, setMarketplace] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string> = {};
  if (marketplace) params.marketplace = marketplace;
  if (status) params.status = status;

  const { data, isLoading } = useListings(params);
  const publishMutation = usePublishListing();
  const delistMutation = useDelistListing();
  const markSoldMutation = useMarkSold();

  const listings = data?.data ?? [];

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_16%_18%,_#fdba74_0%,_#fed7aa_24%,_transparent_54%),radial-gradient(circle_at_86%_22%,_#f59e0b_0%,_#fbbf24_22%,_transparent_48%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/25" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
              Cross-Channel Listings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Listings</h1>
            <p className="mt-1 text-sm text-orange-50">{data?.total ?? 0} listings total</p>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-orange-50 backdrop-blur-sm">
            Manage publish status from one place
          </div>
        </div>
        <Button className="mt-5 bg-white text-orange-700 hover:bg-orange-50" asChild>
          <Link href="/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700"
        >
          <option value="">All marketplaces</option>
          <option value="EBAY">eBay</option>
          <option value="DEPOP">Depop</option>
          <option value="MERCARI">Mercari</option>
          <option value="FACEBOOK_MARKETPLACE">Facebook</option>
          <option value="POSHMARK">Poshmark</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="ENDED">Ended</option>
          <option value="FAILED">Failed</option>
        </select>
        </div>
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse rounded-2xl border-zinc-200 bg-white">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center shadow-sm">
          <Tag className="mb-4 h-12 w-12 text-zinc-300" />
          <h3 className="text-lg font-medium text-zinc-900">No listings yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Create your first listing from an inventory item
          </p>
          <Button className="mt-4 bg-orange-600 text-white hover:bg-orange-500" asChild>
            <Link href="/listings/new">
              <Plus className="mr-2 h-4 w-4" />
              New listing
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing: any) => (
            <Card key={listing.id} className="rounded-2xl border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex flex-wrap items-center gap-4 p-4 md:flex-nowrap">
                {/* Thumbnail */}
                {listing.inventoryItem?.images?.[0] ? (
                  <img
                    src={listing.inventoryItem.images[0].url}
                    alt={listing.title}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
                    <Tag className="h-6 w-6 text-zinc-300" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-zinc-900">
                      {listing.title}
                    </p>
                    <Badge variant={STATUS_COLORS[listing.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                      {listing.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {getMarketplaceLabel(listing.marketplace)} ·{" "}
                    {formatCurrency(Number(listing.price))}
                    {listing.externalId && (
                      <span className="ml-1">· ID: {listing.externalId}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2 max-md:w-full max-md:justify-end">
                  {listing.externalUrl && (
                    <Button variant="outline" size="sm" className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50" asChild>
                      <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {listing.status === "DRAFT" && (
                    <Button
                      size="sm"
                      className="bg-zinc-900 text-white hover:bg-zinc-800"
                      onClick={() => publishMutation.mutate(listing.id)}
                      disabled={publishMutation.isPending}
                    >
                      Publish
                    </Button>
                  )}
                  {listing.status === "ACTIVE" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                        onClick={() => markSoldMutation.mutate(listing.id)}
                        disabled={markSoldMutation.isPending}
                      >
                        Mark sold
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => delistMutation.mutate(listing.id)}
                        disabled={delistMutation.isPending}
                      >
                        Delist
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

