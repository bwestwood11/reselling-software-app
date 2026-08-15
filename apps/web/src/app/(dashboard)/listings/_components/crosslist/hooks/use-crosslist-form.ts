"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CrosslistResult } from "@repo/types";
import type { SubscriptionInfo } from "@repo/types";
import { getMarketplaceLabel } from "@repo/utils";
import { marketplacesApi, uploadApi, subscriptionApi, aiApi, inventoryApi } from "@/lib/api";
import { useInventory, useInventoryItem, useCreateInventoryItem } from "@/hooks/use-inventory";
import { useCrosslistListings } from "@/hooks/use-listings";
import type { EditOptions } from "@/components/inventory/PhotoToolbar";
import {
  crosslistFormSchema,
  type CrosslistFormValues,
  type CrosslistFormInput,
  type CrosslistFormProps,
} from "../crosslist-form-schema";
import { useEbayCategories } from "../../hooks/use-ebay-categories";
import { useMercariCategories, type MercariCat } from "../../hooks/use-mercari-categories";
import { useMercariShipping } from "../../hooks/use-mercari-shipping";
import { usePoshmarkFields } from "../../hooks/use-poshmark-fields";
import type { MercariAddress } from "../../hooks/use-listing-form";

export type CrossFill = { source: string; fields: string[] };

const INITIAL_SLOTS = 3;
const MAX_IMAGES = 10;

interface ImageSlot {
  preview: string;
  url?: string;
  key?: string;
  uploading: boolean;
  error?: string;
}

const ELIGIBLE_MARKETPLACES = new Set(["EBAY", "MERCARI", "POSHMARK"]);

/**
 * How long the extension typically needs after the API has queued the job. The crosslist request
 * itself returns in ~1s with NEEDS_WEBVIEW, so without this window the progress card would vanish
 * while the listing is still being posted. Mercari and Poshmark both publish this way.
 */
const EXTENSION_PUBLISH_ESTIMATE_MS = 26_000;

/** Marketplaces whose publish is queued for the extension rather than done server-side. */
const EXTENSION_PUBLISHED = new Set(["MERCARI", "POSHMARK"]);

