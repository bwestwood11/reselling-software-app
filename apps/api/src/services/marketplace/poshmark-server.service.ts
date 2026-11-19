// Server-side Poshmark over the user's sticky Bright Data residential IP — publish, delist and
// sold detection without the Chrome extension.
//
// This is a port of the extension's Poshmark flow (extension/background.js), which calls the same
// vm-rest endpoints from inside a logged-in poshmark.com tab. Here the same requests go out as
// plain HTTP through the user's residential IP, carrying the cookie jar the extension captured at
// connect time (MarketplaceConnection.sessionCookies). Every endpoint and field below was
// CONFIRMED against live traffic for the extension, EXCEPT the sold feed (soldFeedPostIds), which
// is marked INFERENCE and is only ever used to nominate candidates — each candidate is then
// confirmed through the confirmed per-post GET before anything is marked sold.
//
// Cookies: Poshmark re-issues cookies (notably _csrf) as it answers. Every Set-Cookie we receive
// is folded into metadata.serverCookieJar ({ name: value }) and layered over the captured jar on
// the next request, so the server's session stays as fresh as a browser's would. The captured
// `sessionCookies` are never overwritten — the extension owns that field.
//
// Enabled only when Bright Data is configured AND POSHMARK_SERVER_AUTOMATION=true (see
// services/automation-mode.ts).

import type { MarketplaceType, PrismaClient } from "@repo/db";
import { pickFingerprint } from "../playwright/stealth";
import {
  ProxyFormData,
  isCloudflareChallenge,
  proxiedFetch,
  type ProxiedResponse,
} from "../proxy/proxy-fetch";
import { recordProxyUsage } from "../proxy/proxy-usage.service";
import { ImageDownloadError, downloadAndPrepareImage } from "../images/marketplace-image";
import { isServerAutomationEnabled } from "../automation-mode";

const MARKETPLACE: MarketplaceType = "POSHMARK";
const POSHMARK_BASE = "https://poshmark.com";

// Client-build strings read off live traffic (same values as the extension). If Poshmark starts
// rejecting calls with version-looking errors, recapture them and set these env vars.
const PM_VERSION = process.env.POSHMARK_PM_VERSION ?? "2026.33.00";
const APP_VERSION = process.env.POSHMARK_APP_VERSION ?? "2.55";

/** Poshmark listings take at most 8 photos (cover + 7). */
const MAX_PHOTOS = 8;
const SKU_MAX_LENGTH = 50;

/** A failure retrying can't fix: expired session, Poshmark rejecting the input, bad photo URL. */
export class PermanentPoshmarkError extends Error {}

// ── Mappings (identical to the extension) ───────────────────────────────────────────────

const CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS: "nwt",
  NEW_WITHOUT_TAGS: "uln",
  VERY_GOOD: "ug",
  GOOD: "ug",
  SATISFACTORY: "uf",
};

const FORM_CONDITION_MAP: Record<string, string> = {
  nwt: "nwt",
  like_new: "uln",
  good: "ug",
  fair: "uf",
};

const COLOR_NAMES: Record<string, string> = Object.fromEntries(
  [
    "Red", "Pink", "Orange", "Yellow", "Green", "Blue", "Purple", "Gold", "Silver", "Black",
    "Gray", "White", "Cream", "Brown", "Tan",
  ].map((n) => [n.toLowerCase(), n])
);

/** Poshmark takes colors as plain name strings, at most two; unknown names fail the whole save. */
function toPoshmarkColors(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((c) => {
      const name = typeof c === "string" ? c : (c as { name?: unknown })?.name;
      return COLOR_NAMES[String(name ?? "").trim().toLowerCase()];
    })
    .filter((c): c is string => Boolean(c))
    .slice(0, 2);
}

/** Shape of PoshmarkJob.payload for a publish (built in listing.service.ts). */
export interface PoshmarkPublishPayload {
  title: string;
  description?: string;
  /** Cents. */
  price: number;
  condition?: string;
  poshmarkCondition?: string | null;
  images?: string[];
  departmentId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  brand?: string | null;
  colors?: unknown[];
  styleTags?: string[];
  sizeId?: string | null;
  originalPriceCents?: number | null;
  shippingDiscount?: string | null;
  sku?: string | null;
}

