"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, formatRelativeDate, getMarketplaceLabel } from "@repo/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import {
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Boxes,
} from "lucide-react";
import type { DashboardStats } from "@repo/types";

export default function DashboardPage(): import("react").JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 60_000, // refresh every minute
  });

  const stats: DashboardStats | undefined = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-40 animate-pulse rounded-3xl bg-[#ece8e2]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#ece8e2]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-[#ece8e2]" />
          <div className="h-80 animate-pulse rounded-2xl bg-[#ece8e2]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#f6f5f3]">
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_18%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_52%),radial-gradient(circle_at_88%_30%,_#f59e0b_0%,_#fbbf24_18%,_transparent_44%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)] lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/30" />
        <div className="pointer-events-none absolute bottom-4 right-8 h-24 w-24 rounded-full bg-orange-200/30 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100">Control Center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reselling Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-orange-50">
              Track inventory, listings, revenue, and sync health from one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-orange-100/50 bg-black/20 p-3 backdrop-blur-sm">
            <HeroMiniStat label="Inventory" value={stats?.totalInventory ?? 0} />
            <HeroMiniStat label="Live Listings" value={stats?.activeListings ?? 0} />
            <HeroMiniStat label="Sold" value={stats?.soldThisMonth ?? 0} />
            <HeroMiniStat label="Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inventory"
          value={stats?.totalInventory ?? 0}
          Icon={Package}
          color="orange"
        />
        <StatCard
          title="Active Listings"
          value={stats?.activeListings ?? 0}
          Icon={Tag}
          color="amber"
        />
        <StatCard
          title="Sold This Month"
          value={stats?.soldThisMonth ?? 0}
          Icon={TrendingUp}
          color="gold"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          Icon={DollarSign}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Listings by marketplace */}
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
            <CardTitle className="text-base flex items-center gap-2 text-zinc-900">
              <Boxes className="h-4 w-4 text-orange-700" />
              Listings by Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {stats?.listingsByMarketplace.length === 0 ? (
              <p className="text-sm text-zinc-500">No listings yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.listingsByMarketplace.map((mp) => (
                  <div
                    key={mp.marketplace}
                    className="rounded-xl border border-zinc-100 bg-white p-3 shadow-[0_12px_30px_-24px_rgba(24,24,27,0.35)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-zinc-900">
                        {getMarketplaceLabel(mp.marketplace as any)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">{mp.active} active</span>
                        <Badge variant="secondary">{mp.count} total</Badge>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                        style={{ width: `${Math.max(6, Math.min(100, Math.round((mp.active / Math.max(mp.count, 1)) * 100)))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sync events */}
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70">
            <CardTitle className="text-base flex items-center gap-2 text-zinc-900">
              <RefreshCw className="h-4 w-4 text-orange-700" />
              Recent Sync Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {stats?.recentSyncEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">No sync activity yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentSyncEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-zinc-100 bg-white p-3 shadow-[0_12px_30px_-24px_rgba(24,24,27,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{event.listingTitle}</p>
                      <p className="text-xs text-zinc-500">
                        {getMarketplaceLabel(event.marketplace)} · {event.type}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={event.status === "success" ? "success" : event.status === "failed" ? "destructive" : "secondary"}
                      >
                        {event.status}
                      </Badge>
                      <span className="text-xs text-zinc-400">
                        {formatRelativeDate(event.createdAt)}
                      </span>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  Icon,
  color,
}: {
  title: string;
  value: string | number;
  Icon: React.ElementType;
  color: "orange" | "amber" | "gold";
}) {
  const colorMap = {
    orange: {
      icon: "bg-orange-100 text-orange-700",
      glow: "from-orange-500/20 to-amber-500/15",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700",
      glow: "from-amber-500/20 to-orange-500/12",
    },
    gold: {
      icon: "bg-yellow-100 text-yellow-700",
      glow: "from-yellow-400/22 to-orange-500/14",
    },
  };

  return (
    <Card className="relative overflow-hidden border-zinc-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${colorMap[color].glow}`} />
      <CardContent className="relative pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
              Updated live
              <ArrowUpRight className="h-3 w-3" />
            </p>
          </div>
          <div className={`rounded-xl p-3 ${colorMap[color].icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): import("react").JSX.Element {
  return (
    <div className="rounded-xl border border-orange-100/40 bg-white/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-100">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

