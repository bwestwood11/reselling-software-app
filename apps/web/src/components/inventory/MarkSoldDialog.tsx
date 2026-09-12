"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { getMarketplaceLabel } from "@repo/utils";
import type { MarketplaceType } from "@repo/types";
import { X, DollarSign, Store } from "lucide-react";

export interface MarkSoldValues {
  soldPrice: number;
  soldVia?: string | null;
  soldNote?: string | null;
  /** Listing ids the user explicitly chose to delist from their marketplace. */
  delistListingIds?: string[];
}

export interface ActiveListingOption {
  id: string;
  marketplace: MarketplaceType | string;
}

interface MarkSoldDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (values: MarkSoldValues) => void;
  isPending?: boolean;
  itemTitle?: string;
  /** Prefill the sale price (e.g. from the target/listing price). */
  defaultPrice?: number | null;
  /** Prefill the channel (e.g. the marketplace a listing sold on). */
  defaultChannel?: string | null;
  /** Prefill the note (e.g. when editing an existing sale). */
  defaultNote?: string | null;
  /** Hide the channel field (e.g. when the channel is fixed to a marketplace). */
  hideChannel?: boolean;
  /** Other still-active listings for this item — offered as an explicit delist choice, never assumed. */
  activeListings?: ActiveListingOption[];
}

export function MarkSoldDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  itemTitle,
  defaultPrice,
  defaultChannel,
  defaultNote,
  hideChannel,
  activeListings = [],
}: MarkSoldDialogProps) {
  const [price, setPrice] = useState("");
  const [channel, setChannel] = useState("");
  const [note, setNote] = useState("");
  const [delistIds, setDelistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPrice(defaultPrice != null ? String(defaultPrice) : "");
      setChannel(defaultChannel ?? "");
      setNote(defaultNote ?? "");
      // Default to delisting everywhere — selling one place rarely means the
      // rest should stay live — but every box stays a conscious, uncheckable choice.
      setDelistIds(new Set(activeListings.map((l) => l.id)));
    }
    // activeListings is derived from the item on every render; only reset off `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPrice, defaultChannel, defaultNote]);

  if (!open) return null;

  const parsedPrice = parseFloat(price);
  const priceValid = price.trim() !== "" && !Number.isNaN(parsedPrice) && parsedPrice >= 0;

  function toggleDelist(id: string) {
    setDelistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!priceValid) return;
    onConfirm({
      soldPrice: parsedPrice,
      soldVia: hideChannel ? undefined : channel.trim() || null,
      soldNote: note.trim() || null,
      delistListingIds: activeListings.length ? Array.from(delistIds) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Mark as sold</h2>
            {itemTitle && (
              <p className="mt-0.5 truncate text-sm text-zinc-500">{itemTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100"
            type="button"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sold-price">Sale price</Label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="sold-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-zinc-400">
              The actual amount received — used to calculate true revenue and profit.
            </p>
          </div>

          {!hideChannel && (
            <div className="space-y-1.5">
              <Label htmlFor="sold-channel">Sold via (optional)</Label>
              <Input
                id="sold-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. In person, Facebook, eBay"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sold-note">Note (optional)</Label>
            <Textarea
              id="sold-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Sold to a neighbor, paid cash"
              rows={2}
            />
          </div>

          {activeListings.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-orange-200 bg-orange-50/60 p-3">
              <Label className="flex items-center gap-1.5 text-zinc-800">
                <Store className="h-3.5 w-3.5" />
                Still live on {activeListings.length} platform{activeListings.length > 1 ? "s" : ""}
              </Label>
              <p className="text-xs text-zinc-500">
                Choose which listings to take down now, so it can't sell twice.
              </p>
              <div className="mt-1.5 space-y-1.5">
                {activeListings.map((listing) => (
                  <label
                    key={listing.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-zinc-700 hover:bg-white/70"
                  >
                    <input
                      type="checkbox"
                      checked={delistIds.has(listing.id)}
                      onChange={() => toggleDelist(listing.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-400"
                    />
                    Delist from {getMarketplaceLabel(listing.marketplace as MarketplaceType)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!priceValid || isPending}>
              {isPending ? "Saving…" : "Mark sold"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
