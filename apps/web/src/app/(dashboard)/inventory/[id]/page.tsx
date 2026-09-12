"use client";

import { use, useState, type ReactNode } from "react";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { listingsApi } from "@/lib/api";
import { useInventoryItem, useMarkInventorySold } from "@/hooks/use-inventory";
import { MarkSoldDialog } from "@/components/inventory/MarkSoldDialog";
import { MoveToSourceDialog } from "@/components/inventory/MoveToSourceDialog";
import { Button } from "@repo/ui";
import { cn } from "@/lib/utils";
import { ArrowLeft, Package, Tag, ExternalLink, Pencil, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, FolderInput, AlertTriangle } from "lucide-react";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";

// The item page reads like the price tag a reseller would staple to the piece —
// a punched perforation where the "tag head" tears from the ledger below, and an
// inked stamp for status instead of a pill — built entirely from ReList's own
// orange/cream palette and zinc type so it still feels like the rest of the app.
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-tag-mono" });

const LINE = "#e4e4e7"; // zinc-200 — the couple of spots (dashed gradient, punch-hole ring) Tailwind classes can't express

// Kept to three colors on purpose — orange (the one brand accent), zinc (quiet/neutral),
// and red reserved solely for loss/error — rather than adding an off-brand green.
const STAMP_CLASSES: Record<string, string> = {
  DRAFT: "text-zinc-500 border-zinc-400",
  ACTIVE: "text-orange-600 border-orange-600",
  SOLD: "text-zinc-900 border-zinc-900",
  ARCHIVED: "text-zinc-400 border-zinc-300",
};

/** Mirrors MAX_PUBLISH_ATTEMPTS in the API's listing service. */
const MAX_PUBLISH_ATTEMPTS = 3;

