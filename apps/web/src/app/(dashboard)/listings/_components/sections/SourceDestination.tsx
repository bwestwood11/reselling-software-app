"use client";

import type { UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { getMarketplaceLabel } from "@repo/utils";
import type { FormValues, FormInput } from "../listing-form-schema";
import type { CrossFill } from "../hooks/use-listing-form";
import { SectionHeader } from "../ui/SectionHeader";
import { Field } from "../ui/Field";
import { InventoryItemCombobox } from "../ui/InventoryItemCombobox";

interface Props {
  form: UseFormReturn<FormInput, any, FormValues>;
  connections: any[];
  crossFill: CrossFill | null;
  lastAppliedItemRef: React.MutableRefObject<string | null>;
  /** Editing an existing listing — the item/marketplace it's tied to can't be changed here. */
  locked?: boolean;
}

export function SourceDestination({
  form,
  connections,
  crossFill,
  lastAppliedItemRef,
  locked,
}: Props) {
  const { watch, setValue, formState: { errors } } = form;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="01" title="Source & Destination" />
      <div className="mt-5 space-y-4">

        <Field label="Inventory Item *" error={errors.inventoryItemId?.message}>
          <InventoryItemCombobox
            value={watch("inventoryItemId")}
            disabled={locked}
            onChange={(val) => {
              // Reset the pre-fill guard so applyInventoryItem re-fires for the new item
              lastAppliedItemRef.current = null;
              setValue("inventoryItemId", val);
            }}
          />
        </Field>

        <Field label="Marketplace *" error={errors.marketplaceConnectionId?.message}>
          <Select
            value={watch("marketplaceConnectionId") ?? ""}
            disabled={locked}
            onValueChange={(val) => setValue("marketplaceConnectionId", val)}
          >
            <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
              <SelectValue placeholder="Select a marketplace…" />
            </SelectTrigger>
            <SelectContent className="bg-white text-zinc-900">
              {connections.length === 0 ? (
                <SelectItem value="_none" disabled>No marketplaces connected</SelectItem>
              ) : (
                connections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getMarketplaceLabel(c.marketplace)}
                    {c.accountName ? ` — ${c.accountName}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>

        {locked && (
          <p className="text-xs text-zinc-400">
            Fixing an existing listing — its item and marketplace can&apos;t be changed here.
          </p>
        )}

        {crossFill && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {crossFill.fields.length > 0
              ? `${crossFill.fields.join(", ")} pre-filled from your ${crossFill.source} listing`
              : `Defaults pre-filled from your ${crossFill.source} listing`}
          </p>
        )}
      </div>
    </section>
  );
}
