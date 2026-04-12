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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="mt-1 text-sm text-gray-500">{data?.total ?? 0} listings total</p>
        </div>
        <Button asChild>
          <Link href="/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="ENDED">Ended</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Tag className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No listings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first listing from an inventory item
          </p>
          <Button className="mt-4" asChild>
            <Link href="/listings/new">
              <Plus className="mr-2 h-4 w-4" />
              New listing
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing: any) => (
            <Card key={listing.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                {listing.inventoryItem?.images?.[0] ? (
                  <img
                    src={listing.inventoryItem.images[0].url}
                    alt={listing.title}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gray-100">
                    <Tag className="h-6 w-6 text-gray-300" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">
                      {listing.title}
                    </p>
                    <Badge variant={STATUS_COLORS[listing.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                      {listing.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {getMarketplaceLabel(listing.marketplace)} ·{" "}
                    {formatCurrency(Number(listing.price))}
                    {listing.externalId && (
                      <span className="ml-1">· ID: {listing.externalId}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {listing.externalUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {listing.status === "DRAFT" && (
                    <Button
                      size="sm"
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
                        onClick={() => markSoldMutation.mutate(listing.id)}
                        disabled={markSoldMutation.isPending}
                      >
                        Mark sold
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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

