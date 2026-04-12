"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplacesApi } from "@/lib/api";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Plus, Trash2, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getMarketplaceLabel } from "@repo/utils";
import type { MarketplaceType } from "@repo/types";

const SUPPORTED_MARKETPLACES: {
  key: MarketplaceType;
  description: string;
  supportsApi: boolean;
}[] = [
  { key: "EBAY", description: "Sell on the world's largest online marketplace", supportsApi: true },
  { key: "DEPOP", description: "Fashion-focused reselling platform", supportsApi: true },
  { key: "FACEBOOK_MARKETPLACE", description: "Local and nationwide marketplace", supportsApi: false },
  { key: "MERCARI", description: "Simple and fast selling app", supportsApi: false },
  { key: "POSHMARK", description: "Fashion, home, beauty and more", supportsApi: false },
];

export default function MarketplacesSettingsPage(): import("react").JSX.Element {
  const qc = useQueryClient();

  const { data: connectionsData } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const disconnectMutation = useMutation({
    mutationFn: marketplacesApi.deleteConnection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
      toast.success("Marketplace disconnected");
    },
  });

  const connections: any[] = connectionsData?.data ?? [];

  async function handleConnect(marketplace: string) {
    try {
      const res = await marketplacesApi.getAuthUrl(marketplace.toLowerCase());
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start OAuth flow");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Connections</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect your marketplace accounts to start cross-listing
        </p>
      </div>

      <div className="space-y-4">
        {SUPPORTED_MARKETPLACES.map(({ key, description, supportsApi }) => {
          const connection = connections.find((c: any) => c.marketplace === key);
          const isConnected = !!connection;

          return (
            <Card key={key}>
              <CardContent className="flex items-center gap-4 p-5">
                {/* Status icon */}
                {isConnected ? (
                  <CheckCircle className="h-8 w-8 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 shrink-0 text-gray-300" />
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {getMarketplaceLabel(key)}
                    </h3>
                    {!supportsApi && (
                      <Badge variant="outline" className="text-xs">
                        Manual listing
                      </Badge>
                    )}
                    {isConnected && (
                      <Badge variant="success">Connected</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{description}</p>
                  {connection?.accountName && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Account: {connection.accountName} ·{" "}
                      {connection._count?.listings ?? 0} listings
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectMutation.mutate(connection.id)}
                      disabled={disconnectMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Disconnect
                    </Button>
                  ) : supportsApi ? (
                    <Button size="sm" onClick={() => handleConnect(key)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Connect
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

