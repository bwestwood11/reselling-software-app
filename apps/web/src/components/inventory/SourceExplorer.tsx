"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSources, useSourceStats, useDeleteSource } from "@/hooks/use-sources";
import { useInventory } from "@/hooks/use-inventory";
import { SourceModal } from "@/components/ui/source-modal";
import { MoveToSourceDialog } from "@/components/inventory/MoveToSourceDialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronLeft,
  Folder,
  FolderOpen,
  Package,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Home,
  Search,
  X,
  Loader2,
  Check,
  FolderInput,
} from "lucide-react";
import { formatCurrency } from "@repo/utils";
import { inventoryApi } from "@/lib/api";
import { toast } from "sonner";
import type { SourceStats } from "@repo/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlatSource = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function findNode(tree: SourceStats[], id: string): SourceStats | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function buildBreadcrumb(
  sources: FlatSource[],
  id: string
): Array<{ id: string; name: string }> {
  const source = sources.find((s) => s.id === id);
  if (!source) return [];
  const ancestors = source.parentId
    ? buildBreadcrumb(sources, source.parentId)
    : [];
  return [...ancestors, { id: source.id, name: source.name }];
}

// ─── Grid columns shared across all rows ─────────────────────────────────────
// [Select 32px | Name flex | Items 60px | Cost 100px | Revenue 100px | Profit 90px | Actions 84px]
const GRID = "grid-cols-[32px_minmax(0,1fr)_60px_100px_100px_90px_84px]";

const ITEMS_PAGE_SIZE = 5;

// ─── Profit pill ──────────────────────────────────────────────────────────────

function ProfitPill({ value }: { value: number }) {
  if (value === 0)
    return <span className="text-sm tabular-nums text-zinc-300">—</span>;
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        value > 0
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
          : "bg-red-50 text-red-600 ring-1 ring-red-200/70"
      )}
    >
      {value > 0 ? "+" : ""}
      {formatCurrency(value)}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-500",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SOLD: "bg-sky-100 text-sky-700",
  ARCHIVED: "bg-zinc-100 text-zinc-400",
};

// ─── Monetary cell ────────────────────────────────────────────────────────────

