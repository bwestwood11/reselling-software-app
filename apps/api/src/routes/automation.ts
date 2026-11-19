import type { FastifyInstance } from "fastify";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import {
  AUTOMATION_MARKETPLACES,
  isAutomationMarketplace,
  isServerAutomationEnabled,
  isServerSoldDetectionAvailable,
  preferredModeFromMetadata,
  setAutomationMode,
  type AutomationMode,
} from "../services/automation-mode";
import { isExtensionOnline } from "../services/mercari-presence";
import { soldCheckIntervalMinutes } from "../config/sold-check";
import { ServerStatusSweepService } from "../services/server-status-sweep.service";

/**
 * Per-marketplace choice between server automation (default) and the Chrome extension, for the
 * marketplaces without a public API. See services/automation-mode.ts for what each mode does.
 * Mounted at /api/marketplaces/automation.
 */
export async function automationRoutes(fastify: FastifyInstance) {
  const sweeper = new ServerStatusSweepService(fastify.prisma);
  const pre = { preHandler: [requireAuth, requireActiveSubscription] };

  // GET /api/marketplaces/automation — current mode and readiness for Mercari and Poshmark.
  fastify.get("/", pre, async (request, reply) => {
    const userId = request.user!.id;
    const connections = await fastify.prisma.marketplaceConnection.findMany({
      where: { userId, marketplace: { in: AUTOMATION_MARKETPLACES } },
      select: { marketplace: true, metadata: true, isActive: true, lastPolledAt: true },
    });
    const extensionOnline = await isExtensionOnline(userId);

    const data = AUTOMATION_MARKETPLACES.map((marketplace) => {
      const connection = connections.find((c) => c.marketplace === marketplace);
      const serverAvailable = isServerAutomationEnabled(marketplace);
      const preferred = preferredModeFromMetadata(connection?.metadata);
      return {
        marketplace,
        connected: Boolean(connection?.isActive),
        serverAvailable,
        preferred,
        effective: serverAvailable ? preferred : ("extension" as AutomationMode),
        extensionOnline,
        // Mercari sale detection from the server needs the captured sold-feed query.
        serverSoldDetection: isServerSoldDetectionAvailable(marketplace),
        lastStatusCheckAt: connection?.lastPolledAt ?? null,
        soldCheckIntervalMinutes: soldCheckIntervalMinutes(),
      };
    });
    return reply.send({ success: true, data });
  });

  // PUT /api/marketplaces/automation/:marketplace — { mode: "server" | "extension" }
  fastify.put("/:marketplace", pre, async (request, reply) => {
    const { marketplace } = request.params as { marketplace: string };
    const { mode } = (request.body ?? {}) as { mode?: string };
    const mp = marketplace.toUpperCase();

    if (!isAutomationMarketplace(mp as never)) {
      return reply.status(400).send({ success: false, error: "Unsupported marketplace" });
    }
    if (mode !== "server" && mode !== "extension") {
      return reply.status(400).send({ success: false, error: "mode must be server or extension" });
    }
    const typed = mp as (typeof AUTOMATION_MARKETPLACES)[number];
    if (mode === "server" && !isServerAutomationEnabled(typed)) {
      return reply
        .status(409)
        .send({ success: false, error: "Server automation is not available for this marketplace yet" });
    }

    const saved = await setAutomationMode(fastify.prisma, request.user!.id, typed, mode);
    if (!saved) return reply.status(404).send({ success: false, error: "Marketplace not connected" });
    return reply.send({ success: true, data: { marketplace: typed, mode } });
  });

  // POST /api/marketplaces/automation/:marketplace/check-now — run a server sold check now.
  fastify.post("/:marketplace/check-now", pre, async (request, reply) => {
    const { marketplace } = request.params as { marketplace: string };
    const mp = marketplace.toUpperCase();
    if (!isAutomationMarketplace(mp as never)) {
      return reply.status(400).send({ success: false, error: "Unsupported marketplace" });
    }
    const result = await sweeper.sweep(request.user!.id, mp as (typeof AUTOMATION_MARKETPLACES)[number], {
      force: true,
    });
    if (result.error) return reply.status(502).send({ success: false, error: result.error });
    return reply.send({ success: true, data: result });
  });
}
