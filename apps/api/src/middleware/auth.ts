import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import { isEntitled } from "../config/plans";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session?.user) {
    return reply.status(401).send({ success: false, error: "Unauthorized" });
  }

  // Attach user to request for downstream use
  request.user = session.user;
}

/**
 * Gate access behind an active subscription — ACTIVE or TRIALING. A brand-new
 * account gets an INACTIVE placeholder subscription (see the Better Auth
 * `user.create.after` hook) until it starts a trial or subscribes, so this
 * blocks every gated route until the user picks a plan. Must run after
 * {@link requireAuth} in the preHandler chain (it reads `request.user`).
 */
export async function requireActiveSubscription(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ success: false, error: "Unauthorized" });
  }

  const subscription = await request.server.prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });

  if (!isEntitled(subscription?.status)) {
    return reply.status(402).send({
      success: false,
      error: "An active subscription is required. Start your free trial or choose a plan to continue.",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
  }
}