export function useCrosslistForm({ onClose }: CrosslistFormProps) {
  const createItemMutation = useCreateInventoryItem();
  const crosslistMutation = useCrosslistListings();
  const [isPublishing, setIsPublishing] = useState(false);
  // True while a queued Mercari job is still being posted by the extension (see the estimate above).
  const [backgroundPublishing, setBackgroundPublishing] = useState(false);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
    },
    []
  );
  const [results, setResults] = useState<CrosslistResult[] | null>(null);

  const [itemMode, setItemMode] = useState<"existing" | "new">("existing");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);

  // ── Sub-hooks (shared with the single-marketplace form) ────────────────────

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
  const eligibleConnections = connections.filter((c: any) => ELIGIBLE_MARKETPLACES.has(c.marketplace));

  function toggleConnection(id: string) {
    setSelectedConnectionIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const isEbay = selectedConnectionIds.some(
    (id) => connections.find((c: any) => c.id === id)?.marketplace === "EBAY"
  );
  const isMercari = selectedConnectionIds.some(
    (id) => connections.find((c: any) => c.id === id)?.marketplace === "MERCARI"
  );

  const isPoshmark = selectedConnectionIds.some(
    (id) => connections.find((c: any) => c.id === id)?.marketplace === "POSHMARK"
  );

  const mercariShip = useMercariShipping(isMercari, mercariCat.selectedMercariCat?.id);

  // ── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<CrosslistFormInput, any, CrosslistFormValues>({
    resolver: zodResolver(crosslistFormSchema),
    defaultValues: { itemMode: "existing", newCondition: "GOOD", newQuantity: 1 },
  });
  const { setValue, watch, handleSubmit, formState } = form;

  const selectedItemId = watch("inventoryItemId");
  const { data: itemDetailData } = useInventoryItem(itemMode === "existing" ? selectedItemId || "" : "");
  const itemDetail = itemDetailData?.data;
  const selectedExistingItem =
    itemDetail ?? inventoryItems.find((i: any) => i.id === selectedItemId);

  // ── Already-posted detection ────────────────────────────────────────────────
  // A DRAFT/PENDING/ACTIVE listing already exists for this item on a marketplace —
  // block re-selecting that marketplace so the user doesn't create a duplicate listing.
  // ENDED/FAILED/SOLD listings don't block — those marketplaces are free to re-list on.

  const existingListingsByMarketplace: Record<string, any> =
    itemMode === "existing" && itemDetail?.listings
      ? itemDetail.listings.reduce((acc: Record<string, any>, l: any) => {
          if (["DRAFT", "PENDING", "ACTIVE"].includes(l.status) && !acc[l.marketplace]) {
            acc[l.marketplace] = l;
          }
          return acc;
        }, {})
      : {};

  // Drop any already-selected marketplace that just became blocked (e.g. switching items, or
  // the item detail finishing its async load). Keyed on the blocked-marketplace set itself
  // (not the object reference, which is new every render) to avoid re-running every render.
  const blockedMarketplacesKey = Object.keys(existingListingsByMarketplace).sort().join(",");
  useEffect(() => {
    setSelectedConnectionIds((prev) =>
      prev.filter((id) => {
        const conn = connections.find((c: any) => c.id === id);
        return !conn || !existingListingsByMarketplace[conn.marketplace];
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemMode, selectedItemId, blockedMarketplacesKey]);

  // ── Mercari category init ─────────────────────────────────────────────────

  useEffect(() => {
    if (isMercari && mercariCat.mercariChildren.length === 0 && !mercariCat.mercariLoading) {
      mercariCat.loadMercariChildren(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMercari]);

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

  // ── Pre-fill via backend endpoint (existing-item mode, per selected marketplace) ────
  // Fetched independently per marketplace since a single item can now target both at once.

  const detailId = itemMode === "existing" ? selectedItemId || "" : "";

  const sharedFieldsAppliedRef = useRef<string | null>(null);
  function applySharedFieldsOnce(data: { title?: string; price?: number; description?: string }) {
    if (sharedFieldsAppliedRef.current === detailId) return;
    sharedFieldsAppliedRef.current = detailId;
    if (data.title) setValue("title", data.title);
    if (data.price != null) setValue("price", data.price);
    if (data.description) setValue("description", data.description);
  }

  const { data: ebayPrefillResult } = useQuery({
    queryKey: ["prefill", detailId, "EBAY"],
    queryFn: () => inventoryApi.getPrefill(detailId, "EBAY"),
    enabled: itemMode === "existing" && isEbay && !!detailId,
    staleTime: 30_000,
  });
  const ebayPrefillData = ebayPrefillResult?.data;
  const lastAppliedEbayPrefillRef = useRef<string | null>(null);
  const [ebayCrossFill, setEbayCrossFill] = useState<CrossFill | null>(null);

  useEffect(() => {
    if (!ebayPrefillData || !detailId) return;
    if (lastAppliedEbayPrefillRef.current === detailId) return;
    lastAppliedEbayPrefillRef.current = detailId;

    applySharedFieldsOnce(ebayPrefillData);

    if (ebayPrefillData.ebay) {
      const e = ebayPrefillData.ebay;
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

    if (ebayPrefillData.filledFields.length > 0) {
      const label =
        ebayPrefillData.source && ebayPrefillData.source !== "INVENTORY"
          ? getMarketplaceLabel(ebayPrefillData.source as any)
          : "item details";
      setEbayCrossFill({ source: label, fields: ebayPrefillData.filledFields });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebayPrefillData, detailId]);

  const { data: mercariPrefillResult } = useQuery({
    queryKey: ["prefill", detailId, "MERCARI"],
    queryFn: () => inventoryApi.getPrefill(detailId, "MERCARI"),
    enabled: itemMode === "existing" && isMercari && !!detailId,
    staleTime: 30_000,
  });
  const mercariPrefillData = mercariPrefillResult?.data;
  const lastAppliedMercariPrefillRef = useRef<string | null>(null);
  const [mercariCrossFill, setMercariCrossFill] = useState<CrossFill | null>(null);
  // Tracks the current search term seeded by prefill (null = not in prefill-search mode)
  const prefillSearchTermRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mercariPrefillData || !detailId) return;
    if (lastAppliedMercariPrefillRef.current === detailId) return;
    lastAppliedMercariPrefillRef.current = detailId;

    applySharedFieldsOnce(mercariPrefillData);

    if (mercariPrefillData.mercari) {
      const m = mercariPrefillData.mercari;
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
            while (cur) {
              path.unshift(cur.name);
              cur = cur.parentId > 0 ? rawById.get(cur.parentId) : undefined;
            }
            return path;
          }

          let match: RawCat | undefined;

          if (hasSuggestions) {
            for (const catId of m.categorySuggestions!) {
              match = raw.find((c) => String(c.id) === catId && !parentIdSet.has(c.id));
              if (match) break;
              match = raw.find((c) => String(c.id) === catId);
              if (match) break;
            }
          }

          if (!match && hasCatPath) {
            const leaf = m.categoryPath![m.categoryPath!.length - 1]!;
            const targetPath = m.categoryPath!.join(" › ");
            match = raw.find((c) => buildPath(c).join(" › ") === targetPath);
            if (!match)
              match = raw.find((c) => !parentIdSet.has(c.id) && c.name.toLowerCase() === leaf.toLowerCase());
            if (!match) match = raw.find((c) => c.name.toLowerCase() === leaf.toLowerCase());

            if (!match) {
              prefillSearchTermRef.current = leaf;
              mercariCat.setMercariSearch(leaf);
              mercariCat.searchCategories(leaf);
            }
          }

          if (match) {
            const fp = buildPath(match);
            const node: MercariCat = {
              id: String(match.id),
              label: match.name,
              hasChildren: parentIdSet.has(match.id),
              fullPath: fp,
              isLeaf: !parentIdSet.has(match.id),
              isSizeRequired: false,
              sizeSchemaId: null,
            };
            mercariCat.setSelectedMercariCat(node);
            setValue("mercariCategoryId", node.id);
          }
        });
      }
    }

    if (mercariPrefillData.filledFields.length > 0) {
      const label =
        mercariPrefillData.source && mercariPrefillData.source !== "INVENTORY"
          ? getMarketplaceLabel(mercariPrefillData.source as any)
          : "item details";
      setMercariCrossFill({ source: label, fields: mercariPrefillData.filledFields });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mercariPrefillData, detailId]);

  // Mercari category search progressive fallback — when the prefill-seeded search returns
  // no results, strip the last word and retry, until results appear or one word remains.
  useEffect(() => {
    if (!isMercari || prefillSearchTermRef.current === null) return;
    if (mercariCat.mercariSearch !== prefillSearchTermRef.current) {
      prefillSearchTermRef.current = null;
      return;
    }
    if (mercariCat.mercariSearching) return;
    if (mercariCat.selectedMercariCat) {
      prefillSearchTermRef.current = null;
      return;
    }
    if (mercariCat.mercariSearchResults.length > 0) {
      prefillSearchTermRef.current = null;
      return;
    }
    const q = prefillSearchTermRef.current.trim();
    const words = q.split(/\s+/);
    if (words.length <= 1) {
      prefillSearchTermRef.current = null;
      return;
    }
    const shorter = words.slice(0, -1).join(" ");
    prefillSearchTermRef.current = shorter;
    mercariCat.setMercariSearch(shorter);
    mercariCat.searchCategories(shorter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMercari,
    mercariCat.mercariSearch,
    mercariCat.mercariSearching,
    mercariCat.mercariSearchResults.length,
    mercariCat.selectedMercariCat,
  ]);

  // ── Poshmark prefill ──────────────────────────────────────────────────────
  // Poshmark's taxonomy is category-scoped and has no cross-marketplace mapping, so the category
  // only ever comes from a prior Poshmark listing on the same item. Everything else (condition,
  // brand, colors, tags) fills from the item or that prior listing.

  const { data: poshmarkPrefillResult } = useQuery({
    queryKey: ["prefill", detailId, "POSHMARK"],
    queryFn: () => inventoryApi.getPrefill(detailId, "POSHMARK"),
    enabled: itemMode === "existing" && isPoshmark && !!detailId,
    staleTime: 30_000,
  });
  const poshmarkPrefillData = poshmarkPrefillResult?.data;
  const lastAppliedPoshmarkPrefillRef = useRef<string | null>(null);
  const [poshmarkCrossFill, setPoshmarkCrossFill] = useState<CrossFill | null>(null);

  useEffect(() => {
    if (!poshmarkPrefillData || !detailId) return;
    if (lastAppliedPoshmarkPrefillRef.current === detailId) return;
    lastAppliedPoshmarkPrefillRef.current = detailId;

    applySharedFieldsOnce(poshmarkPrefillData);

    const p = poshmarkPrefillData.poshmark;
    if (p) {
      if (p.condition) setValue("poshmarkCondition", p.condition);
      if (p.brand) setValue("poshmarkBrand", p.brand);
      if (p.originalPriceCents != null)
        setValue("poshmarkOriginalPrice", p.originalPriceCents / 100);
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

    if (poshmarkPrefillData.filledFields.length > 0) {
      const label =
        poshmarkPrefillData.source && poshmarkPrefillData.source !== "INVENTORY"
          ? getMarketplaceLabel(poshmarkPrefillData.source as any)
          : "item details";
      setPoshmarkCrossFill({ source: label, fields: poshmarkPrefillData.filledFields });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poshmarkPrefillData, detailId]);

  // Resolve the prefilled size label once the category's size list is known. The list only
  // exists after a category is picked, which may happen after the prefill lands.
  const prefilledSizeLabel = poshmark.prefilledSizeLabel;
  useEffect(() => {
    if (!prefilledSizeLabel || poshmark.poshmarkSizes.length === 0) return;
    const match = poshmark.poshmarkSizes.find(
      (s) => s.display.toLowerCase() === prefilledSizeLabel.toLowerCase() || s.id === prefilledSizeLabel
    );
    if (match) setValue("poshmarkSizeId", match.id);
    poshmark.setPoshmarkPrefilledSize(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledSizeLabel, poshmark.poshmarkSizes]);

  const crossFillBanners = [ebayCrossFill, mercariCrossFill, poshmarkCrossFill].filter(
    (c): c is CrossFill => !!c
  );

  // ── New-item photo management (ported from /inventory/new) ─────────────────

  const { data: subData } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 60_000,
  });
  const subscription = subData?.data;

  const [images, setImages] = useState<(ImageSlot | undefined)[]>(
    Array(INITIAL_SLOTS).fill(undefined)
  );
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [editOptions, setEditOptions] = useState<EditOptions>({
    removeBackground: false,
    flatLay: false,
    ironing: false,
    ghostMannequin: false,
  });
  function toggleEditOption(key: keyof EditOptions) {
    setEditOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);
  const draggedIndexRef = useRef<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);

  function openPicker(slotIndex: number) {
    pendingSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    let slot = pendingSlotRef.current;
    const updates = [...images];
    const toUpload: Array<{ file: File; slotIndex: number }> = [];

    for (const file of files) {
      while (slot < updates.length && updates[slot] !== undefined) slot++;
      if (slot >= MAX_IMAGES) break;
      if (slot >= updates.length) updates.push(undefined);

      const preview = URL.createObjectURL(file);
      updates[slot] = { preview, uploading: true };
      toUpload.push({ file, slotIndex: slot });
      slot++;
    }

    setImages([...updates]);
    e.target.value = "";

    await Promise.all(
      toUpload.map(async ({ file, slotIndex }) => {
        try {
          const { url, key } = await uploadApi.uploadImage(file, editOptions);
          setImages((prev) => {
            const next = [...prev];
            const existing = next[slotIndex];
            if (existing) {
              URL.revokeObjectURL(existing.preview);
              next[slotIndex] = { preview: url, url, key, uploading: false };
            }
            return next;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setImages((prev) => {
            const next = [...prev];
            const existing = next[slotIndex];
            if (existing) next[slotIndex] = { ...existing, uploading: false, error: message };
            return next;
          });
        }
      })
    );
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const slot = next[index];
      if (slot) URL.revokeObjectURL(slot.preview);
      next[index] = undefined;
      while (next.length > INITIAL_SLOTS && next[next.length - 1] === undefined) {
        next.pop();
      }
      return next;
    });
  }

  function addImageSlot() {
    if (images.length >= MAX_IMAGES) return;
    setImages((prev) => [...prev, undefined]);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  }
  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = draggedIndexRef.current;
    if (from === -1 || from === index) {
      setDragOverIndex(-1);
      return;
    }
    setImages((prev) => {
      const next = [...prev];
      [next[from], next[index]] = [next[index], next[from]];
      return next;
    });
    setDragOverIndex(-1);
    draggedIndexRef.current = -1;
  }
  function handleDragEnd() {
    setDragOverIndex(-1);
    draggedIndexRef.current = -1;
  }
  function makePrimary(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  const filledImageCount = images.filter((s) => s?.url).length;
  const uploadingImages = images.some((s) => s?.uploading);

  async function handleGenerateDescription() {
    const urls = images.filter((s) => s?.url).map((s) => s!.url!);
    if (urls.length === 0) return;
    setIsGeneratingDescription(true);
    try {
      const title = watch("title") || undefined;
      const result = await aiApi.generateDescription(urls, title);
      setValue("description", result.data.description);
      toast.success("Description generated");
    } catch {
      toast.error("AI generation failed — check your API key and try again");
    } finally {
      setIsGeneratingDescription(false);
    }
  }

  // Preview object for the "new item" mode, built from live form state
  const newItemPreview =
    itemMode === "new"
      ? {
          title: watch("title"),
          brand: watch("newBrand"),
          condition: watch("newCondition"),
          images: images
            .filter((s): s is ImageSlot => !!s?.url)
            .map((s) => ({ url: s.url!, isPrimary: false })),
        }
      : null;

  const selectedItem = itemMode === "existing" ? selectedExistingItem : newItemPreview;

  // ── Marketplace-data builders ───────────────────────────────────────────────

  function buildEbayMarketplaceData(values: CrosslistFormValues) {
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

  function buildMercariMarketplaceData(values: CrosslistFormValues) {
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

  function buildPoshmarkMarketplaceData(values: CrosslistFormValues) {
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

  function validatePoshmarkFields(values: CrosslistFormValues): boolean {
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

  function validateEbayFields(values: CrosslistFormValues): boolean {
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

  // ── Submit ───────────────────────────────────────────────────────────────

  async function onSubmit(values: CrosslistFormValues, { publish }: { publish: boolean }) {
    if (selectedConnectionIds.length === 0) {
      toast.error("Select at least one marketplace");
      return;
    }
    if (isEbay && !validateEbayFields(values)) return;
    if (isPoshmark && !validatePoshmarkFields(values)) return;
    if (itemMode === "existing" && !values.inventoryItemId) {
      toast.error("Select an inventory item");
      return;
    }

    setIsPublishing(publish);
    try {
      let inventoryItemId = values.inventoryItemId;

      if (itemMode === "new") {
        const created = await createItemMutation.mutateAsync({
          title: values.title,
          description: values.description,
          brand: values.newBrand,
          sku: values.newSku,
          condition: values.newCondition,
          quantity: values.newQuantity,
          costPrice: values.newCostPrice === "" ? undefined : values.newCostPrice,
          targetPrice: values.price,
          weight: values.newWeight === "" ? undefined : values.newWeight,
          category: values.newCategory,
          notes: values.newNotes,
          sourceId: values.newSourceId,
          images: images
            .map((slot, i) =>
              slot?.url && slot.key
                ? { url: slot.url, key: slot.key, isPrimary: i === 0, sortOrder: i }
                : null
            )
            .filter(Boolean),
        });
        inventoryItemId = created?.data?.id;
        if (!inventoryItemId) throw new Error("Could not create inventory item");
      }

      const marketplaces = selectedConnectionIds.map((connectionId) => {
        const conn = connections.find((c: any) => c.id === connectionId);
        const marketplaceData =
          conn?.marketplace === "EBAY"
            ? buildEbayMarketplaceData(values)
            : conn?.marketplace === "MERCARI"
              ? buildMercariMarketplaceData(values)
              : conn?.marketplace === "POSHMARK"
                ? buildPoshmarkMarketplaceData(values)
                : undefined;
        return { connectionId, marketplaceData };
      });

      const res = await crosslistMutation.mutateAsync({
        inventoryItemId,
        price: values.price,
        title: values.title,
        description: values.description,
        publishImmediately: publish,
        marketplaces,
      });

      const resultList: CrosslistResult[] = res?.data ?? [];
      setResults(resultList);

      // Mercari and Poshmark come back as NEEDS_WEBVIEW: queued, not posted. Hold the progress
      // card open for the extension's round trip so the user can see it is still working.
      const extensionQueued =
        publish &&
        resultList.some((r) => EXTENSION_PUBLISHED.has(r.marketplace) && r.status !== "error");
      if (extensionQueued) {
        setBackgroundPublishing(true);
        if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = setTimeout(
          () => setBackgroundPublishing(false),
          EXTENSION_PUBLISH_ESTIMATE_MS
        );
      }

      const failed = resultList.filter((r) => r.status === "error").length;
      const ok = resultList.length - failed;
      if (failed === 0) {
        toast.success(`${publish ? "Published" : "Saved"} to ${ok} marketplace${ok === 1 ? "" : "s"}`);
      } else {
        toast.error(`${failed} of ${resultList.length} marketplaces failed — see results below`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to crosslist");
    } finally {
      setIsPublishing(false);
    }
  }

  const busy =
    formState.isSubmitting || createItemMutation.isPending || crosslistMutation.isPending || isPublishing;

  return {
    // Form
    form,
    handleSubmit,
    itemMode,
    setItemMode,

    // Data
    connections,
    eligibleConnections,
    inventoryItems,
    selectedConnectionIds,
    toggleConnection,
    selectedItem,
    isEbay,
    isMercari,
    isPoshmark,
    crossFillBanners,
    existingListingsByMarketplace,

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

    // New-item photos
    subscription,
    images,
    editOptions,
    toggleEditOption,
    fileInputRef,
    dragOverIndex,
    openPicker,
    onFilesSelected,
    removeImage,
    addImageSlot,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    makePrimary,
    filledImageCount,
    uploadingImages,
    isGeneratingDescription,
    handleGenerateDescription,
    MAX_IMAGES,

    // Submit
    busy,
    isPublishing,
    backgroundPublishing,
    results,
    setResults,
    onSubmit,
    onClose,
  };
}
