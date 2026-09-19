"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, Package } from "lucide-react";
import { Input } from "@repo/ui";
import { useInventory, useInventoryItem } from "@/hooks/use-inventory";

interface InventoryItemComboboxProps {
  value: string | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Searchable picker for inventory items. A plain <Select> rendering every item made the
 * dropdown unusable once a user had more than a couple dozen items — this fetches a small,
 * server-searched page instead of listing the whole inventory at once.
 */
export function InventoryItemCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Search your inventory…",
}: InventoryItemComboboxProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data, isFetching } = useInventory(
    { search: debouncedQuery, limit: "20" },
    { enabled: isOpen }
  );
  const { data: selectedData } = useInventoryItem(value ?? "");

  const items: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const selectedItem = selectedData?.data;

  function handleSelect(item: any) {
    onChange(item.id);
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
  }

  const showSelected = !!value && !!selectedItem && !isOpen;

  return (
    <div ref={containerRef} className="relative">
      {showSelected ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedItem.images?.[0]?.url ? (
              <img
                src={selectedItem.images[0].url}
                alt=""
                className="h-7 w-7 shrink-0 rounded object-cover"
              />
            ) : null}
            <span className="truncate text-sm font-medium text-zinc-900">{selectedItem.title}</span>
          </span>
          {!disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-2 shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-4 w-4" />
            </span>
          )}
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="border-zinc-200 pl-9 pr-8 focus-visible:ring-orange-400"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-400" />
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {items.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-orange-50"
                  >
                    {item.images?.[0]?.url ? (
                      <img
                        src={item.images[0].url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-100">
                        <Package className="h-4 w-4 text-zinc-300" />
                      </span>
                    )}
                    <span className="truncate">{item.title}</span>
                  </button>
                </li>
              ))}
              {total > items.length && (
                <li className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400">
                  {debouncedQuery
                    ? `Showing ${items.length} of ${total} matches — keep typing to narrow down`
                    : `Showing the ${items.length} most recent of ${total} items — type to search`}
                </li>
              )}
            </ul>
          ) : (
            <p className="px-3 py-2.5 text-sm text-zinc-500">
              {isFetching
                ? "Searching…"
                : debouncedQuery
                ? `No items found for "${debouncedQuery}"`
                : "No inventory items found"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
