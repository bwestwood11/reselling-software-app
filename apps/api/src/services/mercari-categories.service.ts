import masterData from "../data/mercari-categories.json";

interface RawCategory {
  id: number;
  name: string;
  parentId: number;
  itemSizeGroupId: number;
  displayOrder: number;
}

export interface MercariCategoryNode {
  id: string;
  label: string;
  parentId: string | null;
  isLeaf: boolean;
  hasChildren: boolean;
  depth: number;
  fullPath: string[];
  isSizeRequired: boolean;
  sizeSchemaId: string | null;
}

// ── Build the in-memory index once at module load ──────────────────────────────

const raw = masterData.itemCategories as RawCategory[];

// 1. Which IDs appear as a parent of at least one other category?
const parentIdSet = new Set<number>(
  raw.filter((c) => c.parentId > 0).map((c) => c.parentId)
);

// 2. Build a lookup map (numeric id → raw)
const rawById = new Map<number, RawCategory>(raw.map((c) => [c.id, c]));

// 3. Compute full ancestor path for a category (root → leaf)
function buildPath(cat: RawCategory): string[] {
  const path: string[] = [];
  let current: RawCategory | undefined = cat;
  while (current) {
    path.unshift(current.name);
    current = current.parentId > 0 ? rawById.get(current.parentId) : undefined;
  }
  return path;
}

// 4. Build the public nodes
const nodesById = new Map<string, MercariCategoryNode>();
const nodesByParent = new Map<string | null, MercariCategoryNode[]>();

for (const cat of raw) {
  const parentId = cat.parentId === 0 ? null : String(cat.parentId);
  const isLeaf = !parentIdSet.has(cat.id);
  const hasChildren = parentIdSet.has(cat.id);
  const node: MercariCategoryNode = {
    id: String(cat.id),
    label: cat.name,
    parentId,
    isLeaf,
    hasChildren,
    depth: parentId === null ? 0 : -1, // resolved below
    fullPath: buildPath(cat),
    isSizeRequired: cat.itemSizeGroupId > 0,
    sizeSchemaId: cat.itemSizeGroupId > 0 ? String(cat.itemSizeGroupId) : null,
  };
  nodesById.set(node.id, node);
  const siblings = nodesByParent.get(parentId) ?? [];
  siblings.push(node);
  nodesByParent.set(parentId, siblings);
}

// Resolve depths via BFS from roots
const roots = nodesByParent.get(null) ?? [];
const queue: Array<{ node: MercariCategoryNode; depth: number }> = roots.map(
  (n) => ({ node: n, depth: 0 })
);
while (queue.length > 0) {
  const item = queue.shift();
  if (!item) break;
  item.node.depth = item.depth;
  const children = nodesByParent.get(item.node.id) ?? [];
  for (const child of children) {
    queue.push({ node: child, depth: item.depth + 1 });
  }
}

// ── Public query functions ─────────────────────────────────────────────────────

/** Root-level categories (parentId === null). */
export function getRootCategories(): MercariCategoryNode[] {
  return (nodesByParent.get(null) ?? []).sort(
    (a, b) => a.label.localeCompare(b.label)
  );
}

/** Direct children of a category by string id. */
export function getChildCategories(parentId: string): MercariCategoryNode[] {
  return (nodesByParent.get(parentId) ?? []).sort(
    (a, b) => a.label.localeCompare(b.label)
  );
}

/** Case-insensitive substring search across all category labels. */
export function searchCategories(q: string, limit = 50): MercariCategoryNode[] {
  const lower = q.toLowerCase();
  const results: MercariCategoryNode[] = [];
  for (const node of nodesById.values()) {
    if (node.label.toLowerCase().includes(lower)) {
      results.push(node);
      if (results.length >= limit) break;
    }
  }
  return results.sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));
}

/** Only leaf (selectable) categories. */
export function getLeafCategories(limit = 100): MercariCategoryNode[] {
  const results: MercariCategoryNode[] = [];
  for (const node of nodesById.values()) {
    if (node.isLeaf) {
      results.push(node);
      if (results.length >= limit) break;
    }
  }
  return results;
}

/** Total number of categories. */
export function getCategoryCount(): number {
  return nodesById.size;
}