export type PoshmarkPostStatus =
  | { status: "active" | "sold" | "removed"; raw: Record<string, unknown> }
  | { status: "error"; error: string; raw: Record<string, unknown> };

interface StoredCookie {
  name?: string;
  value?: string;
  domain?: string;
  expirationDate?: number;
}

interface PoshmarkSession {
  /** Poshmark's internal user id (the `ui` cookie's uid), stored as accountId at connect. */
  posherId: string;
  jar: Map<string, string>;
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export class PoshmarkServerService {
  constructor(private readonly db: PrismaClient) {}

  static isEnabled(): boolean {
    return isServerAutomationEnabled(MARKETPLACE);
  }

  private userAgent(userId: string): string {
    return pickFingerprint(`${userId}:${MARKETPLACE}`).userAgent;
  }

  // ── Session ───────────────────────────────────────────────────────────────────────────

  async getSession(userId: string): Promise<PoshmarkSession> {
    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      select: { sessionCookies: true, metadata: true, accountId: true, isActive: true },
    });
    if (!connection?.isActive) throw new PermanentPoshmarkError("Poshmark account not connected");
    if (!connection.accountId) {
      throw new PermanentPoshmarkError(
        "Poshmark connection is missing the account id — reconnect Poshmark"
      );
    }

    const jar = new Map<string, string>();
    const now = Date.now() / 1000;
    let captured: StoredCookie[] = [];
    try {
      captured = connection.sessionCookies ? (JSON.parse(connection.sessionCookies) as StoredCookie[]) : [];
    } catch {
      captured = [];
    }
    for (const c of captured) {
      if (!c?.name || typeof c.value !== "string") continue;
      if (c.domain && !c.domain.replace(/^\./, "").endsWith("poshmark.com")) continue;
      if (c.expirationDate && c.expirationDate < now) continue;
      jar.set(c.name, c.value);
    }

    // Fresher values the server itself has been handed since then win.
    const meta = parseMeta(connection.metadata);
    const serverJar = meta.serverCookieJar;
    if (serverJar && typeof serverJar === "object" && !Array.isArray(serverJar)) {
      for (const [name, value] of Object.entries(serverJar as Record<string, unknown>)) {
        if (typeof value === "string") jar.set(name, value);
      }
    }
    if (!jar.has("_csrf") && typeof meta.csrfToken === "string") jar.set("_csrf", meta.csrfToken);

