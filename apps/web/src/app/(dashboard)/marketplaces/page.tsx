"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplacesApi } from "@/lib/api";
import {
  CheckCircle2,
  Zap,
  AlertCircle,
  Unplug,
  ExternalLink,
  Store,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { MarketplaceType } from "@repo/types";

// ─── Marketplace catalog ──────────────────────────────────────────────────────

type ApiSupport = "full" | "coming_soon";

interface MarketplaceMeta {
  key: MarketplaceType;
  label: string;
  tagline: string;
  color: string;
  iconBg: string;
  iconText: string;
  borderHover: string;
  initial: string;
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
    api: "full",
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
    api: "full",
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

const MARKETPLACE_LOGOS: Partial<Record<MarketplaceType, string>> = {
  EBAY: "/logos/ebay.png",
  ETSY: "/logos/Etsy.png",
  MERCARI: "/logos/Mercari.png",
  POSHMARK: "/logos/Poshmark.png",
  FACEBOOK_MARKETPLACE: "/logos/Facebook.png",
  WHATNOT: "/logos/Whatnot.png",
};

const MARKETPLACE_GLOWS: Partial<Record<MarketplaceType, string>> = {
  EBAY: "from-blue-500/25 to-red-500/15",
  ETSY: "from-orange-500/25 to-amber-500/15",
  MERCARI: "from-red-500/20 to-rose-500/15",
  POSHMARK: "from-rose-500/20 to-pink-500/20",
  DEPOP: "from-zinc-500/20 to-zinc-700/10",
  FACEBOOK_MARKETPLACE: "from-blue-500/20 to-cyan-500/15",
  WHATNOT: "from-violet-500/20 to-fuchsia-500/15",
  GRAILED: "from-neutral-600/20 to-zinc-500/10",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacesPage(): React.JSX.Element {
  return (
    <Suspense>
      <MarketplacesContent />
    </Suspense>
  );
}

function MarketplacesContent(): React.JSX.Element {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [mercariModal, setMercariModal] = useState(false);
  const [poshmarkModal, setPoshmarkModal] = useState(false);

  // Handle OAuth callback result (?connected=ebay or ?error=...)
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const label =
        MARKETPLACES.find(
          (mp) => mp.key === connected.toUpperCase()
        )?.label ?? connected;
      toast.success(`${label} connected successfully!`);
      qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
      router.replace(pathname);
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router, qc]);

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

  const setupPoliciesMutation = useMutation({
    mutationFn: marketplacesApi.setupEbayPolicies,
    onSuccess: (res) => {
      const errors: string[] = res.errors ?? [];
      if (errors.length > 0) {
        toast.error(`Policies setup with errors: ${errors.join(", ")}`);
      } else {
        toast.success("eBay policies created successfully");
      }
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to setup eBay policies"),
  });

  const connections: any[] = connectionsData?.data ?? [];
  const connectedCount = connections.length;

  async function handleConnect(key: string) {
    if (key === "MERCARI") {
      setMercariModal(true);
      return;
    }
    if (key === "POSHMARK") {
      setPoshmarkModal(true);
      return;
    }
    try {
      const res = await marketplacesApi.getAuthUrl(key.toLowerCase());
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start authorization. Check your app configuration.");
    }
  }

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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketplaces</h1>
            <p className="mt-1 text-sm text-slate-200/90">
            Connect your accounts to cross-list inventory automatically
            </p>
          </div>

          {!isLoading && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-medium text-emerald-100">
                {connectedCount} connected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1">
        {FILTERS.map(({ key, label }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
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
                isSettingUpPolicies={mp.key === "EBAY" && setupPoliciesMutation.isPending}
                onConnect={() => handleConnect(mp.key)}
                onDisconnect={() => disconnectMutation.mutate(connection.id)}
                onSetupPolicies={mp.key === "EBAY" ? () => setupPoliciesMutation.mutate() : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p className="text-sm text-sky-800">
          <span className="font-medium">API integrations</span> allow automatic listing and
          syncing.{" "}
          <span className="font-medium">Coming Soon</span> marketplaces are on the roadmap — you
          can still manage them manually in the meantime.
        </p>
      </div>

      {/* Mercari connect modal */}
      {mercariModal && (
        <MercariConnectModal
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
        <PoshmarkConnectModal
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

// ─── Card component ────────────────────────────────────────────────────────────

function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function MarketplaceCard({
  meta,
  connection,
  isConnected,
  isComingSoon,
  isDisconnecting,
  isSettingUpPolicies,
  onConnect,
  onDisconnect,
  onSetupPolicies,
}: {
  meta: MarketplaceMeta;
  connection: any;
  isConnected: boolean;
  isComingSoon: boolean;
  isDisconnecting: boolean;
  isSettingUpPolicies?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetupPolicies?: () => void;
}) {
  const logoPath = MARKETPLACE_LOGOS[meta.key];
  const glow = MARKETPLACE_GLOWS[meta.key] ?? "from-zinc-300/20 to-zinc-500/10";
  const tokenExpired = isConnected && isTokenExpired(connection?.expiresAt);

  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        isConnected
          ? tokenExpired
            ? "border-orange-300 shadow-md shadow-orange-100"
            : "border-green-200 shadow-sm shadow-green-50"
          : "border-gray-200 hover:shadow-md",
        !isConnected && !isComingSoon ? meta.borderHover : "",
      ].join(" ")}
    >
      {/* Expired overlay gradient */}
      {tokenExpired && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/10 to-amber-500/10" />
      )}
      {!tokenExpired && (
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${glow}`} />
      )}

      {/* Color accent strip — orange when expired */}
      <div className={`h-1.5 w-full ${tokenExpired ? "bg-gradient-to-r from-orange-500 to-amber-500" : meta.color}`} />

      <div className="relative flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={[
              "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white text-lg font-bold shadow-sm ring-1",
              tokenExpired
                ? "border-orange-200 ring-orange-100"
                : "border-white/80 ring-black/5",
              meta.iconBg,
              meta.iconText,
            ].join(" ")}
          >
            {logoPath ? (
              <Image
                src={logoPath}
                alt={`${meta.label} logo`}
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
              />
            ) : (
              meta.initial
            )}
          </div>

          <div className="shrink-0">
            {isConnected ? (
              tokenExpired ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Session Expired
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              )
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
          <div className={[
            "mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2",
            tokenExpired ? "bg-orange-50" : "bg-gray-50",
          ].join(" ")}>
            <ExternalLink className={`h-3 w-3 shrink-0 ${tokenExpired ? "text-orange-400" : "text-gray-400"}`} />
            <span className={`truncate text-xs ${tokenExpired ? "text-orange-700" : "text-gray-600"}`}>
              {connection.accountName}
            </span>
            {connection._count?.listings != null && (
              <span className={`ml-auto shrink-0 text-xs font-medium ${tokenExpired ? "text-orange-400" : "text-gray-400"}`}>
                {connection._count.listings} listings
              </span>
            )}
          </div>
        )}

        {/* Token expired callout */}
        {tokenExpired && (
          <div className="mt-3 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-3 w-3 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-800">Session expired</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-orange-600">
                  Your {meta.label} session has expired. Reconnect to resume listing syncs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="mt-4 flex flex-col gap-2">
          {isConnected && onSetupPolicies && !tokenExpired && (
            <button
              onClick={onSetupPolicies}
              disabled={isSettingUpPolicies}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-700 transition-all hover:bg-blue-100 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSettingUpPolicies ? "Setting up…" : "Setup Policies"}
            </button>
          )}
          {isConnected ? (
            <>
              {tokenExpired ? (
                <button
                  onClick={onConnect}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-300 active:scale-[0.98]"
                >
                  <Zap className="h-4 w-4" />
                  Reconnect to {meta.label}
                </button>
              ) : null}
              <button
                onClick={onDisconnect}
                disabled={isDisconnecting}
                className={[
                  "flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
                  tokenExpired
                    ? "border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    : "border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600",
                ].join(" ")}
              >
                <Unplug className="h-3.5 w-3.5" />
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : isComingSoon ? (
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-2 text-xs font-medium text-gray-400"
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

// ─── Mercari connect modal ─────────────────────────────────────────────────────
// Mercari has no public OAuth API. The only supported connection path is via the
// ReList Chrome extension, which opens mercari.com/login in a real browser tab
// (bypassing CORS + Cloudflare Bot Management), waits for the user to log in,
// then reads the auth token from the page's localStorage/cookies and POSTs it
// to /api/marketplaces/mercari/connect-token.

const EXTENSION_STEPS = [
  "Install the ReList Chrome Extension from the Chrome Web Store.",
  "Click the ReList icon in your browser toolbar to open the popup.",
  'Click "Connect Mercari Account" — a Mercari login tab will open.',
  "Sign in with your Mercari credentials. The tab closes automatically once done.",
];

function MercariConnectModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);

  async function verifyConnection() {
    setChecking(true);
    try {
      const res = await marketplacesApi.listConnections();
      const connections: any[] = res.data ?? [];
      if (connections.some((c: any) => c.marketplace === "MERCARI")) {
        qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
        onConnected();
      } else {
        toast.error("Mercari not connected yet — complete the login in the extension popup.");
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
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-50">
            <span className="text-sm font-bold text-red-600">M</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">Connect Mercari</p>
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
          {/* Why the extension */}
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
            <p className="text-xs text-sky-800">
              Mercari has no public API. The extension logs in through Mercari&apos;s real website
              — the same way you&apos;d do it manually — so there are no bot-detection issues.
            </p>
          </div>

          {/* Step-by-step guide */}
          <div>
            <p className="mb-2.5 text-xs font-semibold text-zinc-700">How to connect</p>
            <ol className="space-y-2">
              {EXTENSION_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-zinc-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Verify button */}
          <button
            onClick={verifyConnection}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-100 disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            )}
            {checking ? "Checking…" : "I've connected — verify"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Poshmark connect modal ────────────────────────────────────────────────────
// Poshmark has no public API. Connection is captured by the ReList Chrome
// extension, which opens poshmark.com in a real browser tab, waits for login,
// reads session cookies + CSRF token, and POSTs them to
// /api/marketplaces/poshmark/connect-token.

const POSHMARK_EXTENSION_STEPS = [
  "Install the ReList Chrome Extension from the Chrome Web Store.",
  "Click the ReList icon in your browser toolbar to open the popup.",
  'Click "Connect Poshmark Account" — a Poshmark login tab will open.',
  "Sign in with your Poshmark credentials. The tab closes automatically once done.",
];

function PoshmarkConnectModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);

  async function verifyConnection() {
    setChecking(true);
    try {
      const res = await marketplacesApi.listConnections();
      const connections: any[] = res.data ?? [];
      if (connections.some((c: any) => c.marketplace === "POSHMARK")) {
        qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
        onConnected();
      } else {
        toast.error("Poshmark not connected yet — complete the login in the extension popup.");
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
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50">
            <span className="text-sm font-bold text-rose-500">P</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">Connect Poshmark</p>
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
          {/* Why the extension */}
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
            <p className="text-xs text-sky-800">
              Poshmark has no public API. The extension logs in through Poshmark&apos;s real website
              — the same way you&apos;d do it manually — so there are no bot-detection issues.
            </p>
          </div>

          {/* Step-by-step guide */}
          <div>
            <p className="mb-2.5 text-xs font-semibold text-zinc-700">How to connect</p>
            <ol className="space-y-2">
              {POSHMARK_EXTENSION_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-zinc-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Verify button */}
          <button
            onClick={verifyConnection}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-100 disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            )}
            {checking ? "Checking…" : "I've connected — verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
