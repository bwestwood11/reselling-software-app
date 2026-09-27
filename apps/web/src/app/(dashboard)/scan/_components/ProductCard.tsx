/* eslint-disable @next/next/no-img-element -- eBay CDN thumbnails; next/image would need every eBay host whitelisted */
import { ExternalLink, Loader2 } from "lucide-react";
import type { ScanEbayResult, ScanProduct } from "@repo/types";
import { cn } from "@repo/ui";
import { colorFor } from "@/lib/scanner/annotate";

export const usd = (n: number) => "$" + Math.round(n).toLocaleString();
const money = (n: number, cur?: string | null) =>
  (cur && cur !== "USD" ? cur + " " : "$") +
  Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

const POTENTIAL_STYLES: Record<string, string> = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{children}</p>
    </div>
  );
}

export function ProductCard({
  index,
  product: p,
  ebay,
  ebayPending,
}: {
  index: number;
  product: ScanProduct;
  ebay?: ScanEbayResult;
  ebayPending: boolean;
}) {
  const potential = p.resale_potential.toLowerCase();

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_36px_-30px_rgba(24,24,27,0.5)]">
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
          style={{ background: colorFor(index) }}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900">{p.name}</h3>
              <p className="text-xs text-zinc-500">
                {[p.brand, p.category].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-emerald-700">
                {usd(p.estimated_resale_low_usd)} – {usd(p.estimated_resale_high_usd)}
              </p>
              <p className="text-[11px] text-zinc-400">per unit</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Detail label="Model #">{p.model_number || <span className="text-zinc-400">—</span>}</Detail>
            <Detail label="Qty">{p.quantity}</Detail>
            <Detail label="Condition">
              <span className="capitalize">{p.condition}</span>
            </Detail>
            <Detail label="Potential">
              <span
                className={cn(
                  "inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                  POTENTIAL_STYLES[potential] ?? POTENTIAL_STYLES.low
                )}
              >
                {p.resale_potential}
              </span>
            </Detail>
            <Detail label="Sell on">{p.where_to_sell}</Detail>
            <Detail label="Confidence">{Math.round(p.confidence * 100)}%</Detail>
          </div>

          {p.notes && <p className="mt-3 text-xs leading-relaxed text-zinc-500">{p.notes}</p>}
        </div>
      </div>

      {(ebay || ebayPending) && (
        <div className="border-t border-zinc-100 bg-[#fbfaf8] px-5 py-4">
          {!ebay ? (
            <p className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
              Searching eBay…
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                {ebay.stats ? (
                  <span className="text-zinc-700">
                    eBay: <b>{ebay.stats.count}</b> listings,{" "}
                    {money(ebay.stats.low, ebay.stats.currency)} –{" "}
                    {money(ebay.stats.high, ebay.stats.currency)}, median{" "}
                    <b className="text-emerald-700">{money(ebay.stats.median, ebay.stats.currency)}</b>
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    {ebay.error || "No matching eBay listings found"}
                  </span>
                )}
                <span className="ml-auto flex gap-3">
                  <a
                    href={ebay.search_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700"
                  >
                    Active listings <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={ebay.sold_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700"
                  >
                    Sold listings <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </div>

              {ebay.listings.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {ebay.listings.map((l, j) => (
                    <a
                      key={j}
                      href={l.url}
                      target="_blank"
                      rel="noopener"
                      className="w-36 shrink-0 rounded-xl border border-zinc-200 bg-white p-2 text-xs transition-colors hover:border-orange-200"
                    >
                      {l.image && (
                        <img
                          src={l.image}
                          alt=""
                          loading="lazy"
                          className="h-24 w-full rounded-lg bg-white object-contain"
                        />
                      )}
                      <p className="mt-1.5 line-clamp-2 text-zinc-700">{l.title}</p>
                      <p className="mt-1">
                        <b className="text-emerald-700">
                          {l.price != null ? money(l.price, l.currency) : "—"}
                        </b>{" "}
                        <span className="text-zinc-400">{l.condition}</span>
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
