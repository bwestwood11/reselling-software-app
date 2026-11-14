// Internal, token-protected endpoints that run the residential-proxy diagnostics FROM THE
// DEPLOYED SERVER — which is the only place the option-B (direct upload) test means anything.
//
// Registered only when PROXY_TEST_TOKEN is set. Every request must send it:
//   curl -X POST https://<api>/api/internal/proxy-tests/check \
//     -H "x-proxy-test-token: $PROXY_TEST_TOKEN"
// Remove PROXY_TEST_TOKEN from Railway once testing is done; the routes disappear with it.

import { timingSafeEqual } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  checkProxy,
  compressionTest,
  mercariCloudflareTest,
  mercariUploadTest,
  syntheticPhoto,
  usageReport,
} from "../services/proxy/proxy-diagnostics";

function tokenOk(request: FastifyRequest): boolean {
  const expected = process.env.PROXY_TEST_TOKEN ?? "";
  const given = String(request.headers["x-proxy-test-token"] ?? "");
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function guard(request: FastifyRequest, reply: FastifyReply) {
  if (!tokenOk(request)) return reply.status(404).send({ success: false, error: "Not found" });
}

export async function proxyTestRoutes(fastify: FastifyInstance) {
  const opts = { preHandler: [guard] };

  fastify.post("/check", opts, async (_req, reply) => {
    return reply.send({ success: true, data: await checkProxy(fastify.prisma) });
  });

  fastify.post("/compression", opts, async (request, reply) => {
    const { urls = [] } = (request.body ?? {}) as { urls?: string[] };
    const inputs: Array<{ source: string; buffer: Buffer }> = [];
    for (const url of urls.slice(0, 10)) {
      if (!/^https:\/\//i.test(url)) continue;
      const res = await fetch(url);
      if (res.ok) inputs.push({ source: url, buffer: Buffer.from(await res.arrayBuffer()) });
    }
    if (inputs.length === 0) inputs.push({ source: "synthetic 3000x4000", buffer: await syntheticPhoto() });
    return reply.send({ success: true, data: await compressionTest(inputs) });
  });

  fastify.post("/mercari-upload", opts, async (request, reply) => {
    const { userId, modes } = (request.body ?? {}) as {
      userId?: string;
      modes?: Array<"direct" | "proxied">;
    };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    try {
      return reply.send({ success: true, data: await mercariUploadTest(fastify.prisma, userId, modes) });
    } catch (err) {
      return reply.status(500).send({ success: false, error: (err as Error).message });
    }
  });

  fastify.post("/mercari-cloudflare", opts, async (request, reply) => {
    const { userId } = (request.body ?? {}) as { userId?: string };
    if (!userId) return reply.status(400).send({ success: false, error: "userId is required" });
    return reply.send({ success: true, data: await mercariCloudflareTest(fastify.prisma, userId) });
  });

  fastify.post("/usage", opts, async (request, reply) => {
    const { month, pricePerGb } = (request.body ?? {}) as { month?: string; pricePerGb?: number };
    return reply.send({ success: true, data: await usageReport(fastify.prisma, { month, pricePerGb }) });
  });
}
