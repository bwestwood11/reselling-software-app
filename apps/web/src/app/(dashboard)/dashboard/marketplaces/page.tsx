"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplacesApi } from "@/lib/api";
import { Badge } from "@repo/ui";
import {
  CheckCircle2,
  Zap,
  AlertCircle,
  Unplug,
  ExternalLink,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import type { MarketplaceType } from "@repo/types";

// ─── Marketplace catalog ──────────────────────────────────────────────────────

type ApiSupport = "full" | "coming_soon";

interface MarketplaceMeta {
  key: MarketplaceType;
  label: string;
  tagline: string;
  color: string;          // Tailwind bg for accent strip
  iconBg: string;         // Tailwind bg for icon circle
  iconText: string;       // Tailwind text for icon circle
  borderHover: string;    // Tailwind border hover color
  initial: string;        // Letter shown in icon
  api: ApiSupport;
  categories: string[];
}

const MARKETPLACES: MarketplaceMeta[] = [
  {
    key: "EBAY",
    label: "eBay",
    tagline: "World's largest online marketplace",
    color: "bg-blue-600",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    borderHover: "hover:border-blue-300",
    initial: "e",
    api: "full",
    categories: ["General", "Electronics", "Fashion"],
  },
  {
    key: "POSHMARK",
    label: "Poshmark",
    tagline: "Fashion, home, beauty & more",
    color: "bg-rose-500",
    iconBg: "bg-rose-50",
    iconText: "text-rose-500",
    borderHover: "hover:border-rose-300",
    initial: "P",
    api: "coming_soon",
    categories: ["Fashion", "Home", "Beauty"],
  },
  {
    key: "DEPOP",
    label: "Depop",
    tagline: "Style-driven reselling community",
    color: "bg-red-500",
    iconBg: "bg-red-50",
    iconText: "text-red-500",
    borderHover: "hover:border-red-300",
    initial: "D",
    api: "coming_soon",
    categories: ["Fashion", "Vintage", "Streetwear"],
  },
  {
    key: "ETSY",
    label: "Etsy",
    tagline: "Handmade, vintage & unique goods",
    color: "bg-orange-500",
    iconBg: "bg-orange-50",
    iconText: "text-orange-500",
    borderHover: "hover:border-orange-300",
    initial: "E",
    api: "coming_soon",
    categories: ["Handmade", "Vintage", "Craft"],
  },
  {
    key: "MERCARI",
    label: "Mercari",
    tagline: "Fast & simple selling app",
    color: "bg-red-600",
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    borderHover: "hover:border-red-300",
    initial: "M",
    api: "coming_soon",
    categories: ["General", "Electronics", "Fashion"],
  },
  {
    key: "FACEBOOK_MARKETPLACE",
    label: "Facebook Marketplace",
    tagline: "Local and nationwide selling",
    color: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconText: "text-blue-500",
    borderHover: "hover:border-blue-300",
    initial: "f",
    api: "coming_soon",
    categories: ["Local", "General", "Furniture"],
  },
  {
    key: "WHATNOT",
    label: "Whatnot",
    tagline: "Live shopping & auctions",
    color: "bg-violet-600",
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    borderHover: "hover:border-violet-300",
    initial: "W",
    api: "coming_soon",
    categories: ["Collectibles", "Sports Cards", "Toys"],
  },
  {
    key: "GRAILED",
    label: "Grailed",
    tagline: "Premium menswear & streetwear",
    color: "bg-neutral-800",
    iconBg: "bg-neutral-100",
    iconText: "text-neutral-800",
    borderHover: "hover:border-neutral-400",
    initial: "G",
    api: "coming_soon",
    categories: ["Menswear", "Luxury", "Streetwear"],
  },
];

// ─── Filter types ─────────────────────────────────────────────────────────────

type Filter = "all" | "connected" | "available" | "coming_soon";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "connected", label: "Connected" },
  { key: "available", label: "Available" },
  { key: "coming_soon", label: "Coming Soon" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacesPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const disconnectMutation = useMutation({
    mutationFn: marketplacesApi.deleteConnection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
      toast.success("Marketplace disconnected");
    },
    onError: () => toast.error("Failed to disconnect marketplace"),
  });

  const connections: any[] = connectionsData?.data ?? [];

  async function handleConnect(key: string) {
    try {
      const res = await marketplacesApi.getAuthUrl(key.toLowerCase());
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start authorization");
    }
  }

  const connectedCount = connections.length;

  const filtered = MARKETPLACES.filter((mp) => {
    const connection = connections.find((c: any) => c.marketplace === mp.key);
    if (filter === "connected") return !!connection;
    if (filter === "available") return mp.api === "full" && !connection;
    if (filter === "coming_soon") return mp.api === "coming_soon";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Marketplaces</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your accounts to cross-list inventory automatically
          </p>
        </div>

        {/* Connected count pill */}
        {!isLoading && (
          <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">
              {connectedCount} connected
            </span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {FILTERS.map(({ key, label }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {label}
              {key === "connected" && connectedCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-[10px] font-semibold text-green-700">
                  {connectedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <Store className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No marketplaces match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((mp) => {
            const connection = connections.find((c: any) => c.marketplace === mp.key);
            const isConnected = !!connection;
            const isComingSoon = mp.api === "coming_soon";

            return (
              <MarketplaceCard
                key={mp.key}
                meta={mp}
                connection={connection}
                isConnected={isConnected}
                isComingSoon={isComingSoon}
                isDisconnecting={
                  disconnectMutation.isPending &&
                  disconnectMutation.variables === connection?.id
                }
                onConnect={() => handleConnect(mp.key)}
                onDisconnect={() => disconnectMutation.mutate(connection.id)}
              />
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          <span className="font-medium">API integrations</span> allow automatic listing syncing.
          Marketplaces marked <span className="font-medium">Coming Soon</span> are on our roadmap —
          you can still manage them manually in the meantime.
        </p>
      </div>
    </div>
  );
}

// ─── Card component ────────────────────────────────────────────────────────────

function MarketplaceCard({
  meta,
  connection,
  isConnected,
  isComingSoon,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: {
  meta: MarketplaceMeta;
  connection: any;
  isConnected: boolean;
  isComingSoon: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        isConnected
          ? "border-green-200 shadow-sm shadow-green-50"
          : "border-gray-200 hover:shadow-md",
        !isConnected && !isComingSoon ? meta.borderHover : "",
      ].join(" ")}
    >
      {/* Color accent strip */}
      <div className={`h-1.5 w-full ${meta.color}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          {/* Icon circle */}
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
              meta.iconBg,
              meta.iconText,
            ].join(" ")}
          >
            {meta.initial}
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            {isConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Connected
              </span>
            ) : isComingSoon ? (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                Soon
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                <Zap className="h-3 w-3" />
                Available
              </span>
            )}
          </div>
        </div>

        {/* Name + tagline */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{meta.tagline}</p>
        </div>

        {/* Categories */}
        <div className="mt-3 flex flex-wrap gap-1">
          {meta.categories.map((cat) => (
            <span
              key={cat}
              className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Connected account info */}
        {isConnected && connection?.accountName && (
          <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
            <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-xs text-gray-600">
              {connection.accountName}
            </span>
            {connection._count?.listings != null && (
              <span className="ml-auto shrink-0 text-xs font-medium text-gray-400">
                {connection._count.listings} listings
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action button */}
        <div className="mt-4">
          {isConnected ? (
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
            >
              <Unplug className="h-3.5 w-3.5" />
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : isComingSoon ? (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-2 text-xs font-medium text-gray-400 cursor-not-allowed"
            >
              Coming soon
            </button>
          ) : (
            <button
              onClick={onConnect}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]",
                meta.color,
              ].join(" ")}
            >
              <Zap className="h-3.5 w-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
