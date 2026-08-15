"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMarketplaceLabel } from "@repo/utils";
import { listingsApi, marketplacesApi, inventoryApi } from "@/lib/api";
import { useInventory, useInventoryItem } from "@/hooks/use-inventory";
import { useCreateListing } from "@/hooks/use-listings";
import {
  listingFormSchema,
  type FormValues,
  type FormInput,
  type CreateListingFormProps,
} from "../listing-form-schema";
import { useEbayCategories } from "./use-ebay-categories";
import { useMercariCategories, type MercariCat } from "./use-mercari-categories";
import { useMercariShipping } from "./use-mercari-shipping";
import { usePoshmarkFields } from "./use-poshmark-fields";

export type CrossFill = { source: string; fields: string[] };
export type MercariAddress = {
  id: number;
  firstName: string;
  familyName: string;
  address1: string;
  address2: string;
  city: string;
  stateAbbreviation: string;
  zipCode1: string;
  isDefault: boolean;
};

export function useListingForm({
  defaultInventoryItemId,
  defaultConnectionId,
  onClose,
}: CreateListingFormProps) {
  const createMutation = useCreateListing();
  const [isPublishing, setIsPublishing] = useState(false);
  const [crossFill, setCrossFill] = useState<CrossFill | null>(null);

  // ── Sub-hooks ────────────────────────────────────────────────────────────

  const ebay = useEbayCategories();
  const mercariCat = useMercariCategories();
  const poshmark = usePoshmarkFields();

  // ── Data queries ─────────────────────────────────────────────────────────

  const { data: inventoryData } = useInventory({ limit: "100" });
  const { data: connectionsData } = useQuery({
    queryKey: ["connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const inventoryItems: any[] = inventoryData?.data ?? [];
  const connections: any[] = connectionsData?.data ?? [];

  // ── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<FormInput, any, FormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      inventoryItemId: defaultInventoryItemId ?? "",
      marketplaceConnectionId: defaultConnectionId ?? "",
    },
  });
  const { setValue, watch, getValues, handleSubmit, formState } = form;

  const selectedItemId = watch("inventoryItemId");
  const selectedConnectionId = watch("marketplaceConnectionId");

  const selectedConnection = connections.find((c: any) => c.id === selectedConnectionId);
  const isEbay = selectedConnection?.marketplace === "EBAY";
  const isMercari = selectedConnection?.marketplace === "MERCARI";
  const isPoshmark = selectedConnection?.marketplace === "POSHMARK";

  // Shipping needs to know if Mercari is active and the selected category
  const mercariShip = useMercariShipping(isMercari, mercariCat.selectedMercariCat?.id);

  // ── Item detail fetch ────────────────────────────────────────────────────
  // Uses the detail endpoint so we get marketplaceData for cross-fill

  const detailId = selectedItemId || defaultInventoryItemId || "";
  const { data: itemDetailData } = useInventoryItem(detailId);
  const itemDetail = itemDetailData?.data;

  const selectedItem = itemDetail ?? inventoryItems.find((i: any) => i.id === selectedItemId);

  // ── Mercari addresses ────────────────────────────────────────────────────

  const {
    data: mercariAddressesData,
    isLoading: mercariAddressesLoading,
    refetch: refetchMercariAddresses,
  } = useQuery({
    queryKey: ["mercari-addresses"],
    queryFn: marketplacesApi.getMercariAddresses,
    enabled: isMercari,
    retry: false,
  });
  const mercariAddresses: MercariAddress[] = mercariAddressesData?.data ?? [];
  const [refreshingAddresses, setRefreshingAddresses] = useState(false);

  async function handleRefreshAddresses() {
    setRefreshingAddresses(true);
    try {
      const res = await marketplacesApi.triggerRefreshMercariAddresses();
      const jobId: string | undefined = res?.data?.jobId;
      if (!jobId) {
        await refetchMercariAddresses();
        toast.success("Addresses refreshed");
        return;
      }
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3_000));
        const { mercariApi: mApi } = await import("@/lib/api");
        const jobRes = await mApi.getJob(jobId);
        const status: string = jobRes?.data?.status ?? "PENDING";
        if (status === "COMPLETED") {
          await refetchMercariAddresses();
          toast.success("Addresses refreshed");
          return;
        }
        if (status === "FAILED") {
          toast.error(jobRes?.data?.errorMessage ?? "Extension failed");
          return;
        }
      }
      toast.error("Timed out waiting for extension.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not refresh addresses");
    } finally {
      setRefreshingAddresses(false);
    }
  }

  // ── Mercari category init ─────────────────────────────────────────────────

  useEffect(() => {
    if (isMercari && mercariCat.mercariChildren.length === 0 && !mercariCat.mercariLoading) {
      mercariCat.loadMercariChildren(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMercari]);

  // ── eBay policies ────────────────────────────────────────────────────────

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

  // ── Pre-fill via backend endpoint ─────────────────────────────────────────

  const prefillMarketplace = selectedConnection?.marketplace as string | undefined;
  const { data: prefillResult } = useQuery({
    queryKey: ["prefill", detailId, prefillMarketplace],
    queryFn: () => inventoryApi.getPrefill(detailId, prefillMarketplace!),
    enabled: !!detailId && !!prefillMarketplace,
    staleTime: 30_000,
  });
  const prefillData = prefillResult?.data;

  // Apply pre-fill when it arrives
  const lastAppliedPrefillRef = useRef<string | null>(null);
  // Tracks the current search term seeded by prefill (null = not in prefill-search mode)
  const prefillSearchTermRef = useRef<string | null>(null);
  useEffect(() => {
    if (!prefillData || !detailId || !prefillMarketplace) return;
    const key = `${detailId}:${prefillMarketplace}`;
    if (lastAppliedPrefillRef.current === key) return;
    lastAppliedPrefillRef.current = key;

    // Core fields
    setValue("inventoryItemId", detailId);
    if (prefillData.title) setValue("title", prefillData.title);
    if (prefillData.price != null) setValue("price", prefillData.price);
    if (prefillData.description) setValue("description", prefillData.description);

    // Mercari-specific
    if (prefillData.mercari && isMercari) {
      const m = prefillData.mercari;
      if (m.brandId) setValue("mercariBrandId", m.brandId);
      if (m.sizeId) setValue("mercariSizeId", Number(m.sizeId));
      if (m.zipCode) setValue("mercariZipCode", m.zipCode);
      if (m.addressId) setValue("mercariAddressId", m.addressId);

      if (m.shippingMethod) mercariShip.setMercariShipMethod(m.shippingMethod);
      if (m.shippingMethod === "PREPAID" && m.weightOz && m.weightOz > 0) {
        const lb = Math.floor(m.weightOz / 16);
        const oz = m.weightOz % 16;
        mercariShip.setMercariWeightLb(String(lb));
        mercariShip.setMercariWeightOz(String(oz));
      }
      if (m.shippingPayerId) mercariShip.setMercariShippingPayerId(m.shippingPayerId);
      if (m.dimL) mercariShip.setMercariDimL(String(m.dimL));
      if (m.dimW) mercariShip.setMercariDimW(String(m.dimW));
      if (m.dimH) mercariShip.setMercariDimH(String(m.dimH));

      // Category resolution: mapped suggestions → path/leaf fallback → live search
      const hasSuggestions = m.categorySuggestions && m.categorySuggestions.length > 0;
      const hasCatPath = m.categoryPath && m.categoryPath.length > 0;
      if (hasSuggestions || hasCatPath) {
        import("@/data/mercari-categories.json").then((mod) => {
          type RawCat = { id: number; name: string; parentId: number };
          const raw = (mod.default as { itemCategories: RawCat[] }).itemCategories;
          const parentIdSet = new Set(raw.filter((c) => c.parentId > 0).map((c) => c.parentId));
          const rawById = new Map(raw.map((c) => [c.id, c]));
          function buildPath(cat: RawCat): string[] {
            const path: string[] = [];
            let cur: RawCat | undefined = cat;
            while (cur) { path.unshift(cur.name); cur = cur.parentId > 0 ? rawById.get(cur.parentId) : undefined; }
            return path;
          }

          let match: RawCat | undefined;

          if (hasSuggestions) {
            // Try each suggestion in order — first valid leaf wins
            for (const catId of m.categorySuggestions!) {
              match = raw.find((c) => String(c.id) === catId && !parentIdSet.has(c.id));
              if (match) break;
              // Accept parent nodes too if no leaf found yet
              match = raw.find((c) => String(c.id) === catId);
              if (match) break;
            }
          }

          if (!match && hasCatPath) {
            // Mercari-native path: try full path then leaf name
            const leaf = m.categoryPath![m.categoryPath!.length - 1]!;
            const targetPath = m.categoryPath!.join(" › ");
            match = raw.find((c) => buildPath(c).join(" › ") === targetPath);
            if (!match) match = raw.find((c) => !parentIdSet.has(c.id) && c.name.toLowerCase() === leaf.toLowerCase());
            if (!match) match = raw.find((c) => c.name.toLowerCase() === leaf.toLowerCase());

            if (!match) {
              // Seed live search with progressive word-stripping fallback
              prefillSearchTermRef.current = leaf;
              mercariCat.setMercariSearch(leaf);
              mercariCat.searchCategories(leaf);
            }
          }

          if (match) {
            const fp = buildPath(match);
            const node: MercariCat = { id: String(match.id), label: match.name, hasChildren: parentIdSet.has(match.id), fullPath: fp, isLeaf: !parentIdSet.has(match.id), isSizeRequired: false, sizeSchemaId: null };
            mercariCat.setSelectedMercariCat(node);
            setValue("mercariCategoryId", node.id);
            setCrossFill((prev) => prev ? { ...prev, fields: [...prev.fields.filter((f) => f !== "category"), "category"] } : { source: "item details", fields: ["category"] });
          }
        });
      }
    }

    // eBay-specific
    if (prefillData.ebay && isEbay) {
      const e = prefillData.ebay;
      if (e.conditionId) setValue("ebayConditionId", e.conditionId);
      if (e.postalCode) setValue("ebayPostalCode", e.postalCode);
      if (e.location) setValue("ebayLocation", e.location);
      if (e.weightLbs) setValue("ebayWeightLbs", e.weightLbs);
      if (e.itemSpecifics) ebay.setSpecificValues(e.itemSpecifics);
      if (e.categorySearchTerm) {
        ebay.setCategoryQuery(e.categorySearchTerm);
        ebay.searchCategories(e.categorySearchTerm);
      }
    }

    // Poshmark-specific
    if (prefillData.poshmark && isPoshmark) {
      const p = prefillData.poshmark;
      if (p.condition) setValue("poshmarkCondition", p.condition);
      if (p.brand) setValue("poshmarkBrand", p.brand);
      if (p.originalPriceCents != null) setValue("poshmarkOriginalPrice", p.originalPriceCents / 100);
      if (p.shippingDiscount) setValue("poshmarkShippingDiscount", p.shippingDiscount);

      // Category must be applied through the hook so its derived department/category/subcategory
      // lists stay in sync with the form values.
      if (p.departmentId) {
        poshmark.applyPrefilledCategory({
          departmentId: p.departmentId,
          categoryId: p.categoryId,
          subcategoryId: p.subcategoryId,
        });
        setValue("poshmarkDepartmentId", p.departmentId);
        if (p.categoryId) setValue("poshmarkCategoryId", p.categoryId);
        if (p.subcategoryId) setValue("poshmarkSubcategoryId", p.subcategoryId);
      }

      if (p.colors?.length) poshmark.setPoshmarkColors(p.colors.slice(0, 2));
      if (p.styleTags?.length) poshmark.setPoshmarkStyleTags(p.styleTags.slice(0, 3));
      // Size is a label, not an ID — resolved against the selected category's size list below.
      if (p.sizeLabel) poshmark.setPoshmarkPrefilledSize(p.sizeLabel);
    }

    // Update crossFill banner
    if (prefillData.filledFields.length > 0) {
      const label = prefillData.source && prefillData.source !== "INVENTORY"
        ? getMarketplaceLabel(prefillData.source)
        : "item details";
      setCrossFill({ source: label, fields: prefillData.filledFields });
    } else {
      setCrossFill(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, detailId, prefillMarketplace, isMercari, isEbay, isPoshmark]);

  // Resolve a prefilled Poshmark size label once the category's size list is known — the list
  // only exists after a category is picked, which may happen after the prefill lands.
  const poshmarkPrefilledSizeLabel = poshmark.prefilledSizeLabel;
  useEffect(() => {
    if (!poshmarkPrefilledSizeLabel || poshmark.poshmarkSizes.length === 0) return;
    const match = poshmark.poshmarkSizes.find(
      (s) =>
        s.display.toLowerCase() === poshmarkPrefilledSizeLabel.toLowerCase() ||
        s.id === poshmarkPrefilledSizeLabel
    );
    if (match) setValue("poshmarkSizeId", match.id);
    poshmark.setPoshmarkPrefilledSize(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poshmarkPrefilledSizeLabel, poshmark.poshmarkSizes]);

  // ── Mercari category search progressive fallback ──────────────────────────
  // When the prefill-seeded search returns no results, strip the last word and retry.
  // Stops as soon as results appear, the user modifies the query, or one word remains.
  useEffect(() => {
    if (!isMercari || prefillSearchTermRef.current === null) return;
    // User changed the search box — stop interfering
    if (mercariCat.mercariSearch !== prefillSearchTermRef.current) {
      prefillSearchTermRef.current = null;
      return;
    }
    if (mercariCat.mercariSearching) return;
    if (mercariCat.selectedMercariCat) { prefillSearchTermRef.current = null; return; }
    if (mercariCat.mercariSearchResults.length > 0) { prefillSearchTermRef.current = null; return; }
    const q = prefillSearchTermRef.current.trim();
    const words = q.split(/\s+/);
    if (words.length <= 1) { prefillSearchTermRef.current = null; return; }
    const shorter = words.slice(0, -1).join(" ");
    prefillSearchTermRef.current = shorter;
    mercariCat.setMercariSearch(shorter);
    mercariCat.searchCategories(shorter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMercari, mercariCat.mercariSearch, mercariCat.mercariSearching, mercariCat.mercariSearchResults.length, mercariCat.selectedMercariCat]);

  // ── Submit ───────────────────────────────────────────────────────────────

  function buildMarketplaceData(values: FormValues) {
    if (isMercari) {
      if (!mercariCat.selectedMercariCat) return undefined;
      const totalWeightOz =
        (parseFloat(mercariShip.mercariWeightLb) || 0) * 16 +
        (parseFloat(mercariShip.mercariWeightOz) || 0);
      const dimL = parseFloat(mercariShip.mercariDimL) || 0;
      const dimW = parseFloat(mercariShip.mercariDimW) || 0;
      const dimH = parseFloat(mercariShip.mercariDimH) || 0;
      const hasDims = dimL > 0 && dimW > 0 && dimH > 0;
      return {
        categoryId: mercariCat.selectedMercariCat.id,
        categoryPath: mercariCat.selectedMercariCat.fullPath,
        ...(values.mercariBrandId?.trim()
          ? { brandId: parseInt(values.mercariBrandId.trim(), 10) }
          : {}),
        ...(values.mercariSizeId ? { sizeId: values.mercariSizeId } : {}),
        ...(values.mercariZipCode?.trim() ? { zipCode: values.mercariZipCode.trim() } : {}),
        ...(values.mercariAddressId ? { addressId: values.mercariAddressId } : {}),
        shipping: {
          method: mercariShip.mercariShipMethod,
          ...(mercariShip.mercariShipMethod === "PREPAID" && totalWeightOz > 0
            ? {
                weightOz: Math.round(totalWeightOz),
                ...(hasDims ? { dimension: { length: dimL, width: dimW, height: dimH } } : {}),
                ...(mercariShip.mercariSelectedCarrierId
                  ? { shippingClassId: parseInt(mercariShip.mercariSelectedCarrierId, 10) }
                  : {}),
                shippingPayerId: mercariShip.mercariShippingPayerId,
                ...(typeof mercariShip.mercariSelectedCarrier?.fee === "number"
                  ? { shippingCost: mercariShip.mercariSelectedCarrier.fee }
                  : {}),
              }
            : {}),
        },
      };
    }

    if (isPoshmark) {
      return {
        ...(poshmark.poshmarkDeptId ? { departmentId: poshmark.poshmarkDeptId } : {}),
        ...(poshmark.poshmarkCatId ? { categoryId: poshmark.poshmarkCatId } : {}),
        ...(poshmark.poshmarkSubcatId ? { subcategoryId: poshmark.poshmarkSubcatId } : {}),
        ...(values.poshmarkCondition ? { condition: values.poshmarkCondition } : {}),
        ...(values.poshmarkBrand?.trim() ? { brand: values.poshmarkBrand.trim() } : {}),
        ...(poshmark.poshmarkColors.length > 0 ? { colors: poshmark.poshmarkColors } : {}),
        ...(poshmark.poshmarkStyleTags.length > 0 ? { styleTags: poshmark.poshmarkStyleTags } : {}),
        ...(values.poshmarkSizeId ? { sizeId: values.poshmarkSizeId } : {}),
        ...(values.poshmarkOriginalPrice
          ? { originalPriceCents: Math.round(values.poshmarkOriginalPrice * 100) }
          : {}),
        ...(values.poshmarkShippingDiscount && values.poshmarkShippingDiscount !== "no_discount"
          ? { shippingDiscount: values.poshmarkShippingDiscount }
          : {}),
      };
    }

    if (!isEbay) return undefined;

    const specificsObj: Record<string, string> = {};
    for (const [key, val] of Object.entries(ebay.specificValues)) {
      if (key.endsWith("__custom")) continue;
      const resolved = val === "__custom__" ? (ebay.specificValues[`${key}__custom`] ?? "") : val;
      if (resolved.trim()) specificsObj[key] = resolved.trim();
    }
    for (const { name, value } of ebay.extraSpecifics) {
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
      ...(values.ebayWeightLbs ? { weightLbs: values.ebayWeightLbs } : {}),
      ...(Object.keys(specificsObj).length > 0 ? { itemSpecifics: specificsObj } : {}),
    };
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
    const missingRequired = ebay.aspects
      .filter((a) => a.required && !ebay.resolvedSpecificValue(a.name).trim())
      .map((a) => a.name);
    if (missingRequired.length > 0) {
      toast.error(`Fill in required item specifics: ${missingRequired.join(", ")}`);
      return false;
    }
    return true;
  }

  function validatePoshmarkFields(values: FormValues): boolean {
    // Poshmark rejects a post without a department + category; the subcategory is optional.
    if (!poshmark.poshmarkDeptId || !poshmark.poshmarkCatId) {
      toast.error("Select a Poshmark department and category");
      return false;
    }
    // Poshmark accepts a publish request with no size and silently leaves the listing as a
    // draft instead of erroring — catch it here for any category that actually has sizes
    // (some, like Jewelry or Other, don't).
    if (poshmark.poshmarkSizes.length > 0 && !values.poshmarkSizeId) {
      toast.error("Select a Poshmark size");
      return false;
    }
    return true;
  }

  async function onSaveDraft(values: FormValues) {
    if (isEbay && !validateEbayFields(values)) return;
    if (isPoshmark && !validatePoshmarkFields(values)) return;
    await createMutation.mutateAsync({
      inventoryItemId: values.inventoryItemId,
      marketplaceConnectionId: values.marketplaceConnectionId,
      marketplace: selectedConnection!.marketplace,
      price: values.price,
      title: values.title,
      description: values.description,
      marketplaceData: buildMarketplaceData(values),
    });
    onClose();
  }

  async function onSaveAndPublish(values: FormValues) {
    if (isEbay && !validateEbayFields(values)) return;
    if (isPoshmark && !validatePoshmarkFields(values)) return;
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
      toast.success("Listing published!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }

  const busy = formState.isSubmitting || createMutation.isPending || isPublishing;

  // getValues is kept in scope for any callers that may use it
  void getValues;

  return {
    // Form
    form,
    handleSubmit,

    // Data
    connections,
    inventoryItems,
    connectionsData,
    itemDetail,
    selectedItem,
    selectedConnection,
    selectedConnectionId,
    isEbay,
    isMercari,
    isPoshmark,

    // Cross-fill
    crossFill,
    // Exposed as lastAppliedItemRef for backward compatibility with debug panel in CreateListingForm.tsx
    lastAppliedItemRef: lastAppliedPrefillRef,
    prefillData,

    // Sub-hooks
    ebay,
    mercariCat,
    mercariShip,
    poshmark,

    // Mercari addresses
    mercariAddresses,
    mercariAddressesLoading,
    refreshingAddresses,
    handleRefreshAddresses,

    // eBay policies
    policiesLoading,
    policiesError,
    fulfillmentPolicies,
    paymentPolicies,
    returnPolicies,

    // Submit
    busy,
    isPublishing,
    onSaveDraft,
    onSaveAndPublish,
    onClose,
  };
}
