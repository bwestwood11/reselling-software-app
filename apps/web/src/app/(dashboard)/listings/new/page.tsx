"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { ArrowLeft, ChevronRight, Loader2, Plus, Search, Tag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCreateListing } from "@/hooks/use-listings";
import { useInventory } from "@/hooks/use-inventory";
import { useQuery } from "@tanstack/react-query";
import { listingsApi, marketplacesApi, mercariApi } from "@/lib/api";
import { getMarketplaceLabel } from "@repo/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Standard eBay condition IDs valid for most non-graded categories (clothing, electronics, etc.)
const EBAY_CONDITIONS = [
  { id: "1000", label: "New with tags" },
  { id: "1500", label: "New without tags" },
  { id: "2000", label: "New with defects" },
  { id: "2500", label: "New other" },
  { id: "3000", label: "Pre-owned" },
] as const;

// Map our internal condition enum to the nearest eBay condition ID
function defaultEbayConditionId(condition?: string): string {
  const map: Record<string, string> = {
    NEW_WITH_TAGS: "1000",
    NEW_WITHOUT_TAGS: "1500",
    VERY_GOOD: "3000",
    GOOD: "3000",
    SATISFACTORY: "3000",
  };
  return map[condition ?? "GOOD"] ?? "3000";
}

const schema = z.object({
  inventoryItemId: z.string().min(1, "Select an inventory item"),
  marketplaceConnectionId: z.string().min(1, "Select a marketplace"),
  price: z.coerce.number().positive("Price must be positive"),
  title: z.string().min(1, "Title is required").max(80, "eBay titles are max 80 characters"),
  description: z.string().optional(),
  ebayCategoryId: z.string().optional(),
  ebayConditionId: z.string().optional(),
  ebayFulfillmentPolicyId: z.string().optional(),
  ebayPaymentPolicyId: z.string().optional(),
  ebayReturnPolicyId: z.string().optional(),
  ebayPostalCode: z.string().optional(),
  ebayLocation: z.string().optional(),
  mercariCategoryId: z.string().optional(),
  mercariBrandId: z.string().optional(),
  mercariSizeId: z.coerce.number().int().positive().optional(),
  mercariZipCode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewListingPage(): import("react").JSX.Element {
  const router = useRouter();
  const createMutation = useCreateListing();
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: inventoryData } = useInventory({ limit: "100" });
  const { data: connectionsData } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const inventoryItems = inventoryData?.data ?? [];
  const connections = connectionsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedItemId = watch("inventoryItemId");
  const selectedItem = inventoryItems.find((i: any) => i.id === selectedItemId);
  const selectedConnectionId = watch("marketplaceConnectionId");
  const selectedConnection = connections.find((c: any) => c.id === selectedConnectionId);
  const isEbay = selectedConnection?.marketplace === "EBAY";
  const isMercari = selectedConnection?.marketplace === "MERCARI";

  const {
    data: policiesData,
    isLoading: policiesLoading,
    error: policiesError,
  } = useQuery({
    queryKey: ["ebay-policies"],
    queryFn: marketplacesApi.getEbayPolicies,
    enabled: isEbay,
    retry: false,
  });

  const fulfillmentPolicies: any[] = policiesData?.data?.fulfillmentPolicies ?? [];
  const paymentPolicies: any[] = policiesData?.data?.paymentPolicies ?? [];
  const returnPolicies: any[] = policiesData?.data?.returnPolicies ?? [];

  // ── Category search ──────────────────────────────────────────────────────
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryResults, setCategoryResults] = useState<any[]>([]);
  const [categorySearching, setCategorySearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ categoryId: string; breadcrumb: string } | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mercari category drill-down ──────────────────────────────────────────
  type MercariCat = { id: string; label: string; isLeaf: boolean; hasChildren: boolean; fullPath: string[]; isSizeRequired: boolean; sizeSchemaId: string | null };
  const [mercariStack, setMercariStack] = useState<Array<{ id: string | null; label: string }>>([]);
  const [mercariChildren, setMercariChildren] = useState<MercariCat[]>([]);
  const [mercariLoading, setMercariLoading] = useState(false);
  const [selectedMercariCat, setSelectedMercariCat] = useState<MercariCat | null>(null);
  const [mercariSearch, setMercariSearch] = useState("");
  const [mercariSearchResults, setMercariSearchResults] = useState<MercariCat[]>([]);
  const [mercariSearching, setMercariSearching] = useState(false);
  const mercariDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadMercariChildren(parentId: string | null) {
    setMercariLoading(true);
    try {
      const param = parentId === null ? "root" : parentId;
      const res = await mercariApi.getCategories(param, undefined, 200);
      setMercariChildren(res?.data ?? []);
    } catch {
      setMercariChildren([]);
    } finally {
      setMercariLoading(false);
    }
  }

  function mercariDrillInto(cat: MercariCat) {
    setMercariStack((prev) => [...prev, { id: cat.id, label: cat.label }]);
    loadMercariChildren(cat.id);
    setMercariSearch("");
    setMercariSearchResults([]);
  }

  function mercariGoBack(toIndex: number) {
    const newStack = mercariStack.slice(0, toIndex);
    setMercariStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1]!.id : null;
    loadMercariChildren(parentId);
    setMercariSearch("");
    setMercariSearchResults([]);
  }

  function searchMercariCategories(q: string) {
    if (mercariDebounceRef.current) clearTimeout(mercariDebounceRef.current);
    if (!q.trim()) { setMercariSearchResults([]); return; }
    mercariDebounceRef.current = setTimeout(async () => {
      setMercariSearching(true);
      try {
        const res = await mercariApi.getCategories(undefined, q, 50);
        setMercariSearchResults(res?.data ?? []);
      } catch {
        setMercariSearchResults([]);
      } finally {
        setMercariSearching(false);
      }
    }, 350);
  }

  useEffect(() => {
    if (isMercari && mercariChildren.length === 0 && !mercariLoading) {
      loadMercariChildren(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMercari]);

  // Item specifics — driven by eBay category aspects
  type Aspect = { name: string; required: boolean; suggestedValues: string[] };
  const [aspects, setAspects] = useState<Aspect[]>([]);
  const [aspectsLoading, setAspectsLoading] = useState(false);
  const [aspectsError, setAspectsError] = useState<string | null>(null);
  // Map of aspect name → user-entered value
  const [specificValues, setSpecificValues] = useState<Record<string, string>>({});
  // Extra free-form rows the user adds manually
  const [extraSpecifics, setExtraSpecifics] = useState<Array<{ name: string; value: string }>>([]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const searchCategories = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setCategoryResults([]);
      setShowCategoryDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCategorySearching(true);
      try {
        const res = await marketplacesApi.getEbayCategorySuggestions(q);
        setCategoryResults(res?.data ?? []);
        setShowCategoryDropdown(true);
      } catch {
        setCategoryResults([]);
      } finally {
        setCategorySearching(false);
      }
    }, 350);
  }, []);

  function resolvedSpecificValue(name: string): string {
    const val = specificValues[name] ?? "";
    return val === "__custom__" ? (specificValues[`${name}__custom`] ?? "") : val;
  }

  function validateEbayFields(values: FormValues): boolean {
    if (!values.ebayCategoryId?.trim()) {
      toast.error("Category ID is required for eBay listings");
      return false;
    }
    if (!values.ebayFulfillmentPolicyId) {
      toast.error("Select a fulfillment policy");
      return false;
    }
    if (!values.ebayPaymentPolicyId) {
      toast.error("Select a payment policy");
      return false;
    }
    if (!values.ebayReturnPolicyId) {
      toast.error("Select a return policy");
      return false;
    }
    // Check required category aspects
    const missingRequired = aspects
      .filter((a) => a.required && !resolvedSpecificValue(a.name).trim())
      .map((a) => a.name);
    if (missingRequired.length > 0) {
      toast.error(`Fill in required item specifics: ${missingRequired.join(", ")}`);
      return false;
    }
    return true;
  }

  function buildMarketplaceData(values: FormValues) {
    if (isMercari) {
      if (!selectedMercariCat) return undefined;
      return {
        categoryId: selectedMercariCat.id,
        categoryPath: selectedMercariCat.fullPath,
        ...(values.mercariBrandId?.trim()
          ? { brandId: parseInt(values.mercariBrandId.trim(), 10) }
          : {}),
        ...(values.mercariSizeId ? { sizeId: values.mercariSizeId } : {}),
        ...(values.mercariZipCode?.trim() ? { zipCode: values.mercariZipCode.trim() } : {}),
      };
    }
    if (!isEbay) return undefined;
    // Merge aspect values + extra free-form rows into one object
    // Resolve "__custom__" sentinel: use the typed value stored under `name__custom`
    const specificsObj: Record<string, string> = {};
    for (const [key, val] of Object.entries(specificValues)) {
      if (key.endsWith("__custom")) continue; // skip the storage key
      const resolved = val === "__custom__" ? (specificValues[`${key}__custom`] ?? "") : val;
      if (resolved.trim()) specificsObj[key] = resolved.trim();
    }
    for (const { name, value } of extraSpecifics) {
      if (name.trim() && value.trim()) specificsObj[name.trim()] = value.trim();
    }
    return {
      categoryId: values.ebayCategoryId,
      conditionId: values.ebayConditionId ? Number(values.ebayConditionId) : undefined,
      listingPolicies: {
        fulfillmentPolicyId: values.ebayFulfillmentPolicyId,
        paymentPolicyId: values.ebayPaymentPolicyId,
        returnPolicyId: values.ebayReturnPolicyId,
      },
      ...(values.ebayPostalCode?.trim() ? { postalCode: values.ebayPostalCode.trim() } : {}),
      ...(values.ebayLocation?.trim() ? { location: values.ebayLocation.trim() } : {}),
      ...(Object.keys(specificsObj).length > 0 ? { itemSpecifics: specificsObj } : {}),
    };
  }

  async function onSaveDraft(values: FormValues) {
    if (isEbay && !validateEbayFields(values)) return;
    await createMutation.mutateAsync({
      inventoryItemId: values.inventoryItemId,
      marketplaceConnectionId: values.marketplaceConnectionId,
      marketplace: selectedConnection!.marketplace,
      price: values.price,
      title: values.title,
      description: values.description,
      marketplaceData: buildMarketplaceData(values),
    });
    router.push("/listings");
  }

  async function onSaveAndPublish(values: FormValues) {
    if (!validateEbayFields(values)) return;
    setIsPublishing(true);
    try {
      const created = await createMutation.mutateAsync({
        inventoryItemId: values.inventoryItemId,
        marketplaceConnectionId: values.marketplaceConnectionId,
        marketplace: selectedConnection!.marketplace,
        price: values.price,
        title: values.title,
        description: values.description,
        marketplaceData: buildMarketplaceData(values),
      });
      const listingId = created?.data?.id;
      if (!listingId) throw new Error("Could not retrieve listing ID after creation");
      await listingsApi.publish(listingId);
      toast.success("Listing published to eBay!");
      router.push("/listings");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish";
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  }

  const busy = isSubmitting || createMutation.isPending || isPublishing;

  return (
    <div className="min-h-screen bg-[#f6f5f3]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/listings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Listings
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Create Listing
            </h1>
          </div>
        </div>

        <form className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* ── Left column ──────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Source & Destination */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
              <SectionHeader step="01" title="Source & Destination" />
              <div className="mt-5 space-y-4">

                {/* Inventory item */}
                <Field label="Inventory Item *" error={errors.inventoryItemId?.message}>
                  <Select
                    onValueChange={(val) => {
                      setValue("inventoryItemId", val);
                      const item = inventoryItems.find((i: any) => i.id === val);
                      if (item) {
                        setValue("title", item.title);
                        if (item.targetPrice) setValue("price", Number(item.targetPrice));
                        if (item.description) setValue("description", item.description);
                        // Pre-populate eBay condition from inventory condition
                        setValue("ebayConditionId", defaultEbayConditionId(item.condition));
                        // Pre-seed specifics from inventory brand/attributes
                        const seed: Record<string, string> = {};
                        if (item.brand) seed["Brand"] = item.brand;
                        for (const attr of item.attributes ?? []) {
                          if (attr.name && attr.value) seed[attr.name] = attr.value;
                        }
                        setSpecificValues(seed);
                        // Auto-search category using item category or title
                        const searchTerm = item.category?.trim() || item.title;
                        if (searchTerm) {
                          setCategoryQuery(searchTerm);
                          searchCategories(searchTerm);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-orange-400">
                      <SelectValue placeholder="Select an item from inventory…" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-zinc-900">
                      {inventoryItems.length === 0 ? (
                        <SelectItem value="_none" disabled>No inventory items found</SelectItem>
                      ) : (
                        inventoryItems.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {inventoryItems.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      <Link href="/inventory/new" className="text-orange-600 hover:underline">
                        Add an item to inventory
                      </Link>{" "}
                      first.
                    </p>
                  )}
                </Field>

                {/* Marketplace */}
                <Field label="Marketplace *" error={errors.marketplaceConnectionId?.message}>
                  <Select onValueChange={(val) => setValue("marketplaceConnectionId", val)}>
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
                  {connections.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      <Link href="/settings/marketplaces" className="text-orange-600 hover:underline">
                        Connect a marketplace
                      </Link>{" "}
                      first.
                    </p>
                  )}
                </Field>
              </div>
            </section>

            {/* Listing Details */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
              <SectionHeader step="02" title="Listing Details" />
              <div className="mt-5 space-y-4">

                <Field label="Title *" error={errors.title?.message}>
                  <Input
                    placeholder="e.g. Nike Air Force 1 White Size 10"
                    className="border-zinc-200 focus-visible:ring-orange-400"
                    {...register("title")}
                  />
                  {isEbay && (
                    <p className="text-xs text-zinc-400">Max 80 characters for eBay.</p>
                  )}
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

            {/* Mercari-specific */}
            {isMercari && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="03" title="Mercari Settings">
                  <span className="ml-2 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                    Mercari
                  </span>
                </SectionHeader>

                <div className="mt-5">
                  <Field label="Category">
                    {selectedMercariCat ? (
                      /* Selected state */
                      <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {selectedMercariCat.label}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            {selectedMercariCat.fullPath.join(" › ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMercariCat(null);
                            setValue("mercariCategoryId", "");
                            setValue("mercariSizeId", undefined);
                            setMercariStack([]);
                            loadMercariChildren(null);
                          }}
                          className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Search input */}
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                          <Input
                            value={mercariSearch}
                            onChange={(e) => {
                              setMercariSearch(e.target.value);
                              searchMercariCategories(e.target.value);
                            }}
                            placeholder="Search categories…"
                            className="border-zinc-200 pl-9 focus-visible:ring-red-400"
                          />
                          {mercariSearching && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-red-500" />
                          )}
                        </div>

                        {/* Search results */}
                        {mercariSearch.trim() ? (
                          <div className="rounded-xl border border-zinc-200 bg-white">
                            {mercariSearchResults.length === 0 && !mercariSearching ? (
                              <p className="px-3 py-3 text-xs text-zinc-400">
                                No categories found for &ldquo;{mercariSearch}&rdquo;
                              </p>
                            ) : (
                              <ul className="max-h-56 overflow-y-auto py-1">
                                {mercariSearchResults.map((cat) => (
                                  <li key={cat.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMercariCat(cat);
                                        setValue("mercariCategoryId", cat.id);
                                        setMercariSearch("");
                                        setMercariSearchResults([]);
                                      }}
                                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-red-50"
                                    >
                                      <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                                      <span className="text-xs text-zinc-400">{cat.fullPath.join(" › ")}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          /* Drill-down browser */
                          <div className="rounded-xl border border-zinc-200 bg-white">
                            {/* Breadcrumb */}
                            {mercariStack.length > 0 && (
                              <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                                <button
                                  type="button"
                                  onClick={() => mercariGoBack(0)}
                                  className="hover:text-zinc-900"
                                >
                                  All
                                </button>
                                {mercariStack.map((crumb, i) => (
                                  <span key={i} className="flex items-center gap-1">
                                    <ChevronRight className="h-3 w-3" />
                                    <button
                                      type="button"
                                      onClick={() => mercariGoBack(i + 1)}
                                      className="hover:text-zinc-900"
                                    >
                                      {crumb.label}
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {mercariLoading ? (
                              <div className="flex items-center gap-2 px-3 py-3 text-sm text-zinc-500">
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                Loading…
                              </div>
                            ) : mercariChildren.length === 0 ? (
                              <p className="px-3 py-3 text-xs text-zinc-400">No categories found.</p>
                            ) : (
                              <ul className="max-h-64 overflow-y-auto py-1">
                                {mercariChildren.map((cat) => (
                                  <li key={cat.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (cat.hasChildren) {
                                          mercariDrillInto(cat);
                                        } else {
                                          setSelectedMercariCat(cat);
                                          setValue("mercariCategoryId", cat.id);
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

                  {selectedMercariCat?.isSizeRequired && (
                    <div className="mt-5">
                      <Field label="Size ID *">
                        <Input
                          type="number"
                          placeholder="e.g. 11"
                          className="border-zinc-200 focus-visible:ring-red-400"
                          {...register("mercariSizeId")}
                        />
                        <p className="text-xs text-zinc-400">
                          Required for this category
                          {selectedMercariCat.sizeSchemaId
                            ? ` (schema ${selectedMercariCat.sizeSchemaId})`
                            : ""}
                          . Enter the Mercari size ID integer.
                        </p>
                      </Field>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <Field label="Brand ID">
                      <Input
                        type="number"
                        placeholder="e.g. 2618"
                        className="border-zinc-200 focus-visible:ring-red-400"
                        {...register("mercariBrandId")}
                      />
                    </Field>
                    <Field label="Zip Code">
                      <Input
                        placeholder="e.g. 33625"
                        maxLength={10}
                        className="border-zinc-200 focus-visible:ring-red-400"
                        {...register("mercariZipCode")}
                      />
                    </Field>
                  </div>
                </div>
              </section>
            )}

            {/* eBay-specific */}
            {isEbay && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="03" title="eBay Settings">
                  <span className="ml-2 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                    Required for eBay
                  </span>
                </SectionHeader>

                <div className="mt-5 space-y-5">

                  {/* Category search */}
                  <Field label="Category *">
                    <div ref={categoryRef} className="relative">
                      {selectedCategory ? (
                        /* Selected state */
                        <div className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900">
                              {selectedCategory.breadcrumb.split(" › ").pop()}
                            </p>
                            <p className="truncate text-xs text-zinc-400">{selectedCategory.breadcrumb}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(null);
                              setValue("ebayCategoryId", "");
                              setCategoryQuery("");
                            }}
                            className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        /* Search input */
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                          <Input
                            value={categoryQuery}
                            onChange={(e) => {
                              setCategoryQuery(e.target.value);
                              searchCategories(e.target.value);
                            }}
                            onFocus={() => { if (categoryResults.length > 0) setShowCategoryDropdown(true); }}
                            placeholder="Search eBay categories…"
                            className="border-zinc-200 pl-9 focus-visible:ring-orange-400"
                          />
                          {categorySearching && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />
                          )}
                        </div>
                      )}

                      {/* Results dropdown */}
                      {showCategoryDropdown && categoryResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                          <ul className="max-h-64 overflow-y-auto py-1">
                            {categoryResults.map((cat: any) => (
                              <li key={cat.categoryId}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={async () => {
                                    setSelectedCategory(cat);
                                    setValue("ebayCategoryId", cat.categoryId);
                                    setCategoryQuery("");
                                    setShowCategoryDropdown(false);
                                    // Load aspects for this category
                                    setAspectsLoading(true);
                                    setAspectsError(null);
                                    setExtraSpecifics([]);
                                    try {
                                      const res = await marketplacesApi.getEbayCategoryAspects(cat.categoryId);
                                      setAspects(res?.data ?? []);
                                    } catch (err) {
                                      setAspects([]);
                                      setAspectsError(err instanceof Error ? err.message : "Failed to load item specifics");
                                    } finally {
                                      setAspectsLoading(false);
                                    }
                                  }}
                                  className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-orange-50"
                                >
                                  <span className="text-sm font-medium text-zinc-900">
                                    {cat.categoryName}
                                  </span>
                                  <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                                    {cat.breadcrumb.split(" › ").slice(0, -1).map((crumb: string, i: number, arr: string[]) => (
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

                      {showCategoryDropdown && !categorySearching && categoryQuery && categoryResults.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-500 shadow-lg">
                          No categories found for &ldquo;{categoryQuery}&rdquo;
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
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-400">
                      For most clothing & general items. Specialty categories (coins, cards) may require a different ID — check eBay&apos;s condition page for your category.
                    </p>
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
                      <p className="mt-1 text-red-600">
                        Set up{" "}
                        <a
                          href="https://www.ebay.com/sbk/buynselldashboard?context=SBK_SELLSET"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          business policies
                        </a>{" "}
                        in your eBay account first.
                      </p>
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
                                <SelectItem key={p.paymentPolicyId} value={p.paymentPolicyId}>
                                  {p.name}
                                </SelectItem>
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
                                <SelectItem key={p.returnPolicyId} value={p.returnPolicyId}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                    </div>
                  )}

                  {/* Location fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Item Location">
                      <Input
                        placeholder="e.g. Los Angeles, CA"
                        className="border-zinc-200 focus-visible:ring-orange-400"
                        {...register("ebayLocation")}
                      />
                      <p className="text-xs text-zinc-400">City, State shown on listing.</p>
                    </Field>
                    <Field label="Postal Code">
                      <Input
                        placeholder="e.g. 90210"
                        className="border-zinc-200 focus-visible:ring-orange-400"
                        {...register("ebayPostalCode")}
                      />
                      <p className="text-xs text-zinc-400">For shipping estimates.</p>
                    </Field>
                  </div>

                  {/* Item specifics — driven by selected category */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Item Specifics
                      </Label>
                      {selectedCategory && !aspectsLoading && aspects.length > 0 && (
                        <span className="text-xs text-zinc-400">
                          {aspects.filter((a) => a.required).length} required · {aspects.filter((a) => !a.required).length} optional
                        </span>
                      )}
                    </div>

                    {!selectedCategory ? (
                      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400">
                        Select a category above to load required item specifics.
                      </p>
                    ) : aspectsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        Loading item specifics…
                      </div>
                    ) : aspectsError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                        {aspectsError}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aspects.length === 0 && (
                          <p className="text-xs text-zinc-400">
                            No standard specifics for this category. Add them manually below.
                          </p>
                        )}

                        {/* Required aspects */}
                        {(() => {
                          const required = aspects.filter((a) => a.required);
                          if (required.length === 0) return null;
                          const allFilled = required.every((a) => resolvedSpecificValue(a.name).trim());
                          return (
                            <div className={[
                              "rounded-xl border p-4 transition-colors",
                              allFilled
                                ? "border-emerald-100 bg-emerald-50/40"
                                : "border-orange-100 bg-orange-50/40",
                            ].join(" ")}>
                              <p className={[
                                "mb-3 flex items-center gap-1.5 text-xs font-semibold",
                                allFilled ? "text-emerald-700" : "text-orange-700",
                              ].join(" ")}>
                                {allFilled ? (
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</span>
                                ) : (
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">
                                    {required.filter((a) => !resolvedSpecificValue(a.name).trim()).length}
                                  </span>
                                )}
                                {allFilled ? "All required fields complete" : "Required by eBay for this category"}
                              </p>
                              <div className="space-y-2.5">
                                {required.map((aspect) => (
                                  <AspectRow
                                    key={aspect.name}
                                    aspect={aspect}
                                    value={specificValues[aspect.name] ?? ""}
                                    customValue={specificValues[`${aspect.name}__custom`] ?? ""}
                                    onChange={(val) => setSpecificValues((prev) => ({ ...prev, [aspect.name]: val }))}
                                    onCustomChange={(val) => setSpecificValues((prev) => ({ ...prev, [`${aspect.name}__custom`]: val }))}
                                    showEmpty
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Optional aspects */}
                        {aspects.filter((a) => !a.required).length > 0 && (
                          <div>
                            <p className="mb-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                              Optional — improves search visibility
                            </p>
                            <div className="space-y-2">
                              {aspects.filter((a) => !a.required).map((aspect) => (
                                <AspectRow
                                  key={aspect.name}
                                  aspect={aspect}
                                  value={specificValues[aspect.name] ?? ""}
                                  customValue={specificValues[`${aspect.name}__custom`] ?? ""}
                                  onChange={(val) => setSpecificValues((prev) => ({ ...prev, [aspect.name]: val }))}
                                  onCustomChange={(val) => setSpecificValues((prev) => ({ ...prev, [`${aspect.name}__custom`]: val }))}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extra free-form rows */}
                        {extraSpecifics.length > 0 && (
                          <div className="space-y-2">
                            {extraSpecifics.map((spec, i) => (
                              <div key={`extra-${i}`} className="flex gap-2">
                                <Input
                                  value={spec.name}
                                  onChange={(e) => {
                                    const updated = [...extraSpecifics];
                                    updated[i] = { ...updated[i]!, name: e.target.value };
                                    setExtraSpecifics(updated);
                                  }}
                                  placeholder="Attribute name"
                                  className="w-40 shrink-0 border-zinc-200 focus-visible:ring-orange-400"
                                />
                                <Input
                                  value={spec.value}
                                  onChange={(e) => {
                                    const updated = [...extraSpecifics];
                                    updated[i] = { ...updated[i]!, value: e.target.value };
                                    setExtraSpecifics(updated);
                                  }}
                                  placeholder="Value"
                                  className="flex-1 border-zinc-200 focus-visible:ring-orange-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => setExtraSpecifics(extraSpecifics.filter((_, j) => j !== i))}
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
                          onClick={() => setExtraSpecifics([...extraSpecifics, { name: "", value: "" }])}
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
            )}
          </div>

          {/* ── Right column — preview + actions ─────────────────── */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

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
                <p className="text-sm font-semibold text-zinc-900 line-clamp-2">
                  {selectedItem.title}
                </p>
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

            {/* Actions */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Actions
              </p>
              <div className="space-y-2">
                {isEbay ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSubmit(onSaveAndPublish)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
                  >
                    {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Tag className="h-4 w-4" />
                    Save & Publish to eBay
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !selectedConnectionId}
                    onClick={handleSubmit(onSaveDraft)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
                  >
                    {(isSubmitting || createMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create Listing
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmit(onSaveDraft)}
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  {isSubmitting && !isPublishing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save as Draft
                </button>

                <Link
                  href="/listings"
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-50"
                >
                  Cancel
                </Link>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeader({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-[10px] font-bold text-white">
        {step}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function AspectRow({
  aspect,
  value,
  customValue,
  onChange,
  onCustomChange,
  showEmpty = false,
}: {
  aspect: { name: string; required: boolean; suggestedValues: string[] };
  value: string;
  customValue: string;
  onChange: (val: string) => void;
  onCustomChange: (val: string) => void;
  showEmpty?: boolean;
}) {
  const needsValue = showEmpty && !value.trim();
  return (
    <div className="flex items-start gap-2">
      <div className="w-36 shrink-0 pt-2.5">
        <span className="text-xs font-medium text-zinc-700">
          {aspect.name}
          {aspect.required && <span className="ml-1 text-orange-400">*</span>}
        </span>
      </div>
      <div className="flex-1">
        {aspect.suggestedValues.length > 0 ? (
          <>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors",
                needsValue ? "border-orange-300 bg-orange-50/50" : "border-zinc-200 bg-white",
              ].join(" ")}
            >
              <option value="">Select…</option>
              {aspect.suggestedValues.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
              <option value="__custom__">Other (type below)</option>
            </select>
            {value === "__custom__" && (
              <Input
                className="mt-1.5 border-zinc-200 focus-visible:ring-orange-400"
                placeholder={`Enter ${aspect.name}…`}
                value={customValue}
                onChange={(e) => onCustomChange(e.target.value)}
              />
            )}
          </>
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${aspect.name}…`}
            className={[
              "focus-visible:ring-orange-400 transition-colors",
              needsValue ? "border-orange-300 bg-orange-50/50" : "border-zinc-200",
            ].join(" ")}
          />
        )}
      </div>
    </div>
  );
}

function NoPoliciesNotice({ type }: { type: "fulfillment" | "payment" | "return" }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
      No {type} policies found.{" "}
      <a
        href="https://www.ebay.com/sbk/buynselldashboard?context=SBK_SELLSET"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Create one in eBay Business Policies
      </a>{" "}
      and refresh.
    </p>
  );
}
