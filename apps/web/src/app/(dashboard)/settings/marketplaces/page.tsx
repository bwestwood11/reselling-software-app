"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplacesApi } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { cn } from "@repo/ui";
import {
  CheckCircle2,
  AlertCircle,
  Unplug,
  Zap,
  Loader2,
  Truck,
  MapPin,
  ShieldCheck,
  X,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import type { MarketplaceType } from "@repo/types";

// ─── Marketplace catalog ──────────────────────────────────────────────────────
// Scoped to marketplaces that actually exist in the Prisma `MarketplaceType` enum.
// eBay connects via OAuth; Mercari and Poshmark have no public API and connect
// through the ReList Chrome extension (it logs in through the real site, the
// same way a person would, so there's no bot-detection risk).

type ApiSupport = "full" | "coming_soon";
type ConnectVia = "oauth" | "extension";

interface MarketplaceMeta {
  key: MarketplaceType;
  label: string;
  tagline: string;
  logo?: string;
  color: string;
  iconBg: string;
  iconText: string;
  api: ApiSupport;
  connectVia: ConnectVia;
}

const MARKETPLACES: MarketplaceMeta[] = [
  {
    key: "EBAY",
    label: "eBay",
    tagline: "World's largest online marketplace",
    logo: "/logos/ebay.png",
    color: "bg-blue-600",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    api: "full",
    connectVia: "oauth",
  },
  {
    key: "POSHMARK",
    label: "Poshmark",
    tagline: "Fashion, home, beauty and more",
    logo: "/logos/Poshmark.png",
    color: "bg-rose-500",
    iconBg: "bg-rose-50",
    iconText: "text-rose-500",
    api: "full",
    connectVia: "extension",
  },
  {
    key: "MERCARI",
    label: "Mercari",
    tagline: "Simple and fast selling app",
    logo: "/logos/Mercari.png",
    color: "bg-red-600",
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    api: "full",
    connectVia: "extension",
  },
  {
    key: "DEPOP",
    label: "Depop",
    tagline: "Fashion-focused reselling platform",
    color: "bg-red-500",
    iconBg: "bg-red-50",
    iconText: "text-red-500",
    api: "coming_soon",
    connectVia: "oauth",
  },
  {
    key: "FACEBOOK_MARKETPLACE",
    label: "Facebook Marketplace",
    tagline: "Local and nationwide marketplace",
    logo: "/logos/Facebook.png",
    color: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconText: "text-blue-500",
    api: "coming_soon",
    connectVia: "oauth",
  },
  {
    key: "ETSY",
    label: "Etsy",
    tagline: "Handmade, vintage and unique goods",
    logo: "/logos/Etsy.png",
    color: "bg-orange-500",
    iconBg: "bg-orange-50",
    iconText: "text-orange-500",
    api: "coming_soon",
    connectVia: "oauth",
  },
];

type MercariAddress = {
  id: number;
  address1: string;
  address2: string;
  city: string;
  stateAbbreviation: string;
  zipCode1: string;
  isDefault: boolean;
};

function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacesSettingsPage(): import("react").JSX.Element {
  const qc = useQueryClient();
  const [mercariModal, setMercariModal] = useState(false);
  const [poshmarkModal, setPoshmarkModal] = useState(false);

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

  // Tracks marketplaces whose stored token eBay has rejected outright (distinct from a
  // locally-known `expiresAt` in the past) — surfaced by setup-policies below. Treated the
  // same as an expired token in the UI: show "Session expired" and prompt to reconnect.
  const [authIssues, setAuthIssues] = useState<Record<string, boolean>>({});

  const setupPoliciesMutation = useMutation({
    mutationFn: marketplacesApi.setupEbayPolicies,
    onSuccess: (res) => {
      setAuthIssues((prev) => ({ ...prev, EBAY: false }));
      const errors: string[] = res.errors ?? [];
      if (errors.length > 0) {
        toast.error(`Policies set up with errors: ${errors.join(", ")}`);
      } else {
        toast.success("eBay policies created successfully");
      }
    },
    onError: (err: any) => {
      if (err?.status === 401) {
        setAuthIssues((prev) => ({ ...prev, EBAY: true }));
        toast.error("Your eBay connection needs to be reconnected — click Reconnect below.");
      } else {
        toast.error(err?.message ?? "Failed to set up eBay policies");
      }
    },
  });

  const connections: any[] = connectionsData?.data ?? [];
  const connectedCount = connections.length;

  async function handleConnect(mp: MarketplaceMeta) {
    if (mp.connectVia === "extension") {
      if (mp.key === "MERCARI") setMercariModal(true);
      if (mp.key === "POSHMARK") setPoshmarkModal(true);
      return;
    }
    try {
      const res = await marketplacesApi.getAuthUrl(mp.key.toLowerCase());
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start authorization. Check your app configuration.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Marketplace Connections</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Connect your marketplace accounts to start cross-listing.
          </p>
        </div>
        {!isLoading && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {connectedCount} connected
            </span>
          </div>
        )}
      </div>

      {/* Connections list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {MARKETPLACES.map((mp) => {
            const connection = connections.find((c: any) => c.marketplace === mp.key);
            const isConnected = !!connection;
            const isComingSoon = mp.api === "coming_soon";
            const tokenExpired =
              isConnected && (isTokenExpired(connection?.expiresAt) || !!authIssues[mp.key]);
            const isDisconnecting =
              disconnectMutation.isPending && disconnectMutation.variables === connection?.id;

            return (
              <div
                key={mp.key}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow",
                  tokenExpired
                    ? "border-orange-200"
                    : isConnected
                      ? "border-emerald-200"
                      : "border-zinc-200 hover:shadow-md"
                )}
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  {/* Logo */}
                  <div
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-base font-bold ring-1 ring-black/5",
                      mp.iconBg,
                      mp.iconText
                    )}
                  >
                    {mp.logo ? (
                      <Image
                        src={mp.logo}
                        alt={`${mp.label} logo`}
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      mp.label[0]
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">{mp.label}</h3>
                      {tokenExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
                          <AlertCircle className="h-3 w-3" />
                          Session expired
                        </span>
                      ) : isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Connected
                        </span>
                      ) : isComingSoon ? (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                          Coming soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                          <Zap className="h-3 w-3" />
                          {mp.connectVia === "extension" ? "Via extension" : "Available"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">{mp.tagline}</p>
                    {isConnected && connection?.accountName && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Account: <span className="text-zinc-600">{connection.accountName}</span>
                        {" · "}
                        {connection._count?.listings ?? 0} listings
                      </p>
                    )}
                    {tokenExpired && (
                      <p className="mt-1 text-xs text-orange-600">
                        Reconnect to resume listing syncs.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {isConnected ? (
                      <>
                        {tokenExpired && (
                          <button
                            onClick={() => handleConnect(mp)}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.7)] transition-all hover:opacity-90"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Reconnect
                          </button>
                        )}
                        <button
                          onClick={() => disconnectMutation.mutate(connection.id)}
                          disabled={isDisconnecting}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unplug className="h-3.5 w-3.5" />
                          )}
                          Disconnect
                        </button>
                      </>
                    ) : isComingSoon ? (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-xl border border-dashed border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400"
                      >
                        Coming soon
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(mp)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]",
                          mp.color
                        )}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* eBay policies */}
                {mp.key === "EBAY" && isConnected && !tokenExpired && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                      Fulfillment, payment and return policies are required before eBay listings
                      can publish.
                    </div>
                    <button
                      onClick={() => setupPoliciesMutation.mutate()}
                      disabled={setupPoliciesMutation.isPending}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {setupPoliciesMutation.isPending ? "Setting up…" : "Set up policies"}
                    </button>
                  </div>
                )}

                {/* Mercari preferences */}
                {mp.key === "MERCARI" && isConnected && <MercariPreferences />}
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p className="text-sm text-sky-800">
          <span className="font-medium">eBay</span> connects via OAuth.{" "}
          <span className="font-medium">Mercari</span> and <span className="font-medium">
            Poshmark
          </span>{" "}
          connect through the ReList Chrome extension, since neither offers a public API.{" "}
          <span className="font-medium">Coming soon</span> marketplaces are on the roadmap.
        </p>
      </div>

      {/* Mercari connect modal */}
      {mercariModal && (
        <ExtensionConnectModal
          marketplace="MERCARI"
          label="Mercari"
          accentBg="bg-red-50"
          accentText="text-red-600"
          stepBg="bg-orange-100"
          stepText="text-orange-600"
          onClose={() => setMercariModal(false)}
          onConnected={() => {
            setMercariModal(false);
            qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
            toast.success("Mercari connected successfully!");
          }}
        />
      )}

      {/* Poshmark connect modal */}
      {poshmarkModal && (
        <ExtensionConnectModal
          marketplace="POSHMARK"
          label="Poshmark"
          accentBg="bg-rose-50"
          accentText="text-rose-500"
          stepBg="bg-rose-100"
          stepText="text-rose-600"
          onClose={() => setPoshmarkModal(false)}
          onConnected={() => {
            setPoshmarkModal(false);
            qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
            toast.success("Poshmark connected successfully!");
          }}
        />
      )}
    </div>
  );
}

