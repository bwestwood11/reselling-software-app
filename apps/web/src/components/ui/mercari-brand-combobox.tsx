"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@repo/ui";

type Brand = { id: number; name: string };

interface MercariBrandComboboxProps {
  value: string | undefined;
  onChange: (value: string) => void;
  /** When true, value is brand name and onChange receives brand name instead of ID */
  storeName?: boolean;
  /** Color scheme — "red" for Mercari (default), "orange" for inventory */
  variant?: "red" | "orange";
}

export function MercariBrandCombobox({ value, onChange, storeName = false, variant = "red" }: MercariBrandComboboxProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load brands data
  useEffect(() => {
    setLoading(true);
    import("@/data/mercari-brands.json")
      .then((m) => setBrands(m.default as Brand[]))
      .finally(() => setLoading(false));
  }, []);

  // Known brand match; null for custom values
  const selectedBrand = value
    ? brands.find((b) => (storeName ? b.name === value : String(b.id) === value)) ?? null
    : null;

  // A value is set but doesn't match any known brand — treat as custom
  const isCustomValue = storeName && !!value && !selectedBrand && brands.length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const trimmed = query.trim();
  const filtered = trimmed
    ? brands.filter((b) => b.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 50)
    : [];

  // Show "use as custom" when storeName and the typed text isn't an exact match
  const showCustomOption = storeName && trimmed.length > 0
    && !brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase());

  const accent = variant === "orange"
    ? { border: "border-orange-300", bg: "bg-orange-50", ring: "focus-visible:ring-orange-400", spin: "text-orange-400", hover: "hover:bg-orange-50", customBtn: "text-orange-600 hover:bg-orange-50" }
    : { border: "border-red-300", bg: "bg-red-50", ring: "focus-visible:ring-red-400", spin: "text-red-400", hover: "hover:bg-red-50", customBtn: "text-red-600 hover:bg-red-50" };

  function handleSelect(brand: Brand) {
    onChange(storeName ? brand.name : String(brand.id));
    setQuery("");
    setIsOpen(false);
  }

  function handleSelectCustom() {
    onChange(trimmed);
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setIsOpen(false);
  }

  const showSelected = selectedBrand || isCustomValue;

  return (
    <div ref={containerRef} className="relative">
      {showSelected ? (
        <div className={`flex items-center justify-between rounded-xl border ${isCustomValue ? "border-zinc-300 bg-zinc-50" : `${accent.border} ${accent.bg}`} px-3 py-2.5`}>
          <div className="min-w-0">
            <span className="truncate text-sm font-medium text-zinc-900">
              {selectedBrand ? selectedBrand.name : value}
            </span>
            {isCustomValue && (
              <span className="ml-2 text-xs text-zinc-400">custom</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => { if (query.trim()) setIsOpen(true); }}
            placeholder="Search brands…"
            className={`border-zinc-200 pl-9 ${accent.ring}`}
          />
          {loading && (
            <Loader2 className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin ${accent.spin}`} />
          )}
        </div>
      )}

      {isOpen && trimmed && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {filtered.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.map((brand) => (
                <li key={brand.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(brand)}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm text-zinc-900 ${accent.hover}`}
                  >
                    {brand.name}
                  </button>
                </li>
              ))}
              {filtered.length === 50 && (
                <li className="px-3 py-2 text-xs text-zinc-400">Showing first 50 — type more to narrow down</li>
              )}
              {showCustomOption && (
                <li className="border-t border-zinc-100">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleSelectCustom}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium ${accent.customBtn}`}
                  >
                    Use &ldquo;{trimmed}&rdquo; as custom brand
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <div>
              <p className="px-3 py-2.5 text-sm text-zinc-500">
                No brands found for &ldquo;{trimmed}&rdquo;
              </p>
              {showCustomOption && (
                <div className="border-t border-zinc-100">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleSelectCustom}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium ${accent.customBtn}`}
                  >
                    Use &ldquo;{trimmed}&rdquo; as custom brand
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
