import type { PrismaClient } from "@repo/db";

const VENDOO_BASE = "https://api.web.vendoo.co";

interface VendooCategory {
  id: string;
  most_relevant_text: string;
  parent_category_id: string;
  all_category_label: string[];
  is_leaf: boolean;
  has_children: boolean;
  payload_text?: string;
  status: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchVendooCategories(
  marketplace: string,
  parentId: string,
  sessionId?: string,
  retries = 4
): Promise<VendooCategory[]> {
  let url =
    `${VENDOO_BASE}/api/category/${encodeURIComponent(marketplace)}` +
    `?parent_category_id=${encodeURIComponent(parentId)}&text=`;
  if (sessionId) url += `&sessionId=${encodeURIComponent(sessionId)}`;

  const headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0",
    "Sec-GPC": "1",
    "Alt-Used": "api.web.vendoo.co",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Priority": "u=0, i",
    ...(process.env.VENDOO_COOKIE ? { "Cookie": process.env.VENDOO_COOKIE } : {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * 2 ** attempt;
      console.warn(`[fetchVendooCategories] 429 on parentId=${parentId}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
      continue;
    }

    if (!res.ok) {
      console.error(`[fetchVendooCategories] HTTP ${res.status} fetching parentId=${parentId}:`, await res.text());
      throw new Error(`HTTP ${res.status} fetching parentId=${parentId}`);
    }

    const data: unknown = await res.json();
    if (Array.isArray(data)) return data as VendooCategory[];
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d["results"])) return d["results"] as VendooCategory[];
      if (Array.isArray(d["data"])) return d["data"] as VendooCategory[];
    }
    return [];
  }

  throw new Error(`Rate-limited after ${retries} retries for parentId=${parentId}`);
}

export interface RawCategory {
  id: string;
  most_relevant_text: string;
  parent_category_id: string;
  all_category_label?: string[];
  is_leaf: boolean;
  has_children: boolean;
  payload_text?: string;
  status?: string;
  depth?: number;
  fullPath?: string[];
}

export async function bulkUpsertCategories(
  db: PrismaClient,
  categories: RawCategory[]
): Promise<number> {
  let count = 0;
  for (const cat of categories) {
    const fullPath = cat.fullPath ?? cat.all_category_label ?? [cat.most_relevant_text];
    let payload: unknown = null;
    if (cat.payload_text) {
      try { payload = JSON.parse(cat.payload_text); } catch {}
    }
    await db.mercariCategory.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        label: cat.most_relevant_text,
        parentId: cat.parent_category_id === "__root" ? null : cat.parent_category_id,
        isLeaf: cat.is_leaf,
        hasChildren: cat.has_children,
        depth: cat.depth ?? 0,
        fullPath,
        payload: payload as Parameters<typeof db.mercariCategory.create>[0]["data"]["payload"],
        lastSyncAt: new Date(),
      },
      update: {
        label: cat.most_relevant_text,
        isLeaf: cat.is_leaf,
        hasChildren: cat.has_children,
        fullPath,
        payload: payload as Parameters<typeof db.mercariCategory.create>[0]["data"]["payload"],
        lastSyncAt: new Date(),
      },
    });
    count++;
  }
  return count;
}

let seedRunning = false;

export function isSeedRunning(): boolean {
  return seedRunning;
}

export async function seedMercariCategories(
  db: PrismaClient,
  opts?: { marketplace?: string; sessionId?: string }
): Promise<{ total: number }> {
  if (seedRunning) throw new Error("Category seed is already in progress");
  seedRunning = true;

  const marketplace = opts?.marketplace ?? "mercari";
  const sessionId = opts?.sessionId ?? process.env.VENDOO_SESSION_ID;

  try {
    // BFS queue — avoids deep recursion for large trees
    const queue: Array<{ parentId: string; depth: number; path: string[] }> = [
      { parentId: "__root", depth: 0, path: [] },
    ];

    let total = 0;

    while (queue.length > 0) {
      const batch = queue.splice(0, 5); // 5 concurrent fetches per tick

      await Promise.all(
        batch.map(async ({ parentId, depth, path }) => {
          let cats: VendooCategory[];
          try {
            cats = await fetchVendooCategories(marketplace, parentId, sessionId);
          } catch (err) {
            console.error(
              `[mercari-categories] fetch failed parentId=${parentId}:`,
              err instanceof Error ? err.message : err
            );
            return;
          }

          for (const cat of cats) {
            if (cat.status !== "active") continue;

            const fullPath = [...path, cat.most_relevant_text];

            let payload: unknown = null;
            if (cat.payload_text) {
              try {
                payload = JSON.parse(cat.payload_text);
              } catch {
                // leave null if payload_text is malformed
              }
            }


            console.log(`[mercari-categories] Upserting category id=${cat.id} parentId=${cat.parent_category_id} depth=${depth} fullPath=${fullPath.join(" > ")}`);

            await db.mercariCategory.upsert({
              where: { id: cat.id },
              create: {
                id: cat.id,
                label: cat.most_relevant_text,
                parentId: cat.parent_category_id === "__root" ? null : cat.parent_category_id,
                isLeaf: cat.is_leaf,
                hasChildren: cat.has_children,
                depth,
                fullPath,
                payload: payload as Parameters<typeof db.mercariCategory.create>[0]["data"]["payload"],
                lastSyncAt: new Date(),
              },
              update: {
                label: cat.most_relevant_text,
                isLeaf: cat.is_leaf,
                hasChildren: cat.has_children,
                fullPath,
                payload: payload as Parameters<typeof db.mercariCategory.create>[0]["data"]["payload"],
                lastSyncAt: new Date(),
              },
            });

            total++;

            if (cat.has_children) {
              queue.push({ parentId: cat.id, depth: depth + 1, path: fullPath });
            }
          }
        })
      );

      // Brief pause between batches to avoid hammering the Vendoo API
      if (queue.length > 0) await new Promise<void>((r) => setTimeout(r, 150));
    }

    console.log(`[mercari-categories] Seeded ${total} categories (marketplace=${marketplace})`);
    return { total };
  } finally {
    seedRunning = false;
  }
}
