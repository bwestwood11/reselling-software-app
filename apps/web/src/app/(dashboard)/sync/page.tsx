"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "@/lib/api";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate, getMarketplaceLabel } from "@repo/utils";

const STATUS_COLORS = {
  success: "success",
  failed: "destructive",
  pending: "warning",
} as const;

export default function SyncPage(): import("react").JSX.Element {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sync-events"],
    queryFn: () => syncApi.getEvents({ limit: "50" }),
    refetchInterval: 30_000,
  });

  const syncAllMutation = useMutation({
    mutationFn: syncApi.syncAll,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["sync-events"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success(
        `Sync complete: ${res.data.succeeded}/${res.data.total} succeeded`
      );
    },
    onError: () => toast.error("Sync failed"),
  });

  const events = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Activity</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor listing sync status across all marketplaces
          </p>
        </div>
        <Button
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending}
        >
          {syncAllMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync all now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">No sync events yet</p>
          ) : (
            <div className="divide-y">
              {events.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {event.listing.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getMarketplaceLabel(event.listing.marketplace)} · {event.type}
                      {event.message && ` · ${event.message}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={STATUS_COLORS[event.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
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
  );
}

