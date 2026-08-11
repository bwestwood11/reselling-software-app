"use client";

import type { CreateListingFormProps } from "./listing-form-schema";
import { useListingForm } from "./hooks/use-listing-form";
import { SourceDestination } from "./sections/SourceDestination";
import { ListingDetails } from "./sections/ListingDetails";
import { EbaySettings } from "./sections/EbaySettings";
import { MercariSettings } from "./sections/MercariSettings";
import { PoshmarkSettings } from "./sections/PoshmarkSettings";
import { PreviewPanel } from "./sections/PreviewPanel";

export type { CreateListingFormProps };

export function CreateListingForm(props: CreateListingFormProps) {
  const lf = useListingForm(props);
  const { form, handleSubmit } = lf;
  const { formState: { isSubmitting } } = form;

  return (
    <>
      {/* ── Dev debug panel ─────────────────────────────────────────────────── */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 font-mono text-[11px] text-amber-900">
          <p className="mb-1.5 font-bold">🐛 ListingForm debug</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-amber-600">defaultConnectionId</span>
            <span>{props.defaultConnectionId ?? "—"}</span>
            <span className="text-amber-600">marketplaceConnectionId</span>
            <span>{form.watch("marketplaceConnectionId") || "—"}</span>
            <span className="text-amber-600">connections loaded</span>
            <span>{lf.connections.length}</span>
            <span className="text-amber-600">selectedConnection</span>
            <span>{lf.selectedConnection?.marketplace ?? "—"}</span>
            <span className="text-amber-600">inventoryItemId</span>
            <span>{form.watch("inventoryItemId") || "—"}</span>
            <span className="text-amber-600">itemDetail</span>
            <span>{lf.itemDetail?.id ?? "loading…"}</span>
            <span className="text-amber-600">lastApplied</span>
            <span>{lf.lastAppliedItemRef.current ?? "—"}</span>
            <span className="text-amber-600">crossFill</span>
            <span>{lf.crossFill ? `${lf.crossFill.source}: [${lf.crossFill.fields.join(", ")}]` : "—"}</span>
          </div>
        </div>
      )}

      <form className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <SourceDestination
            form={form}
            connections={lf.connections}
            inventoryItems={lf.inventoryItems}
            crossFill={lf.crossFill}
            lastAppliedItemRef={lf.lastAppliedItemRef}
          />

          <ListingDetails form={form} isEbay={lf.isEbay} />

          {lf.isMercari && (
            <MercariSettings
              form={form}
              mercariCat={lf.mercariCat}
              mercariShip={lf.mercariShip}
              mercariAddresses={lf.mercariAddresses}
              mercariAddressesLoading={lf.mercariAddressesLoading}
              refreshingAddresses={lf.refreshingAddresses}
              onRefreshAddresses={lf.handleRefreshAddresses}
            />
          )}

          {lf.isEbay && (
            <EbaySettings
              form={form}
              ebay={lf.ebay}
              fulfillmentPolicies={lf.fulfillmentPolicies}
              paymentPolicies={lf.paymentPolicies}
              returnPolicies={lf.returnPolicies}
              policiesLoading={lf.policiesLoading}
              policiesError={lf.policiesError}
            />
          )}

          {lf.isPoshmark && (
            <PoshmarkSettings form={form} poshmark={lf.poshmark} selectedItem={lf.selectedItem} />
          )}
        </div>

        <PreviewPanel
          selectedItem={lf.selectedItem}
          isMercari={lf.isMercari}
          isEbay={lf.isEbay}
          price={Number(form.watch("price")) || 0}
          mercariShip={lf.mercariShip}
          busy={lf.busy}
          isPublishing={lf.isPublishing}
          isSubmitting={isSubmitting}
          isPending={false}
          selectedConnectionId={lf.selectedConnectionId}
          onSaveDraft={handleSubmit(lf.onSaveDraft)}
          onSaveAndPublish={handleSubmit(lf.onSaveAndPublish)}
          onClose={lf.onClose}
        />
      </form>
    </>
  );
}