    if (!jar.has("jwt")) {
      throw new PermanentPoshmarkError(
        "Poshmark session has no login cookie — reconnect Poshmark from the extension"
      );
    }
    return { posherId: connection.accountId, jar };
  }

  /** Fold Set-Cookie updates into the session and persist them for the next request. */
  private async absorbCookies(userId: string, session: PoshmarkSession, res: ProxiedResponse) {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() ?? [];
    if (setCookies.length === 0) return;

    const updates: Record<string, string | null> = {};
    for (const line of setCookies) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair?.indexOf("=") ?? -1;
      if (!pair || eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired =
        value === "" ||
        attrs.some((a) => /^\s*max-age\s*=\s*0\s*$/i.test(a)) ||
        attrs.some((a) => {
          const m = /^\s*expires\s*=\s*(.+)$/i.exec(a);
          return m?.[1] ? Date.parse(m[1]) < Date.now() : false;
        });
      updates[name] = expired ? null : value;
      if (expired) session.jar.delete(name);
      else session.jar.set(name, value);
    }

    const connection = await this.db.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      select: { metadata: true },
    });
    if (!connection) return;
    const meta = parseMeta(connection.metadata);
    const serverJar = {
      ...((meta.serverCookieJar as Record<string, string> | undefined) ?? {}),
    };
    for (const [name, value] of Object.entries(updates)) {
      if (value === null) delete serverJar[name];
      else serverJar[name] = value;
    }
    await this.db.marketplaceConnection.update({
      where: { userId_marketplace: { userId, marketplace: MARKETPLACE } },
      data: { metadata: { ...meta, serverCookieJar: serverJar } as object },
    });
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────────────────

  private async request(
    userId: string,
    session: PoshmarkSession,
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown,
    form?: InstanceType<typeof ProxyFormData>
  ): Promise<{ res: ProxiedResponse; data: Record<string, unknown> }> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": this.userAgent(userId),
      Origin: POSHMARK_BASE,
      Referer: `${POSHMARK_BASE}/`,
      Cookie: [...session.jar].map(([k, v]) => `${k}=${v}`).join("; "),
    };
    // CONFIRMED header name — the real web client sends x-xsrf-token with the _csrf cookie value.
    const csrf = session.jar.get("_csrf");
    if (csrf) headers["x-xsrf-token"] = csrf;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await proxiedFetch({ db: this.db, userId, marketplace: MARKETPLACE }, `${POSHMARK_BASE}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    await this.absorbCookies(userId, session, res);

    if (isCloudflareChallenge(res)) {
      throw new Error("Poshmark challenged the request from the residential IP (bot check)");
    }
    if (res.status === 401) {
      throw new PermanentPoshmarkError("Poshmark session expired — reconnect Poshmark");
    }
    return { res, data: (res.json<Record<string, unknown>>() ?? {}) as Record<string, unknown> };
  }

  /**
   * Poshmark reports validation failures as `{ error: { errorType, userMessage } }` with an OUTER
   * HTTP 200 (CONFIRMED), so `res.ok` alone is never proof of success.
   */
  private failure(res: ProxiedResponse, data: Record<string, unknown>): string | null {
    const err = data.error as { userMessage?: string; errorType?: string } | undefined;
    if (err) return err.userMessage ?? err.errorType ?? "Poshmark error";
    if (!res.ok) return `HTTP ${res.status}: ${res.text().replace(/\s+/g, " ").slice(0, 200)}`;
    return null;
  }

  // ── Status ────────────────────────────────────────────────────────────────────────────

  /**
   * Read one post back and classify it — same signals as the extension's fetchPoshmarkPostStatus:
   * inventory.status sold_out/sold/not_for_sale, or every size at 0 available with some sold.
   */
  async getPostStatus(userId: string, postId: string, session?: PoshmarkSession): Promise<PoshmarkPostStatus> {
    const s = session ?? (await this.getSession(userId));
    const { res, data } = await this.request(
      userId,
      s,
      "GET",
      `/vm-rest/posts/${encodeURIComponent(postId)}?app_version=${APP_VERSION}&pm_version=${PM_VERSION}`
    );

    if (res.status === 404) return { status: "removed", raw: { httpStatus: 404 } };
    const post = data.data as
      | {
          status?: string;
          inventory?: {
            status?: string;
            size_quantities?: Array<{ quantity_available?: number; quantity_sold?: number }>;
          };
        }
      | undefined;
    if (!post) {
      const errorType = (data.error as { errorType?: string } | undefined)?.errorType;
      if (errorType && /notfound|not_found/i.test(errorType)) {
        return { status: "removed", raw: { errorType } };
      }
      return {
        status: "error",
        error: this.failure(res, data) ?? "Poshmark returned no post",
        raw: { httpStatus: res.status },
      };
    }

    const sizes = post.inventory?.size_quantities ?? [];
    const inventoryStatus = post.inventory?.status ?? null;
    const soldOutBySize =
      sizes.length > 0 &&
      sizes.every((q) => (q.quantity_available ?? 0) === 0) &&
      sizes.some((q) => (q.quantity_sold ?? 0) > 0);
    const raw = { postStatus: post.status ?? null, inventoryStatus };

    // not_for_sale is how WE delist, so it reads as "removed", not "sold" — a post we pulled
    // ourselves must not be mistaken for a sale. (The extension treats it as sold; the server
    // sweep only ever confirms candidates from the sold feed, where that distinction matters.)
    if (inventoryStatus === "sold_out" || inventoryStatus === "sold" || soldOutBySize) {
      return { status: "sold", raw };
    }
    if (inventoryStatus === "not_for_sale") return { status: "removed", raw };
    if (post.status && post.status !== "published") return { status: "removed", raw };
    return { status: "active", raw };
  }

  /**
   * INFERENCE — the closet's "sold" filter as Poshmark's web closet requests it:
   *   GET /vm-rest/users/{posherId}/posts/filtered?request={filters:{inventory_status:[sold_out]}}
   * This endpoint was NOT captured from live traffic. It is used only to nominate candidates;
   * the sweep confirms each through getPostStatus(). If it errors or returns an unexpected shape
   * the sweep falls back to bounded per-post reads (see server-status-sweep.service.ts).
   *
   * Returns post ids of the most recent sold posts, newest first, up to `pages` × 48.
   */
  async soldFeedPostIds(userId: string, pages = 2, session?: PoshmarkSession): Promise<string[]> {
    const s = session ?? (await this.getSession(userId));
    const ids: string[] = [];
    let maxId: string | null = null;

    for (let page = 0; page < pages; page++) {
      const requestJson = {
        filters: { department: "All", inventory_status: ["sold_out"] },
        query_and_facet_filters: { creator_id: s.posherId },
        experience: "all",
        count: 48,
        ...(maxId ? { max_id: maxId } : {}),
      };
      const path =
        `/vm-rest/users/${encodeURIComponent(s.posherId)}/posts/filtered` +
        `?request=${encodeURIComponent(JSON.stringify(requestJson))}` +
        `&summarize=true&app_version=${APP_VERSION}&pm_version=${PM_VERSION}`;
      const { res, data } = await this.request(userId, s, "GET", path);
      const failure = this.failure(res, data);
      if (failure) throw new Error(`Poshmark sold feed failed: ${failure}`);

      const posts = data.data;
      if (!Array.isArray(posts)) throw new Error("Poshmark sold feed returned an unexpected shape");
      for (const p of posts as Array<{ id?: unknown }>) {
        if (p?.id != null) ids.push(String(p.id));
      }
      maxId = typeof data.more === "object" && data.more !== null
        ? String((data.more as { next_max_id?: unknown }).next_max_id ?? "") || null
        : null;
      if (!maxId || posts.length === 0) break;
    }
    return ids;
  }

  // ── Delist ────────────────────────────────────────────────────────────────────────────

  /**
   * Take a post off sale (inventory.status → not_for_sale, reversible) and read it back, since
   * Poshmark answers 200 even when it silently no-ops. CONFIRMED mechanism — see the extension's
   * delistPoshmarkPost for the history.
   */
  async delist(userId: string, postId: string): Promise<void> {
    const session = await this.getSession(userId);
    const { res, data } = await this.request(
      userId,
      session,
      "POST",
      `/vm-rest/posts/${encodeURIComponent(postId)}?pm_version=${PM_VERSION}`,
      { post: { inventory: { status: "not_for_sale" } } }
    );
    if (res.status === 404) return; // already gone — the outcome we wanted
    const failure = this.failure(res, data);
    if (failure) throw new Error(`Poshmark delist failed: ${failure}`);

    const after = await this.getPostStatus(userId, postId, session);
    if (after.status === "active") {
      throw new Error("Poshmark accepted the delist but the listing is still for sale");
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────────────────

  /**
   * The CONFIRMED 4-step flow: create draft → upload photos → save fields → publish → verify.
   * Returns the new post id.
   */
  async publish(userId: string, payload: PoshmarkPublishPayload): Promise<string> {
    const images = (payload.images ?? []).slice(0, MAX_PHOTOS);
    if (images.length === 0) throw new PermanentPoshmarkError("At least one photo is required");
    if (!payload.title?.trim()) throw new PermanentPoshmarkError("A title is required");

    // Download + compress every photo first (direct, free), so a broken photo fails the job
    // before any proxy bytes are spent or a draft is left behind on the account.
    const prepared = [];
    for (const url of images) {
      try {
        prepared.push(await downloadAndPrepareImage(url));
      } catch (err) {
        if (err instanceof ImageDownloadError && err.status >= 400 && err.status < 500) {
          throw new PermanentPoshmarkError(err.message);
        }
        throw err;
      }
    }

    const session = await this.getSession(userId);

    // 1. draft
    const draft = await this.request(
      userId,
      session,
      "POST",
      `/vm-rest/users/${encodeURIComponent(session.posherId)}/posts?pm_version=${PM_VERSION}`,
      {}
    );
    const draftFailure = this.failure(draft.res, draft.data);
    if (draftFailure) throw new Error(`Poshmark draft creation failed: ${draftFailure}`);
    const draftId = draft.data.id != null ? String(draft.data.id) : null;
    if (!draftId) throw new Error("Poshmark draft creation returned no id");

    // 2. photos (multipart field "file", CONFIRMED)
    const pictureIds: string[] = [];
    for (const [index, image] of prepared.entries()) {
      const form = new ProxyFormData();
      form.append("file", new Blob([new Uint8Array(image.buffer)], { type: image.contentType }), `file${index}.jpg`);
      const up = await this.request(
        userId,
        session,
        "POST",
        `/api/posts/${encodeURIComponent(draftId)}/media/scratch?app_type=web`,
        undefined,
        form
      );
      const upFailure = this.failure(up.res, up.data);
      if (upFailure) {
        console.warn(`[poshmark-server] photo ${index} upload failed: ${upFailure}`);
        continue;
      }
      if (up.data.id != null) pictureIds.push(String(up.data.id));
    }
    if (pictureIds.length === 0) throw new Error("All Poshmark photo uploads failed");

    // 3. save fields
    const [coverShotId, ...rest] = pictureIds;
    const condition =
      (payload.poshmarkCondition && FORM_CONDITION_MAP[payload.poshmarkCondition]) ??
      CONDITION_MAP[payload.condition ?? "GOOD"] ??
      "ug";
    const sku = payload.sku?.trim();
    const postBody = {
      post: {
        catalog: {
          ...(payload.departmentId ? { department: payload.departmentId } : {}),
          ...(payload.categoryId ? { category: payload.categoryId } : {}),
          ...(payload.subcategoryId ? { category_features: [payload.subcategoryId] } : {}),
        },
        colors: toPoshmarkColors(payload.colors),
        inventory: {
          status: "available",
          size_quantities: payload.sizeId
            ? [
                {
                  size_id: payload.sizeId,
                  size_obj: { id: payload.sizeId, display: payload.sizeId, size_system: "us" },
                  size_system: "us",
                  quantity_available: 1,
                  quantity_sold: 0,
                },
              ]
            : [],
        },
        // Whole dollars only (CONFIRMED: "Whole dollar amount required").
        price_amount: { val: Math.round(payload.price / 100), currency_code: "USD" },
        original_price_amount: {
          val: payload.originalPriceCents != null ? Math.round(payload.originalPriceCents / 100) : 0,
          currency_code: "USD",
        },
        title: payload.title,
        description: payload.description ?? "",
        condition,
        cover_shot: { id: coverShotId },
        pictures: rest.map((id) => ({ id })),
        videos: [],
        ...(payload.brand?.trim() ? { brand: payload.brand.trim() } : {}),
        ...(payload.styleTags?.length ? { style_tags: payload.styleTags.map((t) => ({ name: t })) } : {}),
        seller_private_info: sku ? { sku: sku.slice(0, SKU_MAX_LENGTH) } : {},
        autolist_draft: false,
        seller_shipping_discount: {
          id:
            payload.shippingDiscount && payload.shippingDiscount !== "no_discount"
              ? payload.shippingDiscount
              : null,
        },
      },
    };
    const save = await this.request(
      userId,
      session,
      "POST",
      `/vm-rest/posts/${encodeURIComponent(draftId)}?pm_version=${PM_VERSION}`,
      postBody
    );
    const saveFailure = this.failure(save.res, save.data);
    if (saveFailure) throw new PermanentPoshmarkError(`Poshmark rejected the listing: ${saveFailure}`);

    // 4. publish
    const pub = await this.request(
      userId,
      session,
      "PUT",
      `/vm-rest/posts/${encodeURIComponent(draftId)}/status/published?app_version=${APP_VERSION}&pm_version=${PM_VERSION}`,
      {}
    );
    const pubFailure = this.failure(pub.res, pub.data);
    if (pubFailure) throw new PermanentPoshmarkError(`Poshmark publish failed: ${pubFailure}`);

    // 5. verify — publish returns 200 even when it silently rejects (CONFIRMED)
    const check = await this.request(
      userId,
      session,
      "GET",
      `/vm-rest/posts/${encodeURIComponent(draftId)}?app_version=${APP_VERSION}&pm_version=${PM_VERSION}`
    );
    const post = check.data.data as { status?: string } | undefined;
    if (post?.status !== "published") {
      throw new PermanentPoshmarkError(
        `Poshmark accepted the publish but the listing is still "${post?.status ?? "unknown"}" — ` +
          "check the required fields (size, category, price)"
      );
    }

    await recordProxyUsage(this.db, userId, MARKETPLACE, { crossPosts: 1 });
    return draftId;
  }
}
