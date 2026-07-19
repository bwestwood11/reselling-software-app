"use client";

import { Check, CheckCircle2 } from "lucide-react";
import { getMarketplaceLabel } from "@repo/utils";
import { SectionHeader } from "../../ui/SectionHeader";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft saved",
  PENDING: "Pending",
  ACTIVE: "Already posted",
};

interface Props {
  eligibleConnections: any[];
  selectedConnectionIds: string[];
  onToggle: (id: string) => void;
  existingListingsByMarketplace: Record<string, any>;
}

export function MarketplaceMultiSelect({
  eligibleConnections,
  selectedConnectionIds,
  onToggle,
  existingListingsByMarketplace,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="02" title="Marketplaces" />
      <p className="mt-1.5 text-xs text-zinc-500">
        Choose one or more connected marketplaces to publish this listing to at once.
      </p>

      <div className="mt-4 space-y-2">
        {eligibleConnections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400">
            No eBay or Mercari accounts connected yet. Connect one from Marketplaces settings.
          </p>
        ) : (
          eligibleConnections.map((c: any) => {
            const existing = existingListingsByMarketplace[c.marketplace];

            if (existing) {
              return (
                <div
                  key={c.id}
                  className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {getMarketplaceLabel(c.marketplace)}
                      </p>
                      <p className="text-xs text-emerald-700">
                        {STATUS_LABEL[existing.status] ?? existing.status}
                      </p>
                    </div>
                  </div>
                  {existing.externalUrl && (
                    <a
                      href={existing.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 underline underline-offset-2"
                    >
                      View
                    </a>
                  )}
                </div>
              );
            }

            const selected = selectedConnectionIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={[
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "border-orange-400 bg-orange-50 ring-1 ring-orange-200"
                    : "border-zinc-200 bg-white hover:border-zinc-300",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2",
                      selected ? "border-orange-500 bg-orange-500" : "border-zinc-300",
                    ].join(" ")}
                  >
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {getMarketplaceLabel(c.marketplace)}
                    </p>
                    {c.accountName && <p className="text-xs text-zinc-400">{c.accountName}</p>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
