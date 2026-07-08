"use client";

import { useState, useRef } from "react";
import { mercariApi } from "@/lib/api";

export type MercariCat = {
  id: string;
  label: string;
  isLeaf: boolean;
  hasChildren: boolean;
  fullPath: string[];
  isSizeRequired: boolean;
  sizeSchemaId: string | null;
};

export function useMercariCategories() {
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

  function drillInto(cat: MercariCat) {
    setMercariStack((prev) => [...prev, { id: cat.id, label: cat.label }]);
    loadMercariChildren(cat.id);
    setMercariSearch("");
    setMercariSearchResults([]);
  }

  function goBack(toIndex: number) {
    const newStack = mercariStack.slice(0, toIndex);
    setMercariStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1]!.id : null;
    loadMercariChildren(parentId);
    setMercariSearch("");
    setMercariSearchResults([]);
  }

  function searchCategories(q: string) {
    if (mercariDebounceRef.current) clearTimeout(mercariDebounceRef.current);
    if (!q.trim()) {
      setMercariSearchResults([]);
      return;
    }
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

  function clearCategory() {
    setSelectedMercariCat(null);
    setMercariStack([]);
    loadMercariChildren(null);
  }

  return {
    mercariStack,
    mercariChildren,
    mercariLoading,
    selectedMercariCat,
    setSelectedMercariCat,
    mercariSearch,
    setMercariSearch,
    mercariSearchResults,
    mercariSearching,
    loadMercariChildren,
    drillInto,
    goBack,
    searchCategories,
    clearCategory,
  };
}
