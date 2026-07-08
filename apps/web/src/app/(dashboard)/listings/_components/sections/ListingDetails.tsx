"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import type { FormValues } from "../listing-form-schema";
import { SectionHeader } from "../ui/SectionHeader";
import { Field } from "../ui/Field";

interface Props {
  form: UseFormReturn<FormValues>;
  isEbay: boolean;
}

export function ListingDetails({ form, isEbay }: Props) {
  const { register, formState: { errors } } = form;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="02" title="Listing Details" />
      <div className="mt-5 space-y-4">
        <Field label="Title *" error={errors.title?.message}>
          <Input
            placeholder="e.g. Nike Air Force 1 White Size 10"
            className="border-zinc-200 focus-visible:ring-orange-400"
            {...register("title")}
          />
          {isEbay && <p className="text-xs text-zinc-400">Max 80 characters for eBay.</p>}
        </Field>

        <Field label="Price (USD) *" error={errors.price?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="border-zinc-200 pl-7 focus-visible:ring-orange-400"
              {...register("price")}
            />
          </div>
        </Field>

        <Field label="Description">
          <Textarea
            rows={5}
            placeholder="Describe the item's condition, features, and any defects…"
            className="resize-none border-zinc-200 focus-visible:ring-orange-400"
            {...register("description")}
          />
        </Field>
      </div>
    </section>
  );
}
