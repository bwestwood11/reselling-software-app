import type { FastifyInstance } from "fastify";
import type {
  ScanConfig,
  ScanEbayResult,
  ScanMergeCandidate,
  ScanMode,
  ScanSession,
  ScanTier,
  ScanViewPayload,
} from "@repo/types";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";
import { PHOTO_SCAN_TIERS } from "../config/plans";
import { analyzeViews, mergeCandidates } from "../services/scanner/gemini.service";
import { searchEbayListings, searchEbayListingsMany } from "../services/scanner/ebay-browse.service";
import {
  claimScanCharge,
  openScanSession,
  takeScanMerge,
  takeScanRegion,
} from "../services/scanner/scan-session";

// Photo scanner. The browser enhances the photo and cuts it into zoomed tiles, opens a scan with
// /start, sends each region to /analyze in parallel, then sends everything found to /merge for
// de-duplication and /ebay for prices. A scan costs its tier's credits (PHOTO_SCAN_TIERS), charged
// once when its first region comes back; /ebay is free. Clients only see generic error messages
// (how scans are processed is internal); the details go to the log.

const MAX_VIEWS = 10;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // per analyze request; the browser keeps its views under ~3 MB
const BODY_LIMIT = 6 * 1024 * 1024; // Fastify's default 1 MB is too small for the views

const NO_CREDITS =
  "You don't have enough smart AI credits to scan a photo. Upgrade your plan or buy a top-up.";
const NO_SESSION = "This scan timed out. Please try again.";
const AI_BUSY = "We couldn't analyze this photo right now. Please try again in a minute.";
const EBAY_UNAVAILABLE = "Couldn't load eBay listings right now";

const isTier = (t: unknown): t is ScanTier => typeof t === "string" && t in PHOTO_SCAN_TIERS;

const clampLimit = (n: unknown) => Math.min(Math.max(Number(n) || 8, 1), 50);

