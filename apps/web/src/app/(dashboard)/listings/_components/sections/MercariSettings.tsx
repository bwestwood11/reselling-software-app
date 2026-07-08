"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ChevronRight, Loader2, RefreshCw, Search, X } from "lucide-react";
import { getMercariSizes, MERCARI_SIZE_SCHEMAS } from "@repo/types";
import { MercariBrandCombobox } from "@/components/ui/mercari-brand-combobox";
import type { FormValues } from "../listing-form-schema";
import type { useMercariCategories } from "../hooks/use-mercari-categories";
import type { useMercariShipping } from "../hooks/use-mercari-shipping";
import type { MercariAddress } from "../hooks/use-listing-form";
import { SectionHeader } from "../ui/SectionHeader";
import { Field } from "../ui/Field";

type MercariCatState = ReturnType<typeof useMercariCategories>;
type MercariShipState = ReturnType<typeof useMercariShipping>;

interface Props {
  form: UseFormReturn<FormValues>;
  mercariCat: MercariCatState;
  mercariShip: MercariShipState;
  mercariAddresses: MercariAddress[];
  mercariAddressesLoading: boolean;
  refreshingAddresses: boolean;
  onRefreshAddresses: () => void;
}

export function MercariSettings({
  form,
  mercariCat,
  mercariShip,
  mercariAddresses,
  mercariAddressesLoading,
  refreshingAddresses,
  onRefreshAddresses,
}: Props) {
  const { watch, setValue } = form;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="03" title="Mercari Settings">
        <span className="ml-2 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          Mercari
        </span>
      </SectionHeader>

      <div className="mt-5">
        {/* Category */}
        <Field label="Category">
          {mercariCat.selectedMercariCat ? (
            <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {mercariCat.selectedMercariCat.label}
                </p>
                <p className="truncate text-xs text-zinc-400">
                  {mercariCat.selectedMercariCat.fullPath.join(" › ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  mercariCat.clearCategory();
                  setValue("mercariCategoryId", "");
                  setValue("mercariSizeId", undefined);
                }}
                className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={mercariCat.mercariSearch}
                  onChange={(e) => {
                    mercariCat.setMercariSearch(e.target.value);
                    mercariCat.searchCategories(e.target.value);
                  }}
                  placeholder="Search categories…"
                  className="border-zinc-200 pl-9 focus-visible:ring-red-400"
                />
                {mercariCat.mercariSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-red-500" />
                )}
              </div>

              {mercariCat.mercariSearch.trim() ? (
                <div className="rounded-xl border border-zinc-200 bg-white">
                  {mercariCat.mercariSearchResults.length === 0 && !mercariCat.mercariSearching ? (
                    <p className="px-3 py-3 text-xs text-zinc-400">
                      No categories found for &ldquo;{mercariCat.mercariSearch}&rdquo;
                    </p>
                  ) : (
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {mercariCat.mercariSearchResults.map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              mercariCat.setSelectedMercariCat(cat);
                              setValue("mercariCategoryId", cat.id);
                              setValue("mercariSizeId", undefined);
                              mercariCat.setMercariSearch("");
                            }}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-red-50"
                          >
                            <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                            <span className="text-xs text-zinc-400">
                              {cat.fullPath.join(" › ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white">
                  {mercariCat.mercariStack.length > 0 && (
                    <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                      <button
                        type="button"
                        onClick={() => mercariCat.goBack(0)}
                        className="hover:text-zinc-900"
                      >
                        All
                      </button>
                      {mercariCat.mercariStack.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          <button
                            type="button"
                            onClick={() => mercariCat.goBack(i + 1)}
                            className="hover:text-zinc-900"
                          >
                            {crumb.label}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {mercariCat.mercariLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      Loading…
                    </div>
                  ) : mercariCat.mercariChildren.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-zinc-400">No categories found.</p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {mercariCat.mercariChildren.map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (cat.hasChildren) {
                                mercariCat.drillInto(cat);
                              } else {
                                mercariCat.setSelectedMercariCat(cat);
                                setValue("mercariCategoryId", cat.id);
                                setValue("mercariSizeId", undefined);
                              }
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-red-50"
                          >
                            <span className="text-sm text-zinc-900">{cat.label}</span>
                            {cat.hasChildren && (
                              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </Field>

        {/* Size (only if category requires it) */}
        {mercariCat.selectedMercariCat?.isSizeRequired && (() => {
          const sizeOptions = getMercariSizes(mercariCat.selectedMercariCat.sizeSchemaId);
          const schemaLabel = mercariCat.selectedMercariCat.sizeSchemaId
            ? (MERCARI_SIZE_SCHEMAS[mercariCat.selectedMercariCat.sizeSchemaId]?.label ??
              mercariCat.selectedMercariCat.sizeSchemaId)
            : "";
          return (
            <div className="mt-5">
              <Field label="Size *">
                <Select
                  value={watch("mercariSizeId")?.toString() ?? ""}
                  onValueChange={(val) => setValue("mercariSizeId", Number(val))}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-red-400">
                    <SelectValue placeholder="Select a size…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900">
                    {sizeOptions.map((opt) => (
                      <SelectItem key={opt.id} value={String(opt.id)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schemaLabel && <p className="text-xs text-zinc-400">{schemaLabel}</p>}
              </Field>
            </div>
          );
        })()}

        {/* Brand & Address */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Brand">
            <MercariBrandCombobox
              value={watch("mercariBrandId")}
              onChange={(id) => setValue("mercariBrandId", id)}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-500">Shipping Address</Label>
              <button
                type="button"
                onClick={onRefreshAddresses}
                disabled={refreshingAddresses}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                <RefreshCw size={11} className={refreshingAddresses ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            <Select
              value={watch("mercariAddressId") ? String(watch("mercariAddressId")) : ""}
              onValueChange={(val) => {
                const addr = mercariAddresses.find((a) => String(a.id) === val);
                if (addr) {
                  setValue("mercariAddressId", addr.id);
                  setValue("mercariZipCode", addr.zipCode1);
                }
              }}
            >
              <SelectTrigger className="border-zinc-200 focus:ring-red-400">
                <SelectValue
                  placeholder={
                    mercariAddressesLoading
                      ? "Loading…"
                      : mercariAddresses.length === 0
                      ? "No addresses — refresh"
                      : "Select address"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {mercariAddresses.map((addr) => (
                  <SelectItem key={addr.id} value={String(addr.id)}>
                    {addr.address1}
                    {addr.address2 ? ` ${addr.address2}` : ""}, {addr.city},{" "}
                    {addr.stateAbbreviation} {addr.zipCode1}
                    {addr.isDefault ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Shipping method */}
        <div className="mt-5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Shipping Method
          </Label>
          <div className="mt-1.5 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            {(["SOYO", "PREPAID"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  m === "PREPAID"
                    ? mercariShip.setMercariShipMethod("PREPAID")
                    : mercariShip.resetShipping()
                }
                className={[
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                  mercariShip.mercariShipMethod === m
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700",
                ].join(" ")}
              >
                {m === "SOYO" ? "Ship on Your Own" : "Prepaid Label"}
              </button>
            ))}
          </div>

          {mercariShip.mercariShipMethod === "PREPAID" && (
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Who Pays Shipping?
                </Label>
                <div className="mt-1.5 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  {([1, 2] as const).map((payerId) => (
                    <button
                      key={payerId}
                      type="button"
                      onClick={() => mercariShip.setMercariShippingPayerId(payerId)}
                      className={[
                        "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                        mercariShip.mercariShippingPayerId === payerId
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-700",
                      ].join(" ")}
                    >
                      {payerId === 1 ? "Buyer Pays" : "Seller Pays"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Package Weight *
                </Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min="0" placeholder="0"
                      value={mercariShip.mercariWeightLb}
                      onChange={(e) => mercariShip.setMercariWeightLb(e.target.value)}
                      className="w-20 border-zinc-200 text-center focus-visible:ring-red-400"
                    />
                    <span className="text-xs text-zinc-500">lb</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min="0" step="0.1" placeholder="0"
                      value={mercariShip.mercariWeightOz}
                      onChange={(e) => mercariShip.setMercariWeightOz(e.target.value)}
                      className="w-20 border-zinc-200 text-center focus-visible:ring-red-400"
                    />
                    <span className="text-xs text-zinc-500">oz</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Dimensions (inches) — optional
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input type="number" min="0" step="0.1" placeholder="L" value={mercariShip.mercariDimL} onChange={(e) => mercariShip.setMercariDimL(e.target.value)} className="w-16 border-zinc-200 text-center focus-visible:ring-red-400" />
                  <span className="text-xs text-zinc-400">×</span>
                  <Input type="number" min="0" step="0.1" placeholder="W" value={mercariShip.mercariDimW} onChange={(e) => mercariShip.setMercariDimW(e.target.value)} className="w-16 border-zinc-200 text-center focus-visible:ring-red-400" />
                  <span className="text-xs text-zinc-400">×</span>
                  <Input type="number" min="0" step="0.1" placeholder="H" value={mercariShip.mercariDimH} onChange={(e) => mercariShip.setMercariDimH(e.target.value)} className="w-16 border-zinc-200 text-center focus-visible:ring-red-400" />
                </div>
              </div>

              {/* Carriers */}
              {mercariShip.mercariCarriersLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  Loading carriers…
                </div>
              ) : mercariShip.mercariCarriers.length > 0 ? (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Select Carrier
                  </Label>
                  <div className="mt-1.5 space-y-2">
                    {mercariShip.mercariCarriers.map((carrier: any) => {
                      const carrierId = String(carrier.id ?? "");
                      const label = carrier.requestClassDisplayName ?? carrier.name ?? "Unknown";
                      const carrierName = carrier.carrierDisplayName ?? carrier.carrier ?? "";
                      const rawFee: number | undefined = carrier.fee;
                      const priceStr =
                        typeof rawFee === "number" ? `$${(rawFee / 100).toFixed(2)}` : "";
                      const eta = carrier.etaForSeller ?? "";
                      const isSelected = mercariShip.mercariSelectedCarrierId === carrierId;
                      return (
                        <button
                          key={carrierId}
                          type="button"
                          onClick={() => mercariShip.selectCarrier(carrier)}
                          className={[
                            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                            isSelected
                              ? "border-red-400 bg-red-50 ring-1 ring-red-200"
                              : "border-zinc-200 bg-white hover:border-zinc-300",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={[
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                isSelected ? "border-red-500" : "border-zinc-300",
                              ].join(" ")}
                            >
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{label}</p>
                              {carrierName && (
                                <p className="text-xs text-zinc-400">{carrierName}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {priceStr && (
                              <p className="text-sm font-semibold text-zinc-900">{priceStr}</p>
                            )}
                            {eta && <p className="text-xs text-zinc-400">{eta}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : mercariShip.mercariCarriersError ? (
                <p className="rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-3 text-xs text-red-500">
                  {mercariShip.mercariCarriersError}
                </p>
              ) : parseFloat(mercariShip.mercariWeightOz) > 0 ||
                parseFloat(mercariShip.mercariWeightLb) > 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400">
                  No carriers for this weight. Try adjusting dimensions.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
