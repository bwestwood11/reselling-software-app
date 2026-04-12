import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";

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
