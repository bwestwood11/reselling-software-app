"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { marketplacesApi } from "@/lib/api";

export type Aspect = { name: string; required: boolean; suggestedValues: string[] };
export type SelectedCategory = { categoryId: string; breadcrumb: string };

export function useEbayCategories() {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryResults, setCategoryResults] = useState<any[]>([]);
  const [categorySearching, setCategorySearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [aspects, setAspects] = useState<Aspect[]>([]);
  const [aspectsLoading, setAspectsLoading] = useState(false);
  const [aspectsError, setAspectsError] = useState<string | null>(null);
  const [specificValues, setSpecificValues] = useState<Record<string, string>>({});
  const [extraSpecifics, setExtraSpecifics] = useState<Array<{ name: string; value: string }>>([]);

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

  async function selectCategory(cat: SelectedCategory, setCategoryIdFn: (id: string) => void) {
    setSelectedCategory(cat);
    setCategoryIdFn(cat.categoryId);
    setCategoryQuery("");
    setShowCategoryDropdown(false);
    setAspectsLoading(true);
    setAspectsError(null);
    setExtraSpecifics([]);
    try {
      const res = await marketplacesApi.getEbayCategoryAspects(cat.categoryId);
      const loaded: Aspect[] = res?.data ?? [];
      setAspects(loaded);
      // If a seeded value isn't in the suggested list, move it to the custom slot
      setSpecificValues((prev) => {
        const next = { ...prev };
        for (const aspect of loaded) {
          const seeded = prev[aspect.name];
          if (
            seeded &&
            seeded !== "__custom__" &&
            aspect.suggestedValues.length > 0 &&
            !aspect.suggestedValues.includes(seeded)
          ) {
            next[aspect.name] = "__custom__";
            next[`${aspect.name}__custom`] = seeded;
          }
        }
        return next;
      });
    } catch (err) {
      setAspects([]);
      setAspectsError(err instanceof Error ? err.message : "Failed to load item specifics");
    } finally {
      setAspectsLoading(false);
    }
  }

  function clearCategory(setCategoryIdFn: (id: string) => void) {
    setSelectedCategory(null);
    setCategoryIdFn("");
    setCategoryQuery("");
    setAspects([]);
    setExtraSpecifics([]);
  }

  function resolvedSpecificValue(name: string): string {
    const val = specificValues[name] ?? "";
    return val === "__custom__" ? (specificValues[`${name}__custom`] ?? "") : val;
  }

  return {
    categoryQuery,
    setCategoryQuery,
    categoryResults,
    categorySearching,
    selectedCategory,
    setSelectedCategory,
    showCategoryDropdown,
    setShowCategoryDropdown,
    categoryRef,
    searchCategories,
    selectCategory,
    clearCategory,
    aspects,
    setAspects,
    aspectsLoading,
    aspectsError,
    specificValues,
    setSpecificValues,
    extraSpecifics,
    setExtraSpecifics,
    resolvedSpecificValue,
  };
}
