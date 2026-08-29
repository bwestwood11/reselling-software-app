"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "@/lib/api";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { RefreshCw, Loader2, Download, CheckCircle2, AlertCircle, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate, getMarketplaceLabel } from "@repo/utils";

const STATUS_COLORS = {
  success: "success",
  failed: "destructive",
  pending: "warning",
} as const;

type ImportResult = { total: number; imported: number; skipped: number; errors: number };

export default function SyncPage(): import("react").JSX.Element {
  const qc = useQueryClient();
  const router = useRouter();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

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

  const importMutation = useMutation({
    mutationFn: syncApi.importFromEbay,
    onSuccess: (res) => {
      setImportResult(res.data);
      qc.invalidateQueries({ queryKey: ["sync-events"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      // Mark the inventory list stale so the next mount (below, or a manual visit)
      // refetches instead of showing a cached pre-import snapshot.
      qc.invalidateQueries({ queryKey: ["inventory"] });
      if (res.data.imported > 0) {
        toast.success(`Imported ${res.data.imported} listing${res.data.imported !== 1 ? "s" : ""} from eBay`);
        router.push("/inventory");
      } else if (res.data.total === 0) {
        toast.info("No active eBay listings found");
      } else {
        toast.info("All listings already imported");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Import failed");
    },
  });

  const events = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Sync Activity</h1>
          <p className="mt-1 text-sm text-zinc-500">
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

      {/* ── Import from eBay ───────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Import from eBay</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pull your currently active eBay listings into your inventory. Already-imported
              listings are skipped automatically.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setImportResult(null);
              importMutation.mutate();
            }}
            disabled={importMutation.isPending}
            className="shrink-0"
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {importMutation.isPending ? "Importing…" : "Import active listings"}
          </Button>
        </div>

        {/* Result summary */}
        {importResult && !importMutation.isPending && (
          <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <Stat
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              label="Imported"
              value={importResult.imported}
              color="text-emerald-700"
            />
            <div className="w-px bg-zinc-200" />
            <Stat
              icon={<SkipForward className="h-4 w-4 text-zinc-400" />}
              label="Already synced"
              value={importResult.skipped}
              color="text-zinc-600"
            />
            <div className="w-px bg-zinc-200" />
            <Stat
              icon={<AlertCircle className="h-4 w-4 text-red-400" />}
              label="Errors"
              value={importResult.errors}
              color="text-red-600"
            />
            <div className="w-px bg-zinc-200" />
            <Stat
              icon={null}
              label="Total on eBay"
              value={importResult.total}
              color="text-zinc-500"
            />
          </div>
        )}
      </div>

      {/* ── Recent sync events ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-zinc-100" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-zinc-500">No sync events yet</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {events.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {event.listing.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {getMarketplaceLabel(event.listing.marketplace)} · {event.type}
                      {event.message && ` · ${event.message}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={STATUS_COLORS[event.status as keyof typeof STATUS_COLORS] ?? "secondary"}>
                      {event.status}
                    </Badge>
                    <span className="text-xs text-zinc-400">
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

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className={`text-lg font-bold tabular-nums leading-none ${color}`}>{value}</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
