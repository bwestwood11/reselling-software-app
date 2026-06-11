"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@repo/ui";

interface RawCat {
  id: number;
  name: string;
  parentId: number;
}

interface CatNode {
  id: string;
  label: string;
  parentId: string | null;
  hasChildren: boolean;
  fullPath: string[];
}

interface MercariCategoryComboboxProps {
  /** Stored value — full path like "Women › Tops & Tees › T-Shirts" */
  value: string | undefined;
  onChange: (path: string) => void;
  /** Color scheme — "red" for Mercari (default), "orange" for inventory */
  variant?: "red" | "orange";
}

function buildTree(raw: RawCat[]): {
  byId: Map<string, CatNode>;
  byParent: Map<string | null, CatNode[]>;
} {
  const parentIdSet = new Set<number>(raw.filter((c) => c.parentId > 0).map((c) => c.parentId));
  const rawById = new Map<number, RawCat>(raw.map((c) => [c.id, c]));

  function buildPath(cat: RawCat): string[] {
    const path: string[] = [];
    let cur: RawCat | undefined = cat;
    while (cur) {
      path.unshift(cur.name);
      cur = cur.parentId > 0 ? rawById.get(cur.parentId) : undefined;
    }
    return path;
  }

  const byId = new Map<string, CatNode>();
  const byParent = new Map<string | null, CatNode[]>();

  for (const cat of raw) {
    const parentId = cat.parentId === 0 ? null : String(cat.parentId);
    const node: CatNode = {
      id: String(cat.id),
      label: cat.name,
      parentId,
      hasChildren: parentIdSet.has(cat.id),
      fullPath: buildPath(cat),
    };
    byId.set(node.id, node);
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(node);
    byParent.set(parentId, siblings);
  }

  return { byId, byParent };
}

export function MercariCategoryCombobox({
  value,
  onChange,
  variant = "red",
}: MercariCategoryComboboxProps) {
  const [raw, setRaw] = useState<RawCat[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Drill-down state: stack of { id, label } for breadcrumb
  const [stack, setStack] = useState<Array<{ id: string; label: string }>>([]);
  const [children, setChildren] = useState<CatNode[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    import("@/data/mercari-categories.json")
      .then((m) => {
        const cats = (m.default as { itemCategories: RawCat[] }).itemCategories;
        setRaw(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  const { byId, byParent } = useMemo((): {
    byId: Map<string, CatNode>;
    byParent: Map<string | null, CatNode[]>;
  } => {
    if (raw.length === 0) return { byId: new Map(), byParent: new Map() };
    return buildTree(raw);
  }, [raw]);

  // Keep drill-down children in sync with stack
  useEffect(() => {
    const parentId = stack.length > 0 ? stack[stack.length - 1]!.id : null;
    const kids = (byParent.get(parentId) ?? []).sort((a, b) => a.label.localeCompare(b.label));
    setChildren(kids);
  }, [stack, byParent]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim() || byId.size === 0) return [];
    const lower = query.toLowerCase();
    const results: CatNode[] = [];
    for (const node of byId.values()) {
      if (node.label.toLowerCase().includes(lower) || node.fullPath.some((p) => p.toLowerCase().includes(lower))) {
        results.push(node);
        if (results.length >= 50) break;
      }
    }
    return results.sort((a, b) => a.fullPath.length - b.fullPath.length || a.label.localeCompare(b.label));
  }, [query, byId]);

  const accent = variant === "orange"
    ? { border: "border-orange-300", bg: "bg-orange-50", ring: "focus-visible:ring-orange-400", spin: "text-orange-400", hover: "hover:bg-orange-50", crumbHover: "hover:text-orange-700" }
    : { border: "border-red-300", bg: "bg-red-50", ring: "focus-visible:ring-red-400", spin: "text-red-400", hover: "hover:bg-red-50", crumbHover: "hover:text-red-700" };

  function selectNode(node: CatNode) {
    onChange(node.fullPath.join(" › "));
    setQuery("");
    setStack([]);
  }

  function drillInto(node: CatNode) {
    setStack((prev) => [...prev, { id: node.id, label: node.label }]);
    setQuery("");
  }

  function goBack(toIndex: number) {
    setStack((prev) => prev.slice(0, toIndex));
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        /* Selected state */
        <div className={`flex items-center justify-between rounded-xl border ${accent.border} ${accent.bg} px-3 py-2.5`}>
          <span className="truncate text-sm font-medium text-zinc-900">{value.split(" › ").pop()}</span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value.includes(" › ") && (
              <span className="hidden truncate text-xs text-zinc-400 sm:inline">
                {value.split(" › ").slice(0, -1).join(" › ")}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className={`border-zinc-200 pl-9 ${accent.ring}`}
            />
            {loading && (
              <Loader2 className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin ${accent.spin}`} />
            )}
          </div>

          {/* Results / drill-down panel */}
          {!loading && raw.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              {query.trim() ? (
                /* Search results */
                searchResults.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-zinc-400">
                    No categories found for &ldquo;{query}&rdquo;
                  </p>
                ) : (
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {searchResults.map((cat) => (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectNode(cat)}
                          className={`flex w-full flex-col items-start px-3 py-2 text-left ${accent.hover}`}
                        >
                          <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                          {cat.fullPath.length > 1 && (
                            <span className="text-xs text-zinc-400">{cat.fullPath.slice(0, -1).join(" › ")}</span>
                          )}
                        </button>
                      </li>
                    ))}
                    {searchResults.length === 50 && (
                      <li className="px-3 py-2 text-xs text-zinc-400">Showing first 50 — type more to narrow</li>
                    )}
                  </ul>
                )
              ) : (
                /* Drill-down browser */
                <>
                  {stack.length > 0 && (
                    <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                      <button
                        type="button"
                        onClick={() => goBack(0)}
                        className={`${accent.crumbHover}`}
                      >
                        All
                      </button>
                      {stack.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          <button
                            type="button"
                            onClick={() => goBack(i + 1)}
                            className={`${accent.crumbHover}`}
                          >
                            {crumb.label}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="max-h-60 overflow-y-auto py-1">
                    {children.map((cat) => (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (cat.hasChildren) {
                              drillInto(cat);
                            } else {
                              selectNode(cat);
                            }
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left ${accent.hover}`}
                        >
                          <span className="text-sm text-zinc-900">{cat.label}</span>
                          {cat.hasChildren && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