function MoneyCell({ value }: { value: number }) {
  return value > 0 ? (
    <span className="text-sm tabular-nums text-zinc-700">{formatCurrency(value)}</span>
  ) : (
    <span className="text-sm tabular-nums text-zinc-300">—</span>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  selected,
  onToggleSelect,
  onMove,
}: {
  item: any;
  selected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onMove: () => void;
}) {
  const cost = Number(item.costPrice ?? 0) * (item.quantity ?? 1);
  const revenue =
    item.status === "SOLD"
      ? item.soldPrice != null
        ? Number(item.soldPrice)
        : Number(item.targetPrice ?? 0) * (item.quantity ?? 1)
      : 0;
  const profit = revenue - cost;

  return (
    <div
      className={cx(
        "group grid items-center border-b border-zinc-100 px-4 py-2.5 transition-colors last:border-0",
        selected ? "bg-orange-50/70" : "bg-white hover:bg-zinc-50",
        GRID
      )}
    >
      {/* Select */}
      <div className="flex items-center">
        <Checkbox checked={selected} onChange={onToggleSelect} />
      </div>

      {/* Name */}
      <div className="flex min-w-0 items-center gap-3">
        {item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0].url}
            alt={item.title}
            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200"
          />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80">
            <Package className="h-4 w-4 text-zinc-300" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cx(
                "rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                STATUS_STYLES[item.status] ?? STATUS_STYLES.DRAFT
              )}
            >
              {item.status}
            </span>
            {item.brand && (
              <span className="truncate text-[11px] text-zinc-400">{item.brand}</span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <span className="text-right text-sm tabular-nums text-zinc-500">
        {item.quantity ?? 1}
      </span>

      {/* Cost */}
      <div className="flex justify-end pr-3">
        <MoneyCell value={cost} />
      </div>

      {/* Revenue */}
      <div className="flex justify-end pr-3">
        <MoneyCell value={revenue} />
      </div>

      {/* Profit */}
      <div className="flex justify-end">
        <ProfitPill value={profit} />
      </div>

      {/* Actions */}
      <div
        className={cx(
          "flex items-center justify-end gap-0.5 pr-1 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          type="button"
          onClick={onMove}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-orange-100 hover:text-orange-600"
          title="Move to source"
        >
          <FolderInput className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/inventory/${item.id}`}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          title="View"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/inventory/${item.id}/edit`}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Folder row ───────────────────────────────────────────────────────────────

function FolderRow({
  child,
  stats,
  onEdit,
  onDelete,
}: {
  child: FlatSource;
  stats: SourceStats | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const profit = stats?.profit ?? 0;

  return (
    <div
      className={cx(
        "group grid items-center border-b border-zinc-100 bg-white px-4 transition-colors hover:bg-amber-50/60",
        GRID
      )}
    >
      {/* Select (folders are not selectable) */}
      <div />

      {/* Name */}
      <Link
        href={`/inventory/sources/${child.id}`}
        className="flex min-w-0 items-center gap-3 py-3"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200/60 text-amber-600 ring-1 ring-amber-200/60 transition-colors group-hover:from-amber-200/80 group-hover:to-amber-300/60">
          <Folder className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{child.name}</p>
          {stats && stats.children.length > 0 && (
            <p className="text-[11px] text-zinc-400">
              {stats.children.length}{" "}
              subfolder{stats.children.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </Link>

      {/* Items */}
      <span className="text-right text-sm tabular-nums text-zinc-500">
        {stats?.itemCount ?? 0}
      </span>

      {/* Cost */}
      <div className="flex justify-end pr-3">
        <MoneyCell value={stats?.totalCost ?? 0} />
      </div>

      {/* Revenue */}
      <div className="flex justify-end pr-3">
        <MoneyCell value={stats?.totalRevenue ?? 0} />
      </div>

      {/* Profit */}
      <div className="flex justify-end">
        <ProfitPill value={profit} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-amber-100 hover:text-amber-700"
          title="Rename"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-600"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cx("grid border-b border-zinc-100 px-4 py-3", GRID)}
        >
          <div />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-100" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-40 animate-pulse rounded bg-zinc-100" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="h-3 w-4 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="flex items-center justify-end pr-3">
            <div className="h-3 w-14 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="flex items-center justify-end pr-3">
            <div className="h-3 w-14 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="flex items-center justify-end">
            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
          </div>
          <div />
        </div>
      ))}
    </>
  );
}

// ─── Items pagination bar ─────────────────────────────────────────────────────

function ItemsPager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * ITEMS_PAGE_SIZE + 1;
  const end = Math.min(page * ITEMS_PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
      <span className="text-xs text-zinc-400 tabular-nums">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-zinc-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onChange}
      className={cx(
        "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
        checked || indeterminate
          ? "border-orange-500 bg-orange-500"
          : "border-zinc-300 bg-white hover:border-zinc-400"
      )}
    >
      {indeterminate && !checked && (
        <div className="h-0.5 w-2 rounded-full bg-white" />
      )}
      {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </div>
  );
}

// ─── Assign items modal ───────────────────────────────────────────────────────

function AssignItemsModal({
  open,
  onClose,
  targetId,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const qc = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const queryParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = { limit: "100" };
    if (search) p.search = search;
    return p;
  }, [search]);
  const { data, isLoading } = useInventory(queryParams);

  // All items not already in this folder
  const items: any[] = useMemo(
    () => (data?.data ?? []).filter((i: any) => i.source?.id !== targetId),
    [data, targetId]
  );

  // Reset state each open
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  function toggle(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i: any) => i.id)));
    }
  }

  async function handleAssign() {
    if (!selected.size) return;
    setAssigning(true);
    try {
      await Promise.all(
        [...selected].map((id) => inventoryApi.update(id, { sourceId: targetId }))
      );
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success(
        `${selected.size} item${selected.size !== 1 ? "s" : ""} assigned to ${targetName}`
      );
      onClose();
    } catch {
      toast.error("Failed to assign some items");
    } finally {
      setAssigning(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[80vh] max-w-lg flex-col gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Assign items</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Select items to move into{" "}
              <span className="font-medium text-zinc-600">{targetName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
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
              placeholder="Search by title, brand, SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Select-all bar */}
        {items.length > 1 && (
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs font-medium text-zinc-500">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
              />
              Select all{" "}
              <span className="tabular-nums text-zinc-400">({items.length})</span>
            </label>
            {selected.size > 0 && (
              <span className="text-xs font-semibold text-orange-600">
                {selected.size} selected
              </span>
            )}
          </div>
        )}

        {/* Item list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Package className="mb-3 h-9 w-9 text-zinc-200" />
              <p className="text-sm font-medium text-zinc-500">
                {search
                  ? `No items match "${search}"`
                  : "All items are already in this folder"}
              </p>
            </div>
          )}

          {items.map((item: any) => {
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => toggle(item.id, e)}
                className={cx(
                  "flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors last:border-0",
                  isSelected ? "bg-orange-50" : "hover:bg-zinc-50"
                )}
              >
                <Checkbox checked={isSelected} onChange={(e) => toggle(item.id, e)} />

                {item.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.images[0].url}
                    alt={item.title}
                    className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200"
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                    <Package className="h-4 w-4 text-zinc-300" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={cx(
                      "truncate text-sm font-medium",
                      isSelected ? "text-orange-700" : "text-zinc-900"
                    )}
                  >
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {item.brand && (
                      <span className="text-[11px] text-zinc-400">{item.brand}</span>
                    )}
                    {item.source && (
                      <>
                        {item.brand && (
                          <span className="text-[10px] text-zinc-300">·</span>
                        )}
                        <span className="text-[11px] text-amber-600">
                          {item.source.name}
                        </span>
                      </>
                    )}
                    {!item.source && (
                      <span className="text-[11px] text-zinc-300">Unassigned</span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-orange-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleAssign()}
            disabled={selected.size === 0 || assigning}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {assigning
              ? "Assigning…"
              : selected.size > 0
                ? `Assign ${selected.size} item${selected.size !== 1 ? "s" : ""}`
                : "Select items"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main explorer ────────────────────────────────────────────────────────────

interface SourceExplorerProps {
  currentId: string | null;
}

export function SourceExplorer({ currentId }: SourceExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: sources = [] } = useSources();
  const { data: statsTree = [] } = useSourceStats();
  const deleteSource = useDeleteSource();

  const [modalOpen, setModalOpen] = useState(false);
  const [editSource, setEditSource] = useState<FlatSource | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // Item selection + move-to-source
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveIds, setMoveIds] = useState<string[] | null>(null);

  // Page lives in the URL so refresh / browser-back preserves position.
  // Use a per-source key ("page" when at root, "page" when in a folder — the
  // URL changes on folder navigation so the param resets naturally).
  const itemPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  function setItemPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const inventoryParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {
      limit: String(ITEMS_PAGE_SIZE),
      page: String(itemPage),
    };
    if (currentId) {
      p.sourceId = currentId;
    } else {
      p.unassigned = "true";
    }
    return p;
  }, [currentId, itemPage]);

  const { data: itemsData, isLoading: itemsLoading } = useInventory(inventoryParams);

  const items: any[] = itemsData?.data ?? [];
  const itemsTotal: number = itemsData?.total ?? 0;
  const itemsTotalPages: number = itemsData?.totalPages ?? 1;

  // Clear the selection when navigating folders or changing pages.
  useEffect(() => {
    setSelected(new Set());
  }, [currentId, itemPage]);

  function toggleItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = items.some((i) => selected.has(i.id)) && !allSelected;

  function toggleSelectAll(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((i) => next.delete(i.id));
      } else {
        items.forEach((i) => next.add(i.id));
      }
      return next;
    });
  }

  const currentSource = currentId
    ? sources.find((s) => s.id === currentId) ?? null
    : null;
  const breadcrumb = currentId ? buildBreadcrumb(sources, currentId) : [];
  const childrenFolders = sources.filter((s) => s.parentId === currentId);

  const currentNodeStats = currentId ? findNode(statsTree, currentId) : null;
  const childrenStats: SourceStats[] = currentId
    ? (currentNodeStats?.children ?? [])
    : statsTree;

  const footerItems = currentNodeStats?.itemCount ?? itemsTotal;
  const footerCost = currentNodeStats?.totalCost ?? 0;
  const footerRevenue = currentNodeStats?.totalRevenue ?? 0;
  const footerProfit = currentNodeStats?.profit ?? 0;

  const isEmpty = childrenFolders.length === 0 && itemsTotal === 0 && !itemsLoading;

  async function handleDeleteFolder(child: FlatSource) {
    if (confirm(`Delete "${child.name}"? Items inside will become unassigned.`)) {
      await deleteSource.mutateAsync(child.id);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-zinc-50/70 px-3 py-2.5">
        <nav
          className="flex min-w-0 items-center gap-0.5 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <Link
            href="/inventory/sources"
            className={cx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              !currentId
                ? "bg-white font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-400 hover:bg-white hover:text-zinc-700"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Sources</span>
          </Link>

          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex shrink-0 items-center gap-0.5">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
              <Link
                href={`/inventory/sources/${crumb.id}`}
                className={cx(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  i === breadcrumb.length - 1
                    ? "bg-white font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                    : "text-zinc-400 hover:bg-white hover:text-zinc-700"
                )}
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {currentSource && (
            <>
              <button
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <FolderInput className="h-3 w-3" />
                Assign items
              </button>
              <button
                onClick={() => setEditSource(currentSource)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <Pencil className="h-3 w-3" />
                Rename
              </button>
              <button
                onClick={async () => {
                  if (
                    confirm(
                      `Delete "${currentSource.name}"? Items will become unassigned.`
                    )
                  ) {
                    await deleteSource.mutateAsync(currentId!);
                    router.push(
                      currentSource.parentId
                        ? `/inventory/sources/${currentSource.parentId}`
                        : "/inventory/sources"
                    );
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete folder"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New folder
          </button>
        </div>
      </div>

      {/* ── Bulk selection bar ───────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50/80 px-4 py-2.5">
          <span className="text-xs font-semibold text-orange-700">
            {selected.size} item{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setMoveIds([...selected])}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-500"
            >
              <FolderInput className="h-3.5 w-3.5" />
              Move
            </button>
          </div>
        </div>
      )}

      {/* ── Column headers ───────────────────────────────────────────────── */}
      <div
        className={cx(
          "grid border-b border-zinc-200/80 bg-zinc-50 px-4 py-2.5",
          GRID
        )}
      >
        <div className="flex items-center">
          {items.length > 0 && (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleSelectAll}
            />
          )}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          Name
        </span>
        <span className="text-right text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          Items
        </span>
        <span className="pr-3 text-right text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          Cost
        </span>
        <span className="pr-3 text-right text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          Revenue
        </span>
        <span className="text-right text-[11px] font-bold uppercase tracking-widest text-orange-500">
          Profit
        </span>
        <span />
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="min-h-[320px]">
        {/* Folder rows */}
        {childrenFolders.map((child) => {
          const stats = childrenStats.find((s) => s.id === child.id);
          return (
            <FolderRow
              key={child.id}
              child={child}
              stats={stats}
              onEdit={() => setEditSource(child)}
              onDelete={() => handleDeleteFolder(child)}
            />
          );
        })}

        {/* Section divider */}
        {childrenFolders.length > 0 && (items.length > 0 || itemsLoading) && (
          <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              {currentId ? "Items in this folder" : "Unassigned items"}
            </span>
            <div className="h-px flex-1 bg-zinc-200/70" />
          </div>
        )}

        {/* Item rows */}
        {itemsLoading ? (
          <SkeletonRows />
        ) : (
          <>
            {items.map((item: any) => (
              <ItemRow
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggleSelect={(e) => toggleItem(item.id, e)}
                onMove={() => setMoveIds([item.id])}
              />
            ))}
            <ItemsPager
              page={itemPage}
              totalPages={itemsTotalPages}
              total={itemsTotal}
              onPage={setItemPage}
            />
          </>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {currentId ? (
              <>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 ring-1 ring-amber-200/60">
                  <FolderOpen className="h-7 w-7 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-600">
                  This folder is empty
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Add a subfolder, or edit items and assign them to{" "}
                  <span className="font-medium text-zinc-500">
                    {currentSource?.name ?? "this source"}
                  </span>
                  .
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New subfolder
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-500"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                    Assign items
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 ring-1 ring-amber-200/60">
                  <Folder className="h-7 w-7 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-600">No sources yet</p>
                <p className="mt-1 max-w-xs text-xs text-zinc-400">
                  Create a folder for each place you source from — garage sales,
                  storage units, online hauls.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-5 flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
                >
                  <Plus className="h-4 w-4" />
                  New folder
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Footer stats ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-zinc-200/80 bg-zinc-50/60 px-4 py-2.5">
        <span className="text-xs text-zinc-400">
          <span className="font-semibold tabular-nums text-zinc-700">
            {footerItems}
          </span>{" "}
          item{footerItems !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-zinc-400">
          Cost:{" "}
          <span className="font-semibold tabular-nums text-zinc-700">
            {formatCurrency(footerCost)}
          </span>
        </span>
        <span className="text-xs text-zinc-400">
          Revenue:{" "}
          <span className="font-semibold tabular-nums text-zinc-700">
            {formatCurrency(footerRevenue)}
          </span>
        </span>
        <span className="text-xs text-zinc-400">
          Profit:{" "}
          <span
            className={cx(
              "font-semibold tabular-nums",
              footerProfit > 0
                ? "text-emerald-600"
                : footerProfit < 0
                  ? "text-red-500"
                  : "text-zinc-700"
            )}
          >
            {footerProfit > 0 && "+"}
            {formatCurrency(footerProfit)}
          </span>
        </span>
        {!currentId && sources.length > 0 && (
          <span className="ml-auto text-[10px] text-zinc-400">
            Items with no source assigned
          </span>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <SourceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultParentId={currentId ?? undefined}
      />
      {editSource && (
        <SourceModal
          open
          onClose={() => setEditSource(null)}
          editSource={editSource}
        />
      )}
      {currentId && currentSource && (
        <AssignItemsModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          targetId={currentId}
          targetName={currentSource.name}
        />
      )}
      <MoveToSourceDialog
        open={moveIds !== null}
        onClose={() => setMoveIds(null)}
        itemIds={moveIds ?? []}
        currentSourceId={currentId}
        onMoved={() => setSelected(new Set())}
      />
    </div>
  );
}
