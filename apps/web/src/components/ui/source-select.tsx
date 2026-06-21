"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSources } from "@/hooks/use-sources";
import { Search, X, Folder, Check, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatSource {
  id: string;
  name: string;
  parentId: string | null;
}

interface TreeNode extends FlatSource {
  depth: number;
  children: TreeNode[];
}

export interface SourceSelectProps {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
  className?: string;
  excludeId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPath(sources: FlatSource[], id: string): string {
  const parts: string[] = [];
  let cur = sources.find((s) => s.id === id);
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parentId ? sources.find((s) => s.id === cur!.parentId) : undefined;
  }
  return parts.join(" › ");
}

function buildParentPath(sources: FlatSource[], id: string): string | null {
  const source = sources.find((s) => s.id === id);
  if (!source?.parentId) return null;
  return buildPath(sources, source.parentId);
}

function buildTree(
  sources: FlatSource[],
  parentId: string | null,
  depth: number,
  excludeId?: string
): TreeNode[] {
  return sources
    .filter((s) => s.parentId === parentId && s.id !== excludeId)
    .map((s) => ({
      ...s,
      depth,
      children: buildTree(sources, s.id, depth + 1, excludeId),
    }));
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

function cx(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SourceSelect({
  value,
  onChange,
  placeholder = "No source",
  className,
  excludeId,
}: SourceSelectProps) {
  const { data: sources = [], isLoading } = useSources();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSource = value ? (sources.find((s) => s.id === value) ?? null) : null;
  const selectedPath = selectedSource ? buildPath(sources, selectedSource.id) : null;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-idx="${activeIndex}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const tree = useMemo(
    () => buildTree(sources, null, 0, excludeId),
    [sources, excludeId]
  );
  const allFlat = useMemo(() => flattenTree(tree), [tree]);

  const isSearching = query.trim().length > 0;

  const filteredNodes = useMemo(() => {
    if (!isSearching) return allFlat;
    const q = query.toLowerCase();
    return allFlat.filter((n) =>
      buildPath(sources, n.id).toLowerCase().includes(q)
    );
  }, [query, allFlat, sources, isSearching]);

  function open() {
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function handleSelect(id: string | undefined) {
    onChange(id);
    close();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        open();
      }
      return;
    }
    handleListKeyDown(e);
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredNodes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex === -1) {
        handleSelect(undefined);
      } else {
        const node = filteredNodes[activeIndex];
        if (node) handleSelect(node.id);
      }
    }
  }

  const hasAnySources = allFlat.length > 0;

  return (
    <div ref={containerRef} className={cx("relative", className)}>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cx(
          "flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-sm transition-all",
          "focus-visible:outline-none",
          isOpen
            ? "border-orange-400 shadow-[0_0_0_3px_rgba(249,115,22,0.12)]"
            : "border-zinc-200 hover:border-zinc-300",
          isLoading && "cursor-not-allowed opacity-50"
        )}
      >
        {/* Left: selected value or placeholder */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedSource ? (
            <>
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate text-zinc-900">
                {selectedPath ?? selectedSource.name}
              </span>
            </>
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </div>

        {/* Right: clear + chevron */}
        <div className="ml-2 flex shrink-0 items-center gap-0.5">
          {selectedSource && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cx(
              "h-4 w-4 text-zinc-400 transition-transform duration-150",
              isOpen && "-rotate-180"
            )}
          />
        </div>
      </button>

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50"
        >
          {/* Search input */}
          <div className="border-b border-zinc-100 px-2.5 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 ring-1 ring-zinc-200/60 focus-within:ring-orange-300">
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleListKeyDown}
                placeholder="Search folders…"
                className="flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Option list */}
          <div ref={listRef} className="max-h-56 overflow-y-auto py-1">
            {/* No-source option */}
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              onMouseEnter={() => setActiveIndex(-1)}
              className={cx(
                "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
                !value
                  ? "text-orange-600"
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
              )}
            >
              <span>{placeholder}</span>
              {!value && <Check className="h-3.5 w-3.5 text-orange-500" />}
            </button>

            {/* Divider */}
            {hasAnySources && (
              <div className="mx-3 my-1 h-px bg-zinc-100" />
            )}

            {/* No results */}
            {isSearching && filteredNodes.length === 0 && (
              <div className="px-3 py-5 text-center text-xs text-zinc-400">
                No folders match &ldquo;{query}&rdquo;
              </div>
            )}

            {/* No sources at all */}
            {!hasAnySources && !isSearching && (
              <div className="px-3 py-5 text-center text-xs text-zinc-400">
                No sources yet.{" "}
                <a
                  href="/inventory/sources"
                  className="text-orange-600 underline"
                >
                  Create one
                </a>
              </div>
            )}

            {/* Source rows */}
            {filteredNodes.map((node, i) => {
              const isSelected = value === node.id;
              const isActive = activeIndex === i;
              const parentPath = buildParentPath(sources, node.id);

              return (
                <button
                  key={node.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-idx={i}
                  onClick={() => handleSelect(node.id)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cx(
                    "flex w-full items-center gap-2.5 py-2 pr-3 text-sm transition-colors",
                    isActive
                      ? "bg-orange-50"
                      : isSelected
                        ? "bg-orange-50/60"
                        : "hover:bg-zinc-50"
                  )}
                  style={{
                    paddingLeft: isSearching
                      ? 12
                      : 12 + node.depth * 16,
                  }}
                >
                  {/* Folder icon */}
                  <div
                    className={cx(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-md",
                      isSelected || isActive
                        ? "bg-orange-100 text-orange-500"
                        : "bg-amber-50 text-amber-500"
                    )}
                  >
                    <Folder className="h-3.5 w-3.5" />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className={cx(
                        "truncate",
                        isSelected
                          ? "font-semibold text-orange-600"
                          : "text-zinc-800"
                      )}
                    >
                      {node.name}
                    </p>
                    {/* Show parent path when searching so user knows where it lives */}
                    {isSearching && parentPath && (
                      <p className="truncate text-[11px] text-zinc-400">
                        {parentPath}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          {hasAnySources && (
            <div className="border-t border-zinc-100 px-3 py-1.5">
              <p className="text-[10px] text-zinc-400">
                {isSearching
                  ? `${filteredNodes.length} of ${allFlat.length} folder${allFlat.length !== 1 ? "s" : ""}`
                  : `${allFlat.length} folder${allFlat.length !== 1 ? "s" : ""} — type to search`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
