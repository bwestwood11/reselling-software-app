"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Tag, X } from "lucide-react";
import {
  POSHMARK_DEPARTMENTS,
  POSHMARK_COLORS,
  POSHMARK_CONDITION_OPTIONS,
  POSHMARK_SHIPPING_DISCOUNTS,
  POSHMARK_CONDITION_MAP,
} from "@/lib/poshmark/data";
import type { usePoshmarkFields } from "../hooks/use-poshmark-fields";
import { SectionHeader } from "../ui/SectionHeader";
import { Field } from "../ui/Field";

interface Props {
  // Shared by the single-listing form (listing-form-schema) and the crosslist form
  // (crosslist-form-schema) — both declare the same poshmark* fields, so this is typed loosely
  // rather than importing either schema's concrete form type.
  form: UseFormReturn<any, any, any>;
  poshmark: ReturnType<typeof usePoshmarkFields>;
  selectedItem?: { condition?: string; brand?: string } | null;
}

export function PoshmarkSettings({ form, poshmark, selectedItem }: Props) {
  const { register, setValue, watch } = form;

  const condition = watch("poshmarkCondition");
  const brand = watch("poshmarkBrand");

  // Seed condition/brand from the inventory item. These must land in form state, not just in the
  // input's defaultValue — buildPoshmarkMarketplaceData reads form values, so a field the user
  // never touches would otherwise be dropped from the payload.
  useEffect(() => {
    if (condition) return;
    const mapped = selectedItem?.condition
      ? (POSHMARK_CONDITION_MAP[selectedItem.condition] ?? "good")
      : "good";
    setValue("poshmarkCondition", mapped);
  }, [selectedItem?.condition, condition, setValue]);

  useEffect(() => {
    if (brand || !selectedItem?.brand) return;
    setValue("poshmarkBrand", selectedItem.brand);
  }, [selectedItem?.brand, brand, setValue]);

  // Poshmark requires a shipping-discount choice; "no_discount" is the neutral default.
  const shippingDiscount = watch("poshmarkShippingDiscount");
  useEffect(() => {
    if (!shippingDiscount) setValue("poshmarkShippingDiscount", "no_discount");
  }, [shippingDiscount, setValue]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="03" title="Poshmark Settings">
        <span className="ml-2 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          Poshmark
        </span>
      </SectionHeader>

      <div className="mt-5 space-y-5">
        {/* ── Category ── */}
        <Field label="Category *">
          <div className="space-y-2">
            <Select
              value={poshmark.poshmarkDeptId}
              onValueChange={(val) => {
                poshmark.setPoshmarkDeptId(val);
                poshmark.setPoshmarkCatId("");
                poshmark.setPoshmarkSubcatId("");
                setValue("poshmarkDepartmentId", val);
                setValue("poshmarkCategoryId", "");
                setValue("poshmarkSubcategoryId", "");
                setValue("poshmarkSizeId", "");
              }}
            >
              <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
                <SelectValue placeholder="Select department…" />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-900">
                {POSHMARK_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {poshmark.selectedPoshmarkDept && (
              <Select
                value={poshmark.poshmarkCatId}
                onValueChange={(val) => {
                  poshmark.setPoshmarkCatId(val);
                  poshmark.setPoshmarkSubcatId("");
                  setValue("poshmarkCategoryId", val);
                  setValue("poshmarkSubcategoryId", "");
                  setValue("poshmarkSizeId", "");
                }}
              >
                <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent className="bg-white text-zinc-900">
                  {poshmark.selectedPoshmarkDept.categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {poshmark.selectedPoshmarkCat &&
              poshmark.selectedPoshmarkCat.subcategories.length > 0 && (
                <Select
                  value={poshmark.poshmarkSubcatId}
                  onValueChange={(val) => {
                    poshmark.setPoshmarkSubcatId(val);
                    setValue("poshmarkSubcategoryId", val);
                    setValue("poshmarkSizeId", "");
                  }}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
                    <SelectValue placeholder="Select subcategory (optional)…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900">
                    {poshmark.selectedPoshmarkCat.subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

            {poshmark.poshmarkCategoryPath && (
              <p className="text-xs text-zinc-400">{poshmark.poshmarkCategoryPath}</p>
            )}
          </div>
        </Field>

        {/* ── Condition ── */}
        <Field label="Condition *">
          <Select
            value={condition ?? ""}
            onValueChange={(val) => setValue("poshmarkCondition", val)}
          >
            <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
              <SelectValue placeholder="Select condition…" />
            </SelectTrigger>
            <SelectContent className="bg-white text-zinc-900">
              {POSHMARK_CONDITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* ── Brand ── */}
        <Field label="Brand">
          <Input
            placeholder="e.g. Nike, Levi's…"
            className="border-zinc-200 focus-visible:ring-red-400"
            {...register("poshmarkBrand")}
          />
        </Field>

        {/* ── Size ── */}
        {poshmark.poshmarkSizes.length > 0 && (
          <Field label="Size">
            <Select
              value={watch("poshmarkSizeId") ?? ""}
              onValueChange={(val) => setValue("poshmarkSizeId", val)}
            >
              <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
                <SelectValue placeholder="Select size…" />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-900">
                {poshmark.poshmarkSizes.map((sz) => (
                  <SelectItem key={sz.id} value={sz.id}>
                    {sz.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {/* ── Colors (up to 2) ── */}
        <Field label="Colors (up to 2)">
          <div className="flex flex-wrap gap-2">
            {POSHMARK_COLORS.map((color) => {
              const selected = poshmark.poshmarkColors.includes(color.name);
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => poshmark.togglePoshmarkColor(color.name)}
                  className={[
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                  ].join(" ")}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-zinc-200"
                    style={{ backgroundColor: color.rgb }}
                  />
                  {color.display}
                </button>
              );
            })}
          </div>
          {poshmark.poshmarkColors.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              Selected: {poshmark.poshmarkColors.join(", ")}
            </p>
          )}
        </Field>

        {/* ── Style Tags (up to 3) ── */}
        <Field label="Style Tags (up to 3)">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={poshmark.poshmarkTagInput}
                  onChange={(e) => poshmark.setPoshmarkTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      poshmark.addPoshmarkTag();
                    }
                  }}
                  placeholder="Type a tag and press Enter…"
                  className="border-zinc-200 pl-9 focus-visible:ring-red-400"
                  disabled={poshmark.poshmarkStyleTags.length >= poshmark.MAX_STYLE_TAGS}
                />
              </div>
              <button
                type="button"
                onClick={poshmark.addPoshmarkTag}
                disabled={
                  poshmark.poshmarkStyleTags.length >= poshmark.MAX_STYLE_TAGS ||
                  !poshmark.poshmarkTagInput.trim()
                }
                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {poshmark.poshmarkStyleTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {poshmark.poshmarkStyleTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => poshmark.removePoshmarkTag(tag)}
                      className="rounded-full p-0.5 hover:bg-red-200"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* ── Original Price ── */}
        <Field label="Original Price (optional)">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="What you paid for it"
              className="border-zinc-200 pl-7 focus-visible:ring-red-400"
              {...register("poshmarkOriginalPrice")}
            />
          </div>
          <p className="text-xs text-zinc-400">Shown to buyers as original price.</p>
        </Field>

        {/* ── Shipping Discount ── */}
        <Field label="Shipping Discount">
          <Select
            value={shippingDiscount ?? "no_discount"}
            onValueChange={(val) => setValue("poshmarkShippingDiscount", val)}
          >
            <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
              <SelectValue placeholder="Select discount…" />
            </SelectTrigger>
            <SelectContent className="bg-white text-zinc-900">
              {POSHMARK_SHIPPING_DISCOUNTS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-400">
            Discounted shipping is deducted from your earnings.
          </p>
        </Field>
      </div>
    </section>
  );
}
