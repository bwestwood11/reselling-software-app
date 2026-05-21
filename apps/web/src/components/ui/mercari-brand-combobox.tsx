"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@repo/ui";

type Brand = { id: number; name: string };

interface MercariBrandComboboxProps {
  value: string | undefined;
  onChange: (id: string) => void;
}

export function MercariBrandCombobox({ value, onChange }: MercariBrandComboboxProps) {
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

  // When value changes externally, sync display name
  const selectedBrand = value ? brands.find((b) => String(b.id) === value) : null;

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

  const filtered = query.trim()
    ? brands
        .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 50)
    : [];

  function handleSelect(brand: Brand) {
    onChange(String(brand.id));
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedBrand ? (
        <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-3 py-2.5">
          <span className="truncate text-sm font-medium text-zinc-900">{selectedBrand.name}</span>
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
            className="border-zinc-200 pl-9 focus-visible:ring-red-400"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-red-400" />
          )}
        </div>
      )}

      {isOpen && query.trim() && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {filtered.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.map((brand) => (
                <li key={brand.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(brand)}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-900 hover:bg-red-50"
                  >
                    {brand.name}
                  </button>
                </li>
              ))}
              {filtered.length === 50 && (
                <li className="px-3 py-2 text-xs text-zinc-400">Showing first 50 results — type more to narrow down</li>
              )}
            </ul>
          ) : (
            <div className="px-3 py-3 text-sm text-zinc-500">
              No brands found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
