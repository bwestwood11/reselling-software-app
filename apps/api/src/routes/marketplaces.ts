import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";

export async function marketplacesRoutes(fastify: FastifyInstance) {
  // GET /api/marketplaces/connections
  fastify.get(
    "/connections",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connections = await fastify.prisma.marketplaceConnection.findMany({
        where: { userId: request.user!.id },
        select: {
          id: true,
          marketplace: true,
          accountName: true,
          isActive: true,
          createdAt: true,
          expiresAt: true,
          _count: { select: { listings: true } },
        },
      });
      return reply.send({ success: true, data: connections });
    }
  );

  // DELETE /api/marketplaces/connections/:id
  fastify.delete(
    "/connections/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.prisma.marketplaceConnection.deleteMany({
        where: { id, userId: request.user!.id },
      });
      return reply.send({ success: true, message: "Connection removed" });
    }
  );

  // GET /api/marketplaces/oauth/:marketplace/authorize
  fastify.get(
    "/oauth/:marketplace/authorize",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { marketplace } = request.params as { marketplace: string };
      const url = buildOAuthUrl(marketplace.toUpperCase(), request.user!.id);
      return reply.send({ success: true, data: { url } });
    }
  );

  // GET /api/marketplaces/oauth/:marketplace/callback
  fastify.get(
    "/oauth/:marketplace/callback",
    async (request, reply) => {
      const { marketplace } = request.params as { marketplace: string };
      const { code, state } = request.query as { code: string; state: string };

      if (!code || !state) {
        return reply.status(400).send({ success: false, error: "Missing code or state" });
      }

      const userId = state; // In production, use a signed JWT state param
      const tokens = await exchangeOAuthCode(marketplace.toUpperCase(), code);

      await fastify.prisma.marketplaceConnection.upsert({
        where: {
          userId_marketplace: {
            userId,
            marketplace: marketplace.toUpperCase() as any,
          },
        },
        update: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          accountName: tokens.accountName,
          isActive: true,
        },
        create: {
          userId,
          marketplace: marketplace.toUpperCase() as any,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          accountName: tokens.accountName,
          accountId: tokens.accountId,
        },
      });

      // Redirect back to settings page
      const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
      return reply.redirect(`${webUrl}/settings/marketplaces?connected=${marketplace}`);
    }
  );
}

function buildOAuthUrl(marketplace: string, userId: string): string {
  const redirectUri = `${process.env.API_URL ?? "http://localhost:3001"}/api/marketplaces/oauth/${marketplace.toLowerCase()}/callback`;

  switch (marketplace) {
    case "EBAY":
      return (
        `https://auth.ebay.com/oauth2/authorize?` +
        new URLSearchParams({
          client_id: process.env.EBAY_CLIENT_ID ?? "",
          response_type: "code",
          redirect_uri: redirectUri,
          scope: "https://api.ebay.com/oauth/api_scope/sell.inventory",
          state: userId,
        }).toString()
      );
    default:
      throw new Error(`OAuth not configured for ${marketplace}`);
  }
}

async function exchangeOAuthCode(
  marketplace: string,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountName?: string;
  accountId?: string;
}> {
  // Placeholder — real implementation exchanges the code with the marketplace API
  switch (marketplace) {
    case "EBAY": {
      const credentials = Buffer.from(
        `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
      ).toString("base64");

      const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${process.env.API_URL}/api/marketplaces/oauth/ebay/callback`,
        }).toString(),
      });

      if (!res.ok) throw new Error(`eBay token exchange failed: ${res.status}`);
      const data = (await res.json()) as any;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    }
    default:
      throw new Error(`OAuth exchange not implemented for ${marketplace}`);
  }
}