export async function scanRoutes(fastify: FastifyInstance) {
  const subscriptionService = new SubscriptionService(fastify.prisma);
  const preHandler = [requireAuth, requireActiveSubscription];

  // GET /api/scan/config
  fastify.get("/config", { preHandler }, async (_request, reply) => {
    const config: ScanConfig = {
      credits: {
        quick: PHOTO_SCAN_TIERS.quick.credits,
        detailed: PHOTO_SCAN_TIERS.detailed.credits,
        deep: PHOTO_SCAN_TIERS.deep.credits,
      },
    };
    return reply.send({ success: true, data: config });
  });

  // POST /api/scan/start — { tier: "quick" | "detailed" | "deep" } -> ScanSession
  fastify.post("/start", { preHandler }, async (request, reply) => {
    const userId = request.user!.id;
    const tier = (request.body as { tier?: unknown } | null)?.tier;
    if (!isTier(tier)) {
      return reply.status(400).send({ success: false, error: "Send { tier: quick | detailed | deep }" });
    }
    const { regions, credits } = PHOTO_SCAN_TIERS[tier];
    if (!(await subscriptionService.checkAiCredits(userId, credits))) {
      return reply.status(403).send({ success: false, error: NO_CREDITS });
    }
    const data: ScanSession = openScanSession(userId, regions, credits);
    return reply.send({ success: true, data });
  });

  // POST /api/scan/analyze — multipart: fields scanId, mode ("scene" | "tile"), labels (JSON array of
  // view labels), then one JPEG file per view in the same order. Images arrive as binary files and
  // are only base64-encoded here, for the Gemini request.
  fastify.post("/analyze", { preHandler, bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const userId = request.user!.id;
    if (!request.isMultipart()) {
      return reply.status(415).send({ success: false, error: "Send the views as multipart/form-data" });
    }

    const fields: Record<string, string> = {};
    const files: Buffer[] = [];
    let total = 0;
    try {
      for await (const part of request.parts({
        limits: { files: MAX_VIEWS, fields: 5, fileSize: MAX_TOTAL_BYTES },
      })) {
        if (part.type === "field") {
          fields[part.fieldname] = String(part.value);
        } else if (part.fieldname === "views" && part.mimetype === "image/jpeg") {
          const buf = await part.toBuffer();
          total += buf.length;
          files.push(buf);
        } else {
          await part.toBuffer(); // drain anything unexpected
          return reply.status(400).send({ success: false, error: "Views must be JPEG files" });
        }
      }
    } catch (err) {
      request.log.warn({ err }, "[scan] Could not read uploaded views");
      return reply.status(413).send({ success: false, error: "Photo too large; try a smaller photo" });
    }
    if (total > MAX_TOTAL_BYTES) {
      return reply.status(413).send({ success: false, error: "Photo too large; try a smaller photo" });
    }

    let labels: unknown;
    try {
      labels = JSON.parse(fields.labels ?? "");
    } catch {
      labels = null;
    }
    if (
      !files.length ||
      !Array.isArray(labels) ||
      labels.length !== files.length ||
      !labels.every((l) => typeof l === "string")
    ) {
      return reply.status(400).send({
        success: false,
        error: `Send 1-${MAX_VIEWS} JPEG views with a matching labels list`,
      });
    }
    const views: ScanViewPayload[] = files.map((buf, i) => ({
      label: labels[i] as string,
      data: buf.toString("base64"),
    }));
    const body = { scanId: fields.scanId, mode: fields.mode as ScanMode | undefined };

    if (!takeScanRegion(body.scanId, userId)) {
      return reply.status(409).send({ success: false, error: NO_SESSION });
    }

    const mode: ScanMode = body.mode === "tile" ? "tile" : "scene";
    let data;
    try {
      data = await analyzeViews(views, "", mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.warn({ err: message, mode }, "[scan] Gemini analyze failed");
      return reply.status(502).send({ success: false, error: AI_BUSY });
    }
    const { usage, ...result } = data;
    request.log.info({ usage, mode }, "[scan] region analyzed");
    // Charge the scan once, on its first successful region.
    const credits = claimScanCharge(body.scanId!, userId);
    if (credits) {
      try {
        await subscriptionService.deductAiCredits(userId, credits, "Photo scan");
      } catch (err) {
        request.log.error({ err }, "[scan] Credit deduction failed after analysis");
      }
    }
    return reply.send({ success: true, data: result });
  });

  // POST /api/scan/merge — { scanId, candidates: ScanMergeCandidate[], prompt? } (text-only Gemini call)
  fastify.post("/merge", { preHandler, bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      scanId?: string;
      candidates?: ScanMergeCandidate[];
      prompt?: string;
    } | null;
    const candidates = body?.candidates;
    if (
      !Array.isArray(candidates) ||
      !candidates.length ||
      candidates.length > 300 ||
      !candidates.every((c) => typeof c?.id === "string" && typeof c?.name === "string")
    ) {
      return reply.status(400).send({ success: false, error: "Send { candidates: [...] } with 1-300 items" });
    }
    if (!takeScanMerge(body?.scanId, userId)) {
      return reply.status(409).send({ success: false, error: NO_SESSION });
    }
    try {
      const { usage, ...data } = await mergeCandidates(
        candidates,
        String(body?.prompt ?? "").slice(0, 2000)
      );
      request.log.info({ usage }, "[scan] detections merged");
      return reply.send({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.warn({ err: message, candidates: candidates.length }, "[scan] Gemini merge failed");
      return reply.status(502).send({ success: false, error: AI_BUSY });
    }
  });

  // POST /api/scan/ebay — { queries: string[], limit? } -> one result per query, searched in parallel
  fastify.post("/ebay", { preHandler }, async (request, reply) => {
    const body = request.body as { queries?: unknown; limit?: unknown } | null;
    const queries = body?.queries;
    if (
      !Array.isArray(queries) ||
      !queries.length ||
      queries.length > 50 ||
      !queries.every((q) => typeof q === "string" && q.trim())
    ) {
      return reply.status(400).send({
        success: false,
        error: "Send { queries: string[] } with 1-50 non-empty queries",
      });
    }
    const results = await searchEbayListingsMany(queries as string[], clampLimit(body?.limit));
    return reply.send({ success: true, data: results.map((r) => publicEbayResult(r, request.log)) });
  });

  // GET /api/scan/ebay?q=...&limit=8 — e.g. to retry a product with a better query
  fastify.get("/ebay", { preHandler }, async (request, reply) => {
    const { q, limit } = request.query as { q?: string; limit?: string };
    const query = q?.trim();
    if (!query) return reply.status(400).send({ success: false, error: "Missing ?q=" });
    const result = await searchEbayListings(query, clampLimit(limit));
    return reply.send({ success: true, data: publicEbayResult(result, request.log) });
  });
}

/** Log eBay's own error text but only show the client a generic one. */
function publicEbayResult(r: ScanEbayResult, log: { warn: (o: object, m: string) => void }): ScanEbayResult {
  if (!r.error) return r;
  log.warn({ err: r.error, query: r.query }, "[scan] eBay lookup failed");
  return { ...r, error: EBAY_UNAVAILABLE };
}