export default function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): import("react").JSX.Element {
  const { id } = use(params);
  const { data, isLoading } = useInventoryItem(id);
  const item = data?.data;
  const [soldOpen, setSoldOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const markSold = useMarkInventorySold();
  const qc = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: listingsApi.publish,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Published!");
    },
    onError: (err: Error) => {
      // Refetch so the row shows the new error and the decremented retry count.
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-zinc-200" />
        <div className="h-64 rounded-xl bg-zinc-200" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-zinc-300" />
        <p className="mt-4 text-zinc-500">Item not found</p>
        <Button className="mt-4" asChild>
          <Link href="/inventory">Back to inventory</Link>
        </Button>
      </div>
    );
  }

  const cost = item.costPrice != null ? Number(item.costPrice) : null;
  const target = item.targetPrice != null ? Number(item.targetPrice) : null;
  const margin = cost != null && target != null ? target - cost : null;
  const stampClasses = STAMP_CLASSES[item.status as keyof typeof STAMP_CLASSES] ?? STAMP_CLASSES.DRAFT;

  return (
    <div className={cn(mono.variable, "mx-auto max-w-5xl bg-[#f6f5f3] pb-16 text-zinc-900")}>
      {/* Top bar: back link + inked status stamp */}
      <div className="flex items-center justify-between">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inventory
        </Link>
        <span
          className={cn(
            "select-none rounded-[3px] border-2 px-3 py-1 font-mono text-[13px] font-bold uppercase tracking-[0.12em]",
            stampClasses
          )}
          style={{ transform: "rotate(-3deg)", mixBlendMode: "multiply" }}
        >
          {item.status}
        </span>
      </div>

      {/* Tag head: photo + title/price/actions, side by side like a ticket pinned to the piece */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,15rem)_1fr]">
        <div>
          {item.images?.length > 0 ? (
            <PhotoProvider
              toolbarRender={({ scale, onScale }) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onScale(scale + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onScale(scale - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onScale(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              )}
            >
              <PhotoView src={item.images[0].url}>
                <div className="group relative cursor-zoom-in rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
                  <img src={item.images[0].url} alt={item.title} className="aspect-square w-full rounded-lg object-cover" />
                  <div className="pointer-events-none absolute inset-1.5 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/10">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </PhotoView>
              {item.images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {item.images.slice(1).map((img: any) => (
                    <PhotoView key={img.id} src={img.url}>
                      <div className="group relative cursor-zoom-in rounded-lg border border-zinc-200 bg-white p-1">
                        <img src={img.url} alt="" className="aspect-square w-full rounded object-cover" />
                        <div className="pointer-events-none absolute inset-1 rounded bg-black/0 transition-colors group-hover:bg-black/20" />
                      </div>
                    </PhotoView>
                  ))}
                </div>
              )}
            </PhotoProvider>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-zinc-200 bg-white">
              <Package className="h-12 w-12 text-zinc-300" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl">{item.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12.5px] text-zinc-500">
            {item.brand && <span>{item.brand}</span>}
            {item.sku && <span>SKU {item.sku}</span>}
            <span>Qty {item.quantity}</span>
          </div>

          {/* Price stats — a ledger strip, not a dot-joined caption */}
          {(target != null || cost != null) && (
            <div className="mt-5 flex flex-wrap divide-x divide-zinc-200 font-mono">
              {target != null && (
                <div className="pr-6">
                  <p className="text-[11px] text-zinc-500">Target</p>
                  <p className="text-xl font-semibold tabular-nums text-orange-600">{formatCurrency(target)}</p>
                </div>
              )}
              {cost != null && (
                <div className="px-6 first:pl-0">
                  <p className="text-[11px] text-zinc-500">Cost</p>
                  <p className="text-xl font-semibold tabular-nums text-zinc-900">{formatCurrency(cost)}</p>
                </div>
              )}
              {margin != null && (
                <div className="pl-6">
                  <p className="text-[11px] text-zinc-500">Margin</p>
                  <p className={cn("text-xl font-semibold tabular-nums", margin >= 0 ? "text-zinc-900" : "text-red-600")}>
                    {margin >= 0 ? "+" : ""}
                    {formatCurrency(margin)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {item.status !== "SOLD" && (
              <Button size="sm" onClick={() => setSoldOpen(true)}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Mark as sold
              </Button>
            )}
            <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={() => setMoveOpen(true)}>
              <FolderInput className="mr-1 h-4 w-4" />
              Move
            </Button>
            <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" asChild>
              <Link href={`/inventory/${item.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Perforation — where a real tag would tear from the ledger below */}
      <div className="relative my-9 h-px" style={{ background: `repeating-linear-gradient(to right, ${LINE} 0 6px, transparent 6px 14px)` }}>
        <span className="absolute -left-1.5 -top-2 h-4 w-4 rounded-full border-2 border-zinc-300 bg-[#f6f5f3]" />
      </div>

      <MoveToSourceDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        itemIds={[item.id]}
        currentSourceId={item.source?.id ?? null}
      />

      <MarkSoldDialog
        open={soldOpen}
        onClose={() => setSoldOpen(false)}
        isPending={markSold.isPending}
        itemTitle={item.title}
        defaultPrice={
          item.soldPrice != null
            ? Number(item.soldPrice)
            : item.targetPrice
              ? Number(item.targetPrice)
              : null
        }
        defaultChannel={item.soldVia ?? null}
        defaultNote={item.soldNote ?? null}
        activeListings={(item.listings ?? [])
          .filter((l: any) => l.status === "ACTIVE")
          .map((l: any) => ({ id: l.id, marketplace: l.marketplace }))}
        onConfirm={(values) => {
          markSold.mutate(
            { id: item.id, ...values },
            { onSuccess: () => setSoldOpen(false) }
          );
        }}
      />

      <Section title="Details">
        <Row label="Brand" value={item.brand} />
        <Row label="Condition" value={item.condition?.replace(/_/g, " ")} />
        <Row label="Category" value={item.category} />
        <Row label="Quantity" value={item.quantity} mono />
        {item.source && <Row label="Source" value={item.source.name} />}
      </Section>

      {item.status === "SOLD" && (
        <Section
          title="Sale"
          action={
            <button
              onClick={() => setSoldOpen(true)}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-orange-600 transition-colors hover:text-orange-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          }
        >
          <Row
            label="Sale price"
            value={item.soldPrice != null ? formatCurrency(Number(item.soldPrice)) : undefined}
            mono
          />
          <Row
            label="Profit"
            value={
              item.soldPrice != null && item.costPrice != null
                ? formatCurrency(Number(item.soldPrice) - Number(item.costPrice) * (item.quantity ?? 1))
                : undefined
            }
            mono
          />
          <Row label="Sold via" value={item.soldVia} />
          <Row label="Sold on" value={item.soldAt ? new Date(item.soldAt).toLocaleDateString() : undefined} />
          {item.soldNote && (
            <div className="py-2.5">
              <p className="text-[13px] text-zinc-500">Note</p>
              <p className="mt-0.5 text-[15px]">{item.soldNote}</p>
            </div>
          )}
        </Section>
      )}

      {item.description && (
        <Section title="Description">
          <p className="max-w-[62ch] whitespace-pre-wrap py-1 text-[15px] leading-relaxed text-zinc-700">
            {normalizeText(item.description)}
          </p>
        </Section>
      )}

      <Section
        title="Listings"
        action={
          <Button size="sm" asChild>
            <Link href={`/listings/new?itemId=${item.id}`}>Add listing</Link>
          </Button>
        }
      >
        {item.listings?.length === 0 ? (
          <p className="py-2 text-[14px] text-zinc-500">Not listed anywhere yet.</p>
        ) : (
          <div>
            {item.listings?.map((listing: any) => {
              const hasFailed = listing.status === "FAILED";
              const retriesLeft = Math.max(0, MAX_PUBLISH_ATTEMPTS - (listing.publishAttempts ?? 0));
              const isRetrying = publishMutation.isPending && publishMutation.variables === listing.id;

              return (
                <div key={listing.id} className="border-b border-zinc-200 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[15px] font-medium text-zinc-900">{getMarketplaceLabel(listing.marketplace)}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[13px] text-zinc-500">
                      <span className="tabular-nums">{formatCurrency(Number(listing.price))}</span>
                      <span>{listing.status}</span>
                      {listing.externalUrl && (
                        <a
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 transition-colors hover:text-zinc-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {hasFailed && (
                    <div className="mt-2.5 border-l-2 border-red-400 bg-red-50/70 py-1.5 pl-2.5">
                      <div className="flex items-start gap-1.5 text-xs leading-snug text-red-700">
                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                        <span>{listing.syncError ?? "Publishing failed"}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-red-500">
                          {listing.publishAttempts ?? 0} of {MAX_PUBLISH_ATTEMPTS} attempts used
                        </span>
                        {retriesLeft > 0 ? (
                          <button
                            disabled={isRetrying}
                            onClick={() => publishMutation.mutate(listing.id)}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-red-700 hover:opacity-70 disabled:opacity-50"
                          >
                            <RotateCcw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
                            {isRetrying ? "Retrying…" : `Retry (${retriesLeft} left)`}
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-red-600">
                            No retries left — edit the listing to try again
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function normalizeText(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One ledger block: a small sentence-case label with an orange mark over a hairline, then rows. */
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pt-8">
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One label/value line in a ledger section, ruled like a receipt. */
function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-200 py-2.5 text-[15px] last:border-b-0">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <span className={cn("text-right font-medium text-zinc-900", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}
