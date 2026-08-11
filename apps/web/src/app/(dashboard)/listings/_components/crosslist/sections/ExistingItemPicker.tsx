"use client";

import type { UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import type { CrosslistFormValues, CrosslistFormInput } from "../crosslist-form-schema";
import type { CrossFill } from "../hooks/use-crosslist-form";
import { Field } from "../../ui/Field";

interface Props {
  form: UseFormReturn<CrosslistFormInput, any, CrosslistFormValues>;
  inventoryItems: any[];
  crossFillBanners: CrossFill[];
}

export function ExistingItemPicker({ form, inventoryItems, crossFillBanners }: Props) {
  const { watch, setValue, formState: { errors } } = form;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <Field label="Inventory Item *" error={errors.inventoryItemId?.message}>
        <Select
          value={watch("inventoryItemId") ?? ""}
          onValueChange={(val) => setValue("inventoryItemId", val)}
        >
          <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
            <SelectValue placeholder="Select an item from inventory…" />
          </SelectTrigger>
          <SelectContent className="bg-white text-zinc-900">
            {inventoryItems.length === 0 ? (
              <SelectItem value="_none" disabled>No inventory items found</SelectItem>
            ) : (
              inventoryItems.map((item: any) => (
                <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </Field>

      {crossFillBanners.length > 0 && (
        <div className="mt-3 space-y-1">
          {crossFillBanners.map((cf, i) => (
            <p key={i} className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {cf.fields.length > 0
                ? `${cf.fields.join(", ")} pre-filled from your ${cf.source} listing`
                : `Defaults pre-filled from your ${cf.source} listing`}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
