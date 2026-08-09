"use client";

import { useState } from "react";
import { toast } from "sonner";
import { POSHMARK_DEPARTMENTS, POSHMARK_SIZE_MAP } from "@/lib/poshmark/data";

const MAX_COLORS = 2;
const MAX_STYLE_TAGS = 3;

/** Shared empty list so "no sizes for this category" keeps a stable identity across renders. */
const NO_SIZES: ReadonlyArray<{ id: string; display: string }> = [];

/**
 * Poshmark's taxonomy is a static three-level tree (department → category → subcategory) bundled
 * in `@/lib/poshmark/data` — there is no category API to query, so unlike Mercari this hook holds
 * plain selection state and derives everything else from the bundled tree.
 */
export function usePoshmarkFields() {
  const [poshmarkDeptId, setPoshmarkDeptId] = useState("");
  const [poshmarkCatId, setPoshmarkCatId] = useState("");
  const [poshmarkSubcatId, setPoshmarkSubcatId] = useState("");
  const [poshmarkColors, setPoshmarkColors] = useState<string[]>([]);
  const [poshmarkStyleTags, setPoshmarkStyleTags] = useState<string[]>([]);
  const [poshmarkTagInput, setPoshmarkTagInput] = useState("");
  // A size carried over by prefill, held as a label until a category (and therefore a size list)
  // is selected — Poshmark size IDs are only meaningful within one category.
  const [prefilledSizeLabel, setPoshmarkPrefilledSize] = useState<string | null>(null);

  const selectedPoshmarkDept = POSHMARK_DEPARTMENTS.find((d) => d.id === poshmarkDeptId);
  const selectedPoshmarkCat = selectedPoshmarkDept?.categories.find((c) => c.id === poshmarkCatId);
  const selectedPoshmarkSubcat = selectedPoshmarkCat?.subcategories.find(
    (s) => s.id === poshmarkSubcatId
  );

  // Size lookup: prefer subcategory → category (departments have no sizes of their own).
  const poshmarkSizes =
    POSHMARK_SIZE_MAP[poshmarkSubcatId] ?? POSHMARK_SIZE_MAP[poshmarkCatId] ?? NO_SIZES;

  const poshmarkCategoryPath = [
    selectedPoshmarkDept?.display,
    selectedPoshmarkCat?.display,
    selectedPoshmarkSubcat?.display,
  ]
    .filter(Boolean)
    .join(" › ");

  function togglePoshmarkColor(name: string) {
    setPoshmarkColors((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= MAX_COLORS) {
        toast.error(`You can select up to ${MAX_COLORS} colors`);
        return prev;
      }
      return [...prev, name];
    });
  }

  function addPoshmarkTag() {
    const tag = poshmarkTagInput.trim();
    if (!tag) return;
    if (poshmarkStyleTags.includes(tag)) {
      setPoshmarkTagInput("");
      return;
    }
    if (poshmarkStyleTags.length >= MAX_STYLE_TAGS) {
      toast.error(`You can add up to ${MAX_STYLE_TAGS} style tags`);
      return;
    }
    setPoshmarkStyleTags((prev) => [...prev, tag]);
    setPoshmarkTagInput("");
  }

  function removePoshmarkTag(tag: string) {
    setPoshmarkStyleTags((prev) => prev.filter((t) => t !== tag));
  }

  /**
   * Apply a category carried over by prefill. Each level is verified against the bundled tree —
   * a stale ID from an older listing is dropped rather than putting the selects in a state the
   * user cannot see or correct.
   */
  function applyPrefilledCategory(cat: {
    departmentId: string;
    categoryId?: string;
    subcategoryId?: string;
  }) {
    const dept = POSHMARK_DEPARTMENTS.find((d) => d.id === cat.departmentId);
    if (!dept) return;
    setPoshmarkDeptId(dept.id);

    const category = cat.categoryId
      ? dept.categories.find((c) => c.id === cat.categoryId)
      : undefined;
    setPoshmarkCatId(category?.id ?? "");

    const sub =
      category && cat.subcategoryId
        ? category.subcategories.find((s) => s.id === cat.subcategoryId)
        : undefined;
    setPoshmarkSubcatId(sub?.id ?? "");
  }

  return {
    poshmarkDeptId,
    setPoshmarkDeptId,
    poshmarkCatId,
    setPoshmarkCatId,
    poshmarkSubcatId,
    setPoshmarkSubcatId,
    poshmarkColors,
    setPoshmarkColors,
    togglePoshmarkColor,
    poshmarkStyleTags,
    setPoshmarkStyleTags,
    removePoshmarkTag,
    applyPrefilledCategory,
    prefilledSizeLabel,
    setPoshmarkPrefilledSize,
    poshmarkTagInput,
    setPoshmarkTagInput,
    addPoshmarkTag,
    selectedPoshmarkDept,
    selectedPoshmarkCat,
    poshmarkSizes,
    poshmarkCategoryPath,
    MAX_STYLE_TAGS,
  };
}
