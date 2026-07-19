"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSources } from "@/hooks/use-sources";
import { inventoryApi } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, X, Folder, Check, Loader2, PackageX } from "lucide-react";
import { toast } from "sonner";

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

interface MoveToSourceDialogProps {
  open: boolean;
  onClose: () => void;
  /** IDs of the inventory items to move. */
  itemIds: string[];
  /** Current source of the item(s) — used to mark/skip the current folder. */
  currentSourceId?: string | null;
  /** Called after a successful move. */
  onMoved?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}

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
  depth: number
): TreeNode[] {
  return sources
    .filter((s) => s.parentId === parentId)
    .map((s) => ({
      ...s,
      depth,
      children: buildTree(sources, s.id, depth + 1),
    }));
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveToSourceDialog({
  open,
  onClose,
  itemIds,
  currentSourceId,
  onMoved,
}: MoveToSourceDialogProps) {
  const { data: sources = [] } = useSources();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const count = itemIds.length;

  // Reset state each open
  useEffect(() => {
    if (open) {
      setQuery("");
      setMovingTo(null);
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const tree = useMemo(() => buildTree(sources, null, 0), [sources]);
  const allFlat = useMemo(() => flattenTree(tree), [tree]);

  const isSearching = query.trim().length > 0;
  const filteredNodes = useMemo(() => {
    if (!isSearching) return allFlat;
    const q = query.toLowerCase();
    return allFlat.filter((n) =>
      buildPath(sources, n.id).toLowerCase().includes(q)
    );
  }, [query, allFlat, sources, isSearching]);

  async function move(targetId: string | null) {
    if (movingTo !== null) return;
    // No-op if items are already in the chosen source.
    if ((currentSourceId ?? null) === targetId) {
      onClose();
      return;
    }
    setMovingTo(targetId ?? "__none__");
    try {
      await Promise.all(
        itemIds.map((id) => inventoryApi.update(id, { sourceId: targetId }))
      );
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      const dest =
        targetId === null
          ? "Unassigned"
          : (sources.find((s) => s.id === targetId)?.name ?? "source");
      toast.success(
        `${count} item${count !== 1 ? "s" : ""} moved to ${dest}`
      );
      onMoved?.();
      onClose();
    } catch {
      toast.error("Failed to move item" + (count !== 1 ? "s" : ""));
      setMovingTo(null);
    }
  }

  const hasAnySources = allFlat.length > 0;
  const busy = movingTo !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[80vh] max-w-md flex-col gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Move {count > 1 ? `${count} items` : "item"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Choose a folder to move{" "}
              {count > 1 ? "these items" : "this item"} into
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search folders…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Source list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {/* Unassigned option */}
          {!isSearching && (
            <button
              type="button"
              onClick={() => void move(null)}
              disabled={busy}
              className={cx(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed",
                (currentSourceId ?? null) === null
                  ? "bg-zinc-50/60 text-zinc-400"
                  : "hover:bg-zinc-50"
              )}
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-400">
                <PackageX className="h-3.5 w-3.5" />
              </div>
              <span className="min-w-0 flex-1 truncate text-left text-zinc-700">
                No source (Unassigned)
              </span>
              {movingTo === "__none__" && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-orange-500" />
              )}
              {(currentSourceId ?? null) === null && movingTo === null && (
                <Check className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
              )}
            </button>
          )}

          {!isSearching && hasAnySources && (
            <div className="mx-4 my-1 h-px bg-zinc-100" />
          )}

          {/* No results */}
          {isSearching && filteredNodes.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-zinc-400">
              No folders match &ldquo;{query}&rdquo;
            </div>
          )}

          {/* No sources at all */}
          {!hasAnySources && !isSearching && (
            <div className="px-4 py-6 text-center text-xs text-zinc-400">
              No sources yet.{" "}
              <a href="/inventory/sources" className="text-orange-600 underline">
                Create one
              </a>
            </div>
          )}

          {/* Source rows */}
          {filteredNodes.map((node) => {
            const isCurrent = node.id === currentSourceId;
            const parentPath = buildParentPath(sources, node.id);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => void move(node.id)}
                disabled={busy || isCurrent}
                className={cx(
                  "flex w-full items-center gap-2.5 py-2.5 pr-4 text-sm transition-colors disabled:cursor-not-allowed",
                  isCurrent ? "bg-zinc-50/60" : "hover:bg-orange-50"
                )}
                style={{ paddingLeft: isSearching ? 16 : 16 + node.depth * 16 }}
              >
                <div
                  className={cx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-md",
                    isCurrent
                      ? "bg-zinc-100 text-zinc-400"
                      : "bg-amber-50 text-amber-500"
                  )}
                >
                  <Folder className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p
                    className={cx(
                      "truncate",
                      isCurrent ? "text-zinc-400" : "text-zinc-800"
                    )}
                  >
                    {node.name}
                    {isCurrent && (
                      <span className="ml-1.5 text-[11px] text-zinc-400">
                        (current)
                      </span>
                    )}
                  </p>
                  {isSearching && parentPath && (
                    <p className="truncate text-[11px] text-zinc-400">
                      {parentPath}
                    </p>
                  )}
                </div>
                {movingTo === node.id && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-orange-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <span className="text-[11px] text-zinc-400">
            {hasAnySources
              ? isSearching
                ? `${filteredNodes.length} of ${allFlat.length} folder${allFlat.length !== 1 ? "s" : ""}`
                : `${allFlat.length} folder${allFlat.length !== 1 ? "s" : ""}`
              : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
