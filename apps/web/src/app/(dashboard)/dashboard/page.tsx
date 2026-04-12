"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, formatRelativeDate, getMarketplaceLabel } from "@repo/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import { Package, Tag, DollarSign, TrendingUp, RefreshCw } from "lucide-react";
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-28" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your reselling business
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inventory"
          value={stats?.totalInventory ?? 0}
          Icon={Package}
          color="blue"
        />
        <StatCard
          title="Active Listings"
          value={stats?.activeListings ?? 0}
          Icon={Tag}
          color="green"
        />
        <StatCard
          title="Sold This Month"
          value={stats?.soldThisMonth ?? 0}
          Icon={TrendingUp}
          color="purple"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listings by Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.listingsByMarketplace.length === 0 ? (
              <p className="text-sm text-gray-500">No listings yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.listingsByMarketplace.map((mp) => (
                  <div key={mp.marketplace} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getMarketplaceLabel(mp.marketplace as any)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{mp.active} active</span>
                      <Badge variant="secondary">{mp.count} total</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sync events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recent Sync Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSyncEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No sync activity yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentSyncEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.listingTitle}</p>
                      <p className="text-xs text-gray-500">
                        {getMarketplaceLabel(event.marketplace)} · {event.type}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={event.status === "success" ? "success" : event.status === "failed" ? "destructive" : "secondary"}
                      >
                        {event.status}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatRelativeDate(event.createdAt)}
                      </span>
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
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`rounded-xl p-3 ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

