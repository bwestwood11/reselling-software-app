"use client";

import { Loader2, Tag } from "lucide-react";
import type { useMercariShipping } from "../hooks/use-mercari-shipping";

type MercariShipState = ReturnType<typeof useMercariShipping>;

interface Props {
  selectedItem: any;
  isMercari: boolean;
  isEbay: boolean;
  price: number;
  mercariShip: MercariShipState;
  busy: boolean;
  isPublishing: boolean;
  isSubmitting: boolean;
  isPending: boolean;
  selectedConnectionId: string;
  onSaveDraft: () => void;
  onSaveAndPublish: () => void;
  onClose: () => void;
}

export function PreviewPanel({
  selectedItem,
  isMercari,
  isEbay,
  price,
  mercariShip,
  busy,
  isPublishing,
  isSubmitting,
  isPending,
  selectedConnectionId,
  onSaveDraft,
  onSaveAndPublish,
  onClose,
}: Props) {
  return (
    <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      {/* Item preview */}
      {selectedItem && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Selected Item
          </p>
          {selectedItem.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedItem.images[0].url}
              alt={selectedItem.title}
              className="mb-3 h-40 w-full rounded-xl object-cover"
            />
          )}
          <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{selectedItem.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedItem.brand && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {selectedItem.brand}
              </span>
            )}
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {selectedItem.condition?.replace(/_/g, " ")}
            </span>
          </div>
        </section>
      )}

      {/* Mercari fee breakdown */}
      {isMercari && (() => {
        const priceInCents = Math.round(price * 100);
        if (priceInCents <= 0) return null;
        const buyerPaysShipping =
          mercariShip.mercariShipMethod === "PREPAID" && mercariShip.mercariShippingPayerId === 1;
        const shippingCostInCents =
          buyerPaysShipping && typeof mercariShip.mercariSelectedCarrier?.fee === "number"
            ? mercariShip.mercariSelectedCarrier.fee
            : 0;
        const salesFeeInCents = Math.floor((priceInCents + shippingCostInCents) * 0.1);
        const earningsInCents =
          priceInCents -
          salesFeeInCents +
          (mercariShip.mercariShipMethod === "PREPAID" && mercariShip.mercariShippingPayerId === 2
            ? -(mercariShip.mercariSelectedCarrier?.fee ?? 0)
            : 0);
        const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
        return (
          <section className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-400">
              Fee Breakdown
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-700">
                <span>Listing price</span>
                <span className="font-medium">{fmt(priceInCents)}</span>
              </div>
              {buyerPaysShipping && shippingCostInCents > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>+ Buyer shipping</span>
                  <span>{fmt(shippingCostInCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-red-600">
                <span>Mercari fee (10%)</span>
                <span className="font-medium">−{fmt(salesFeeInCents)}</span>
              </div>
              {mercariShip.mercariShipMethod === "PREPAID" &&
                mercariShip.mercariShippingPayerId === 2 &&
                typeof mercariShip.mercariSelectedCarrier?.fee === "number" && (
                  <div className="flex justify-between text-zinc-500">
                    <span>− Shipping label</span>
                    <span>−{fmt(mercariShip.mercariSelectedCarrier.fee)}</span>
                  </div>
                )}
              <div className="mt-1 flex justify-between border-t border-red-100 pt-2 font-semibold text-zinc-900">
                <span>Your earnings</span>
                <span className={earningsInCents < 0 ? "text-red-600" : "text-emerald-700"}>
                  {fmt(Math.max(0, earningsInCents))}
                </span>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Actions */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Actions</p>
        <div className="space-y-2">
          {isEbay ? (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveAndPublish}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              <Tag className="h-4 w-4" />
              Save &amp; Publish to eBay
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !selectedConnectionId}
              onClick={onSaveDraft}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
            >
              {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Listing
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onSaveDraft}
            className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
          >
            {isSubmitting && !isPublishing && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save as Draft
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