// ─── Extension connect modal (Mercari / Poshmark) ─────────────────────────────
// Neither marketplace has a public API. The ReList Chrome extension opens the
// real site in a browser tab, waits for the user to log in, then reads the
// resulting session and posts it to the API — the same as logging in by hand.

function ExtensionConnectModal({
  marketplace,
  label,
  accentBg,
  accentText,
  stepBg,
  stepText,
  onClose,
  onConnected,
}: {
  marketplace: MarketplaceType;
  label: string;
  accentBg: string;
  accentText: string;
  stepBg: string;
  stepText: string;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [checking, setChecking] = useState(false);

  const steps = [
    "Install the ReList Chrome Extension from the Chrome Web Store.",
    "Click the ReList icon in your browser toolbar to open the popup.",
    `Click "Connect ${label} Account" — a ${label} login tab will open.`,
    "Sign in with your credentials. The tab closes automatically once done.",
  ];

  async function verifyConnection() {
    setChecking(true);
    try {
      const res = await marketplacesApi.listConnections();
      const connections: any[] = res.data ?? [];
      if (connections.some((c: any) => c.marketplace === marketplace)) {
        onConnected();
      } else {
        toast.error(`${label} not connected yet — complete the login in the extension popup.`);
      }
    } catch {
      toast.error("Could not verify connection. Check your network and try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
          <div className={cn("grid h-9 w-9 place-items-center rounded-xl", accentBg)}>
            <span className={cn("text-sm font-bold", accentText)}>{label[0]}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">Connect {label}</p>
            <p className="text-xs text-zinc-500">Via the ReList Chrome Extension</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
            <p className="text-xs text-sky-800">
              {label} has no public API. The extension logs in through {label}&apos;s real
              website — the same way you&apos;d do it manually — so there are no bot-detection
              issues.
            </p>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold text-zinc-700">How to connect</p>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      stepBg,
                      stepText
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-zinc-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={verifyConnection}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-100 disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            )}
            {checking ? "Checking…" : "I've connected — verify"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mercari preferences panel ─────────────────────────────────────────────────

function MercariPreferences() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mercari-addresses"],
    queryFn: marketplacesApi.getMercariAddresses,
  });

  const addresses: MercariAddress[] = data?.data ?? [];
  const preferredAddressId: number | null = data?.preferredAddressId ?? null;
  const preferredShippingMethod: "SOYO" | "PREPAID" | null = data?.preferredShippingMethod ?? null;

  const setPreferredAddressMutation = useMutation({
    mutationFn: (addressId: number) => marketplacesApi.setMercariPreferredAddress(addressId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mercari-addresses"] });
      toast.success("Preferred Mercari address saved");
    },
    onError: () => toast.error("Failed to save preferred address"),
  });

  const setPreferredShippingMethodMutation = useMutation({
    mutationFn: (method: "SOYO" | "PREPAID") => marketplacesApi.setMercariPreferredShippingMethod(method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mercari-addresses"] });
      toast.success("Preferred Mercari shipping method saved");
    },
    onError: () => toast.error("Failed to save preferred shipping method"),
  });

  const shippingMethod = preferredShippingMethod ?? "PREPAID";

  return (
    <div className="space-y-5 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
      <p className="text-xs text-zinc-500">
        Mercari listings are published by the ReList browser extension, which posts from your own
        browser session. Keep the extension installed and signed in.
      </p>

      {/* Shipping method */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700">
            Default shipping method for new listings
          </span>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
          {(
            [
              { value: "PREPAID", label: "Prepaid Label" },
              { value: "SOYO", label: "Ship on Your Own" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPreferredShippingMethodMutation.mutate(opt.value)}
              disabled={isLoading || setPreferredShippingMethodMutation.isPending}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50",
                shippingMethod === opt.value
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred address */}
      {addresses.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700">
              Preferred shipping address for new listings
            </span>
          </div>
          <Select
            value={preferredAddressId ? String(preferredAddressId) : ""}
            onValueChange={(val) => setPreferredAddressMutation.mutate(Number(val))}
            disabled={isLoading || setPreferredAddressMutation.isPending}
          >
            <SelectTrigger className="max-w-md rounded-xl border-zinc-200 bg-white text-xs focus:ring-orange-200">
              <SelectValue placeholder="Use Mercari's default address" />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((addr) => (
                <SelectItem key={addr.id} value={String(addr.id)}>
                  {addr.address1}
                  {addr.address2 ? ` ${addr.address2}` : ""}, {addr.city}, {addr.stateAbbreviation}{" "}
                  {addr.zipCode1}
                  {addr.isDefault ? " (Mercari default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
