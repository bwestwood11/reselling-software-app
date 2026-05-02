import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";

export async function mercariRoutes(fastify: FastifyInstance) {
  // POST /api/mercari/jobs — enqueue a new crosslisting job
  fastify.post("/jobs", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      listingId?: string;
      payload: Prisma.InputJsonValue;
    };

    if (!body?.payload) {
      return reply.status(400).send({ success: false, error: "payload is required" });
    }

    const job = await fastify.prisma.mercariJob.create({
      data: {
        userId: request.user!.id,
        listingId: body.listingId ?? null,
        payload: body.payload,
      },
    });

    return reply.status(201).send({ success: true, data: job });
  });

  // GET /api/mercari/jobs/pending — extension polls this to get the next job
  fastify.get("/jobs/pending", { preHandler: [requireAuth] }, async (request, reply) => {
    const jobs = await fastify.prisma.mercariJob.findMany({
      where: { userId: request.user!.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return reply.send({ success: true, data: jobs });
  });

  // GET /api/mercari/jobs — list all jobs with optional status filter
  fastify.get("/jobs", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "50"), 100);

    const jobs = await fastify.prisma.mercariJob.findMany({
      where: {
        userId: request.user!.id,
        ...(query.status ? { status: query.status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return reply.send({ success: true, data: jobs });
  });

  // PATCH /api/mercari/jobs/:id — extension reports job outcome
  // On COMPLETED: marks the linked Listing as ACTIVE with the Mercari listing ID.
  // On FAILED: marks the Listing as FAILED and refunds the deducted credit.
  fastify.patch("/jobs/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      externalId?: string;
      errorMessage?: string;
    };

    const existing = await fastify.prisma.mercariJob.findFirst({
      where: { id, userId: request.user!.id },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: "Job not found" });
    }

    const now = new Date();
    const isTerminal = body.status === "COMPLETED" || body.status === "FAILED";

    const job = await fastify.prisma.mercariJob.update({
      where: { id },
      data: {
        status: body.status,
        externalId: body.externalId ?? existing.externalId,
        errorMessage: body.errorMessage ?? null,
        completedAt: isTerminal ? now : existing.completedAt,
      },
    });

    // Sync back to the Listing record when the extension finishes
    if (existing.listingId && isTerminal) {
      if (body.status === "COMPLETED") {
        await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: {
            status: "ACTIVE",
            externalId: body.externalId ?? null,
            listedAt: now,
            lastSyncAt: now,
            syncError: null,
          },
        });
        await fastify.prisma.syncEvent.create({
          data: {
            listingId: existing.listingId,
            type: "PUBLISH",
            status: "success",
            message: body.externalId
              ? `Published to Mercari — listing ID: ${body.externalId}`
              : "Published to Mercari",
          },
        });
      } else {
        // FAILED — update listing and refund the credit that was deducted at enqueue time
        const errorMsg = body.errorMessage ?? "Extension job failed";
        await fastify.prisma.listing.update({
          where: { id: existing.listingId },
          data: { status: "FAILED", syncError: errorMsg, lastSyncAt: now },
        });
        await fastify.prisma.syncEvent.create({
          data: {
            listingId: existing.listingId,
            type: "ERROR",
            status: "failed",
            message: errorMsg,
          },
        });
        try {
          const subscriptionSvc = new SubscriptionService(fastify.prisma);
          await subscriptionSvc.refundCredit(
            request.user!.id,
            existing.listingId,
            "MERCARI"
          );
        } catch {
          // Non-fatal — log but don't fail the job update
          fastify.log.error("Failed to refund Mercari credit for job %s", id);
        }
      }
    }

    return reply.send({ success: true, data: job });
  });
}
