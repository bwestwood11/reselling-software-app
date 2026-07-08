"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ChevronRight, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { marketplacesApi } from "@/lib/api";
import type { FormValues } from "../listing-form-schema";
import { EBAY_CONDITIONS } from "../listing-form-schema";
import type { useEbayCategories } from "../hooks/use-ebay-categories";
import { SectionHeader } from "../ui/SectionHeader";
import { Field } from "../ui/Field";
import { AspectRow } from "../ui/AspectRow";
import { NoPoliciesNotice } from "../ui/NoPoliciesNotice";

type EbayState = ReturnType<typeof useEbayCategories>;

interface Props {
  form: UseFormReturn<FormValues>;
  ebay: EbayState;
  fulfillmentPolicies: any[];
  paymentPolicies: any[];
  returnPolicies: any[];
  policiesLoading: boolean;
  policiesError: unknown;
}

export function EbaySettings({
  form,
  ebay,
  fulfillmentPolicies,
  paymentPolicies,
  returnPolicies,
  policiesLoading,
  policiesError,
}: Props) {
  const { watch, setValue } = form;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="03" title="eBay Settings">
        <span className="ml-2 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
          Required for eBay
        </span>
      </SectionHeader>

      <div className="mt-5 space-y-5">
        {/* Category */}
        <Field label="Category *">
          <div ref={ebay.categoryRef} className="relative">
            {ebay.selectedCategory ? (
              <div className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {ebay.selectedCategory.breadcrumb.split(" › ").pop()}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{ebay.selectedCategory.breadcrumb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => ebay.clearCategory((id) => setValue("ebayCategoryId", id))}
                  className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={ebay.categoryQuery}
                  onChange={(e) => {
                    ebay.setCategoryQuery(e.target.value);
                    ebay.searchCategories(e.target.value);
                  }}
                  onFocus={() => {
                    if (ebay.categoryResults.length > 0) ebay.setShowCategoryDropdown(true);
                  }}
                  placeholder="Search eBay categories…"
                  className="border-zinc-200 pl-9 focus-visible:ring-orange-400"
                />
                {ebay.categorySearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />
                )}
              </div>
            )}

            {ebay.showCategoryDropdown && ebay.categoryResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                <ul className="max-h-64 overflow-y-auto py-1">
                  {ebay.categoryResults.map((cat: any) => (
                    <li key={cat.categoryId}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          await ebay.selectCategory(cat, (id) => setValue("ebayCategoryId", id));
                        }}
                        className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-orange-50"
                      >
                        <span className="text-sm font-medium text-zinc-900">{cat.categoryName}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                          {cat.breadcrumb
                            .split(" › ")
                            .slice(0, -1)
                            .map((crumb: string, i: number, arr: string[]) => (
                              <span key={i} className="flex items-center gap-1">
                                {crumb}
                                {i < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                              </span>
                            ))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ebay.showCategoryDropdown &&
              !ebay.categorySearching &&
              ebay.categoryQuery &&
              ebay.categoryResults.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-500 shadow-lg">
                  No categories found for &ldquo;{ebay.categoryQuery}&rdquo;
                </div>
              )}
          </div>
        </Field>

        {/* Condition */}
        <Field label="Condition *">
          <Select
            value={watch("ebayConditionId") ?? ""}
            onValueChange={(val) => setValue("ebayConditionId", val)}
          >
            <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
              <SelectValue placeholder="Select condition…" />
            </SelectTrigger>
            <SelectContent className="bg-white text-zinc-900">
              {EBAY_CONDITIONS.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Policies */}
        {policiesLoading ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            Loading your eBay business policies…
          </div>
        ) : policiesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
            <p className="font-semibold text-red-700">Could not load eBay policies</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Fulfillment Policy *">
              {fulfillmentPolicies.length === 0 ? (
                <NoPoliciesNotice type="fulfillment" />
              ) : (
                <Select onValueChange={(val) => setValue("ebayFulfillmentPolicyId", val)}>
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
                    <SelectValue placeholder="Select fulfillment policy…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900">
                    {fulfillmentPolicies.map((p: any) => (
                      <SelectItem key={p.fulfillmentPolicyId} value={p.fulfillmentPolicyId}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Payment Policy *">
              {paymentPolicies.length === 0 ? (
                <NoPoliciesNotice type="payment" />
              ) : (
                <Select onValueChange={(val) => setValue("ebayPaymentPolicyId", val)}>
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
                    <SelectValue placeholder="Select payment policy…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900">
                    {paymentPolicies.map((p: any) => (
                      <SelectItem key={p.paymentPolicyId} value={p.paymentPolicyId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Return Policy *">
              {returnPolicies.length === 0 ? (
                <NoPoliciesNotice type="return" />
              ) : (
                <Select onValueChange={(val) => setValue("ebayReturnPolicyId", val)}>
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
                    <SelectValue placeholder="Select return policy…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900">
                    {returnPolicies.map((p: any) => (
                      <SelectItem key={p.returnPolicyId} value={p.returnPolicyId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
        )}

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Item Location">
            <Input
              placeholder="e.g. Los Angeles, CA"
              className="border-zinc-200 focus-visible:ring-orange-400"
              {...form.register("ebayLocation")}
            />
          </Field>
          <Field label="Postal Code">
            <Input
              placeholder="e.g. 90210"
              className="border-zinc-200 focus-visible:ring-orange-400"
              {...form.register("ebayPostalCode")}
            />
          </Field>
        </div>

        {/* Package weight — used for eBay's calculated shipping, and shared with other
            marketplaces (e.g. pre-fills Mercari's package weight when listing there next) */}
        <Field label="Package Weight (lbs)">
          <Input
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 1.5"
            className="border-zinc-200 focus-visible:ring-orange-400"
            {...form.register("ebayWeightLbs")}
          />
        </Field>

        {/* Item specifics */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Item Specifics
            </span>
            {ebay.selectedCategory && !ebay.aspectsLoading && ebay.aspects.length > 0 && (
              <span className="text-xs text-zinc-400">
                {ebay.aspects.filter((a) => a.required).length} required ·{" "}
                {ebay.aspects.filter((a) => !a.required).length} optional
              </span>
            )}
          </div>

          {!ebay.selectedCategory ? (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400">
              Select a category above to load required item specifics.
            </p>
          ) : ebay.aspectsLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Loading item specifics…
            </div>
          ) : ebay.aspectsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {ebay.aspectsError}
            </div>
          ) : (
            <div className="space-y-4">
              {ebay.aspects.length === 0 && (
                <p className="text-xs text-zinc-400">
                  No standard specifics for this category. Add manually below.
                </p>
              )}

              {/* Required specifics */}
              {(() => {
                const required = ebay.aspects.filter((a) => a.required);
                if (required.length === 0) return null;
                const allFilled = required.every((a) => ebay.resolvedSpecificValue(a.name).trim());
                return (
                  <div
                    className={[
                      "rounded-xl border p-4 transition-colors",
                      allFilled
                        ? "border-emerald-100 bg-emerald-50/40"
                        : "border-orange-100 bg-orange-50/40",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "mb-3 flex items-center gap-1.5 text-xs font-semibold",
                        allFilled ? "text-emerald-700" : "text-orange-700",
                      ].join(" ")}
                    >
                      {allFilled ? (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">
                          {required.filter((a) => !ebay.resolvedSpecificValue(a.name).trim()).length}
                        </span>
                      )}
                      {allFilled
                        ? "All required fields complete"
                        : "Required by eBay for this category"}
                    </p>
                    <div className="space-y-2.5">
                      {required.map((aspect) => (
                        <AspectRow
                          key={aspect.name}
                          aspect={aspect}
                          value={ebay.specificValues[aspect.name] ?? ""}
                          customValue={ebay.specificValues[`${aspect.name}__custom`] ?? ""}
                          onChange={(val) =>
                            ebay.setSpecificValues((prev) => ({ ...prev, [aspect.name]: val }))
                          }
                          onCustomChange={(val) =>
                            ebay.setSpecificValues((prev) => ({
                              ...prev,
                              [`${aspect.name}__custom`]: val,
                            }))
                          }
                          showEmpty
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Optional specifics */}
              {ebay.aspects.filter((a) => !a.required).length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Optional — improves search visibility
                  </p>
                  <div className="space-y-2">
                    {ebay.aspects
                      .filter((a) => !a.required)
                      .map((aspect) => (
                        <AspectRow
                          key={aspect.name}
                          aspect={aspect}
                          value={ebay.specificValues[aspect.name] ?? ""}
                          customValue={ebay.specificValues[`${aspect.name}__custom`] ?? ""}
                          onChange={(val) =>
                            ebay.setSpecificValues((prev) => ({ ...prev, [aspect.name]: val }))
                          }
                          onCustomChange={(val) =>
                            ebay.setSpecificValues((prev) => ({
                              ...prev,
                              [`${aspect.name}__custom`]: val,
                            }))
                          }
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Extra (custom) specifics */}
              {ebay.extraSpecifics.length > 0 && (
                <div className="space-y-2">
                  {ebay.extraSpecifics.map((spec, i) => (
                    <div key={`extra-${i}`} className="flex gap-2">
                      <Input
                        value={spec.name}
                        onChange={(e) => {
                          const u = [...ebay.extraSpecifics];
                          u[i] = { ...u[i]!, name: e.target.value };
                          ebay.setExtraSpecifics(u);
                        }}
                        placeholder="Attribute name"
                        className="w-40 shrink-0 border-zinc-200 focus-visible:ring-orange-400"
                      />
                      <Input
                        value={spec.value}
                        onChange={(e) => {
                          const u = [...ebay.extraSpecifics];
                          u[i] = { ...u[i]!, value: e.target.value };
                          ebay.setExtraSpecifics(u);
                        }}
                        placeholder="Value"
                        className="flex-1 border-zinc-200 focus-visible:ring-orange-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          ebay.setExtraSpecifics(ebay.extraSpecifics.filter((_, j) => j !== i))
                        }
                        className="shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:border-red-200 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  ebay.setExtraSpecifics([...ebay.extraSpecifics, { name: "", value: "" }])
                }
                className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Add custom specific
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
