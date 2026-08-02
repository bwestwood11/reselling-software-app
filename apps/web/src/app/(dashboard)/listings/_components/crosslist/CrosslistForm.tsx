"use client";

import { Separator } from "@repo/ui";
import type { CrosslistFormProps } from "./crosslist-form-schema";
import { useCrosslistForm } from "./hooks/use-crosslist-form";
import { ItemModeToggle } from "./sections/ItemModeToggle";
import { ExistingItemPicker } from "./sections/ExistingItemPicker";
import { NewItemFields } from "./sections/NewItemFields";
import { MarketplaceMultiSelect } from "./sections/MarketplaceMultiSelect";
import { ResultsSummary } from "./sections/ResultsSummary";
import { CrosslistPreviewPanel } from "./sections/CrosslistPreviewPanel";
import { ListingDetails } from "../sections/ListingDetails";
import { EbaySettings } from "../sections/EbaySettings";
import { MercariSettings } from "../sections/MercariSettings";

export type { CrosslistFormProps };

export function CrosslistForm(props: CrosslistFormProps) {
  const cf = useCrosslistForm(props);
  const { form, handleSubmit } = cf;

  if (cf.results) {
    return (
      <div className="mx-auto max-w-2xl">
        <ResultsSummary results={cf.results} onCreateAnother={() => cf.setResults(null)} />
      </div>
    );
  }

  const selectedConnections = cf.selectedConnectionIds
    .map((id) => cf.connections.find((c: any) => c.id === id))
    .filter(Boolean);

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <ItemModeToggle itemMode={cf.itemMode} onChange={cf.setItemMode} />

        {cf.itemMode === "existing" ? (
          <ExistingItemPicker
            form={form}
            inventoryItems={cf.inventoryItems}
            crossFillBanners={cf.crossFillBanners}
          />
        ) : (
          <NewItemFields
            form={form}
            subscription={cf.subscription}
            images={cf.images}
            editOptions={cf.editOptions}
            toggleEditOption={cf.toggleEditOption}
            fileInputRef={cf.fileInputRef}
            dragOverIndex={cf.dragOverIndex}
            openPicker={cf.openPicker}
            onFilesSelected={cf.onFilesSelected}
            removeImage={cf.removeImage}
            addImageSlot={cf.addImageSlot}
            handleDragStart={cf.handleDragStart}
            handleDragOver={cf.handleDragOver}
            handleDrop={cf.handleDrop}
            handleDragEnd={cf.handleDragEnd}
            makePrimary={cf.makePrimary}
            filledImageCount={cf.filledImageCount}
            uploadingImages={cf.uploadingImages}
            isGeneratingDescription={cf.isGeneratingDescription}
            handleGenerateDescription={cf.handleGenerateDescription}
            MAX_IMAGES={cf.MAX_IMAGES}
          />
        )}

        <MarketplaceMultiSelect
          eligibleConnections={cf.eligibleConnections}
          selectedConnectionIds={cf.selectedConnectionIds}
          onToggle={cf.toggleConnection}
          existingListingsByMarketplace={cf.existingListingsByMarketplace}
        />

        <ListingDetails form={form as any} isEbay={cf.isEbay} />

        {cf.isMercari && (
          <MercariSettings
            form={form as any}
            mercariCat={cf.mercariCat}
            mercariShip={cf.mercariShip}
            mercariAddresses={cf.mercariAddresses}
            mercariAddressesLoading={cf.mercariAddressesLoading}
            refreshingAddresses={cf.refreshingAddresses}
            onRefreshAddresses={cf.handleRefreshAddresses}
          />
        )}

        {cf.isMercari && cf.isEbay && <Separator />}

        {cf.isEbay && (
          <EbaySettings
            form={form as any}
            ebay={cf.ebay}
            fulfillmentPolicies={cf.fulfillmentPolicies}
            paymentPolicies={cf.paymentPolicies}
            returnPolicies={cf.returnPolicies}
            policiesLoading={cf.policiesLoading}
            policiesError={cf.policiesError}
          />
        )}
      </div>

      <CrosslistPreviewPanel
        selectedItem={cf.selectedItem}
        selectedConnections={selectedConnections}
        isMercari={cf.isMercari}
        price={form.watch("price") || 0}
        mercariShip={cf.mercariShip}
        busy={cf.busy}
        isPublishing={cf.isPublishing}
        backgroundPublishing={cf.backgroundPublishing}
        onSaveDraft={handleSubmit((values) => cf.onSubmit(values, { publish: false }))}
        onSaveAndPublish={handleSubmit((values) => cf.onSubmit(values, { publish: true }))}
        onClose={cf.onClose}
      />
    </form>
  );
}
