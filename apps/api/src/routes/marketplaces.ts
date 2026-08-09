import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { refreshConnectionIfNeeded } from "../services/marketplace/token-refresh";
import {
  loginWithGoogleToken,
  loginWithEmail,
} from "../services/marketplace/mercari-auth.service";
import { ImportService } from "../services/marketplace/import.service";
import { scheduleMercariZenRowsFallback } from "../jobs/mercari-zenrows.worker";
import { MercariZenRowsService } from "../services/marketplace/mercari-zenrows.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safely parse a Prisma Json field that may have been double-encoded as a string.
function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

// ─── eBay constants ───────────────────────────────────────────────────────────

const isSandbox = () => process.env.EBAY_SANDBOX === "true";

/** Returns the effective eBay user token — env override takes priority over the DB-stored OAuth token. */
function effectiveEbayToken(connectionAccessToken: string): string {
  return process.env["EBAY_AUTH_TOKEN"] ?? connectionAccessToken;
}

const EBAY_AUTH_BASE = () =>
  isSandbox()
    ? "https://auth.sandbox.ebay.com/oauth2/authorize"
    : "https://auth.ebay.com/oauth2/authorize";

const EBAY_TOKEN_URL = () =>
  isSandbox()
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_IDENTITY_URL = () =>
  isSandbox()
    ? "https://apiz.sandbox.ebay.com/commerce/identity/v1/user/"
    : "https://apiz.ebay.com/commerce/identity/v1/user/";

const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
].join(" ");

function getEbayRedirectUri(): string {
  return (
    process.env.EBAY_REDIRECT_URI ??
    `${process.env.API_URL ?? "http://localhost:3001"}/api/marketplaces/oauth/ebay/callback`
  );
}

// ─── OAuth state signing ──────────────────────────────────────────────────────

function signState(userId: string): string {
  const timestamp = Date.now().toString();
  const secret = process.env.BETTER_AUTH_SECRET ?? "dev-secret";
  const hmac = createHmac("sha256", secret)
    .update(`${userId}:${timestamp}`)
    .digest("hex");
  return Buffer.from(`${userId}:${timestamp}:${hmac}`).toString("base64url");
}

function verifyState(state: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [userId, timestamp, hmac] = parts as [string, string, string];

    // Reject states older than 10 minutes
    if (Date.now() - parseInt(timestamp, 10) > 10 * 60 * 1000) return null;

    const secret = process.env.BETTER_AUTH_SECRET ?? "dev-secret";
    const expected = createHmac("sha256", secret)
      .update(`${userId}:${timestamp}`)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const hmacBuf = Buffer.from(hmac, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (hmacBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(hmacBuf, expectedBuf)) return null;

    return { userId };
  } catch {
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function marketplacesRoutes(fastify: FastifyInstance) {
  // GET /api/marketplaces/connections
  fastify.get(
    "/connections",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connections = await fastify.prisma.marketplaceConnection.findMany({
        where: { userId: request.user!.id, isActive: true },
        select: {
          id: true,
          marketplace: true,
          accountName: true,
          accountId: true,
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
  // Soft-delete: sets isActive=false so linked listings (FK) are preserved.
  fastify.delete(
    "/connections/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.prisma.marketplaceConnection.updateMany({
        where: { id, userId: request.user!.id },
        data: { isActive: false },
      });
      return reply.send({ success: true, message: "Connection removed" });
    }
  );

  // POST /api/marketplaces/ebay/setup-policies
  fastify.post(
    "/ebay/setup-policies",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: {
          userId_marketplace: { userId: request.user!.id, marketplace: "EBAY" },
        },
      });

      if (!connection || !connection.isActive) {
        return reply.status(404).send({ success: false, error: "eBay account not connected" });
      }

      let freshConnection;
      try {
        freshConnection = await refreshConnectionIfNeeded(fastify.prisma, connection);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Token refresh failed";
        return reply.status(401).send({ success: false, error: message });
      }

      const apiBase =
        process.env.EBAY_SANDBOX === "true"
          ? "https://api.sandbox.ebay.com"
          : "https://api.ebay.com";

      const headers: Record<string, string> = {
        Authorization: `Bearer ${effectiveEbayToken(freshConnection.accessToken)}`,
        "Content-Type": "application/json",
      };

      const results: Record<string, unknown> = {};
      const errors: string[] = [];

      // ── Opt in to SELLING_POLICY_MANAGEMENT ──────────────────────
      // Required before business policies (fulfillment/payment/return) can be used.
      // eBay returns 200 if already opted in, so this is safe to call every time.
      try {
        const optInRes = await fetch(`${apiBase}/sell/account/v1/program/opt_in`, {
          method: "POST",
          headers,
          body: JSON.stringify({ programType: "SELLING_POLICY_MANAGEMENT" }),
        });
        if (optInRes.ok) {
          results.optIn = "opted in to SELLING_POLICY_MANAGEMENT";
        } else {
          const body = (await optInRes.json()) as Record<string, unknown>;
          const firstError = (body.errors as Array<{ message?: string; longMessage?: string }>)?.[0];
          const detail = firstError?.longMessage ?? firstError?.message ?? JSON.stringify(body);
          // 409 Conflict means already opted in — that's fine
          if (optInRes.status === 409) {
            results.optIn = "already opted in";
          } else {
            results.optIn = `opt-in warning: ${detail}`;
            fastify.log.warn({ status: optInRes.status, body }, "eBay opt-in returned non-200");
          }
        }
      } catch (err) {
        fastify.log.error({ err }, "eBay opt-in call failed");
        results.optIn = "opt-in request failed";
      }

      // ── helper: GET existing policies ────────────────────────────
      const policyListKey: Record<string, string> = {
        "/sell/account/v1/fulfillment_policy": "fulfillmentPolicies",
        "/sell/account/v1/payment_policy": "paymentPolicies",
        "/sell/account/v1/return_policy": "returnPolicies",
      };
      const getExisting = async (path: string): Promise<unknown[]> => {
        const res = await fetch(`${apiBase}${path}?marketplace_id=EBAY_US`, { headers });
        if (!res.ok) {
          const body = await res.text();
          fastify.log.warn({ status: res.status, path, body }, "eBay GET policy failed");
          return [];
        }
        const body = (await res.json()) as Record<string, unknown>;
        const key = policyListKey[path] ?? Object.keys(body)[0];
        return key ? (body[key] as unknown[]) ?? [] : [];
      };

      // ── helper: POST a new policy ─────────────────────────────────
      const createPolicy = async (path: string, body: unknown): Promise<unknown> => {
        const res = await fetch(`${apiBase}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          const firstError = (json.errors as Array<{ message?: string; longMessage?: string }>)?.[0];
          const detail = firstError?.longMessage ?? firstError?.message ?? JSON.stringify(json);
          fastify.log.error({ path, responseBody: json }, "eBay policy creation failed");
          throw new Error(detail);
        }
        return json;
      };

      // ── Fulfillment policy ────────────────────────────────────────
      try {
        const existing = await getExisting("/sell/account/v1/fulfillment_policy");
        if (existing.length > 0) {
          results.fulfillmentPolicy = existing[0];
          results.fulfillmentPolicyStatus = "existing";
        } else {
          try {
            results.fulfillmentPolicy = await createPolicy("/sell/account/v1/fulfillment_policy", {
              name: "Standard Shipping",
              marketplaceId: "EBAY_US",
              categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: false }],
              handlingTime: { value: 3, unit: "DAY" },
              shippingOptions: [
                {
                  costType: "FLAT_RATE",
                  optionType: "DOMESTIC",
                  shippingServices: [
                    {
                      shippingCarrierCode: "USPS",
                      shippingServiceCode: "USPSPriority",
                      shippingCost: { value: "5.00", currency: "USD" },
                      freeShipping: false,
                      sortOrder: 1,
                    },
                  ],
                },
              ],
            });
            results.fulfillmentPolicyStatus = "created";
          } catch (createErr) {
            const msg = createErr instanceof Error ? createErr.message : String(createErr);
            // If name conflict, the policy already exists — fetch and return it
            if (msg.toLowerCase().includes("already exists")) {
              const retry = await getExisting("/sell/account/v1/fulfillment_policy");
              if (retry.length > 0) {
                results.fulfillmentPolicy = retry[0];
                results.fulfillmentPolicyStatus = "existing";
              } else {
                errors.push(`Fulfillment policy: ${msg}`);
              }
            } else {
              errors.push(`Fulfillment policy: ${msg}`);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Fulfillment policy: ${msg}`);
      }

      // ── Payment policy ────────────────────────────────────────────
      // eBay managed payments: no paymentMethods array needed
      try {
        const existing = await getExisting("/sell/account/v1/payment_policy");
        if (existing.length > 0) {
          results.paymentPolicy = existing[0];
          results.paymentPolicyStatus = "existing";
        } else {
          results.paymentPolicy = await createPolicy("/sell/account/v1/payment_policy", {
            name: "eBay Managed Payments",
            marketplaceId: "EBAY_US",
            categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: false }],
          });
          results.paymentPolicyStatus = "created";
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Payment policy: ${msg}`);
      }

      // ── Return policy ─────────────────────────────────────────────
      try {
        const existing = await getExisting("/sell/account/v1/return_policy");
        if (existing.length > 0) {
          results.returnPolicy = existing[0];
          results.returnPolicyStatus = "existing";
        } else {
          results.returnPolicy = await createPolicy("/sell/account/v1/return_policy", {
            name: "30 Day Returns",
            marketplaceId: "EBAY_US",
            categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: false }],
            returnsAccepted: true,
            returnPeriod: { value: 30, unit: "DAY" },
            returnShippingCostPayer: "BUYER",
            refundMethod: "MONEY_BACK",
          });
          results.returnPolicyStatus = "created";
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Return policy: ${msg}`);
      }

      return reply.send({ success: true, data: results, errors });
    }
  );

  // GET /api/marketplaces/ebay/policies
  fastify.get(
    "/ebay/policies",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: {
          userId_marketplace: {
            userId: request.user!.id,
            marketplace: "EBAY",
          },
        },
      });

      if (!connection || !connection.isActive) {
        return reply.status(404).send({ success: false, error: "eBay account not connected" });
      }

      let freshConnection;
      try {
        freshConnection = await refreshConnectionIfNeeded(fastify.prisma, connection);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Token refresh failed";
        return reply.status(401).send({ success: false, error: message });
      }

      const apiBase =
        process.env.EBAY_SANDBOX === "true"
          ? "https://api.sandbox.ebay.com"
          : "https://api.ebay.com";

      const headers = {
        Authorization: `Bearer ${effectiveEbayToken(freshConnection.accessToken)}`,
        "Content-Type": "application/json",
      };

      const fetchPolicy = async (path: string): Promise<Record<string, unknown>> => {
        const res = await fetch(`${apiBase}${path}`, { headers });
        if (!res.ok) {
          fastify.log.warn({ status: res.status, path }, "eBay policy fetch failed");
          return {};
        }
        return res.json() as Promise<Record<string, unknown>>;
      };

      const [fulfillment, payment, returnPol] = await Promise.all([
        fetchPolicy("/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US"),
        fetchPolicy("/sell/account/v1/payment_policy?marketplace_id=EBAY_US"),
        fetchPolicy("/sell/account/v1/return_policy?marketplace_id=EBAY_US"),
      ]);

      return reply.send({
        success: true,
        data: {
          fulfillmentPolicies: (fulfillment.fulfillmentPolicies as unknown[]) ?? [],
          paymentPolicies: (payment.paymentPolicies as unknown[]) ?? [],
          returnPolicies: (returnPol.returnPolicies as unknown[]) ?? [],
        },
      });
    }
  );

  // POST /api/marketplaces/mercari/google-login — sign in with a Google ID token
  // The frontend obtains the token via Google Identity Services with Mercari's client ID.
  fastify.post(
    "/mercari/google-login",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { idToken } = request.body as { idToken?: string };

      if (!idToken) {
        return reply.status(400).send({ success: false, error: "idToken is required" });
      }

      try {
        const tokens = await loginWithGoogleToken(idToken);

        await fastify.prisma.marketplaceConnection.upsert({
          where: {
            userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" },
          },
          update: {
            accessToken: tokens.accessToken,
            refreshToken: null,
            accountId: tokens.accountId ?? null,
            accountName: tokens.accountName ?? null,
            isActive: true,
            expiresAt: null,
          },
          create: {
            userId: request.user!.id,
            marketplace: "MERCARI",
            accessToken: tokens.accessToken,
            refreshToken: null,
            accountId: tokens.accountId ?? null,
            accountName: tokens.accountName ?? null,
          },
        });

        return reply.send({ success: true, data: { connected: true, accountName: tokens.accountName } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Google login failed";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // POST /api/marketplaces/mercari/login — email + password login (confirmed endpoint)
  // recaptchaEnterpriseToken is generated client-side using Mercari's reCAPTCHA site key
  // and forwarded here — it is NOT generated server-side.
  fastify.post(
    "/mercari/login",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { email, password, recaptchaEnterpriseToken } = request.body as {
        email?: string;
        password?: string;
        recaptchaEnterpriseToken?: string;
      };

      if (!email?.trim() || !password) {
        return reply
          .status(400)
          .send({ success: false, error: "email and password are required" });
      }
      if (!recaptchaEnterpriseToken) {
        return reply
          .status(400)
          .send({ success: false, error: "recaptchaEnterpriseToken is required" });
      }

      try {
        const tokens = await loginWithEmail(
          email.trim(),
          password,
          recaptchaEnterpriseToken
        );

        await fastify.prisma.marketplaceConnection.upsert({
          where: {
            userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" },
          },
          update: {
            accessToken: tokens.accessToken,
            refreshToken: null,
            accountId: tokens.accountId ?? null,
            accountName: tokens.accountName ?? null,
            isActive: true,
            expiresAt: null,
          },
          create: {
            userId: request.user!.id,
            marketplace: "MERCARI",
            accessToken: tokens.accessToken,
            refreshToken: null,
            accountId: tokens.accountId ?? null,
            accountName: tokens.accountName ?? null,
          },
        });

        return reply.send({
          success: true,
          data: { connected: true, accountName: tokens.accountName },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // GET /api/marketplaces/mercari/token — returns the stored access token for the WebView publish flow
  fastify.get(
    "/mercari/token",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { accessToken: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      return reply.send({ success: true, data: { accessToken: connection.accessToken } });
    }
  );

  // POST /api/marketplaces/mercari/connect-token — saves a Mercari session token + full
  // cookie jar captured by the extension after the user logs in.
  fastify.post(
    "/mercari/connect-token",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { accessToken, accountId, accountName, cookies, csrfToken, addresses } = request.body as {
        accessToken?: string;
        accountId?: string;
        accountName?: string;
        cookies?: unknown[];
        csrfToken?: string;
        addresses?: unknown[];
      };

      if (!accessToken?.trim()) {
        return reply.status(400).send({ success: false, error: "accessToken is required" });
      }

      const cookiesJson = Array.isArray(cookies) && cookies.length > 0
        ? JSON.stringify(cookies)
        : undefined;

      // Fetch existing metadata to merge rather than overwrite
      const existing = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true },
      });
      const existingMeta = parseMeta(existing?.metadata);
      const newMeta: Record<string, unknown> = { ...existingMeta };
      if (csrfToken) newMeta.csrfToken = csrfToken;
      if (Array.isArray(addresses)) newMeta.addresses = addresses;
      const metadataToStore = Object.keys(newMeta).length > 0 ? newMeta : undefined;

      await fastify.prisma.marketplaceConnection.upsert({
        where: {
          userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" },
        },
        update: {
          accessToken,
          ...(cookiesJson !== undefined ? { sessionCookies: cookiesJson } : {}),
          ...(metadataToStore !== undefined ? { metadata: metadataToStore as any } : {}),
          accountId: accountId ?? null,
          accountName: accountName ?? null,
          isActive: true,
          expiresAt: null,
        },
        create: {
          userId: request.user!.id,
          marketplace: "MERCARI",
          accessToken,
          sessionCookies: cookiesJson ?? null,
          metadata: (metadataToStore ?? undefined) as any,
          accountId: accountId ?? null,
          accountName: accountName ?? null,
        },
      });

      return reply.send({ success: true, data: { connected: true, accountName: accountName ?? null } });
    }
  );

  // GET /api/marketplaces/mercari/session — returns stored cookies for the extension to
  // re-inject into a mercari.com tab before making API calls.
  fastify.get(
    "/mercari/session",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { accessToken: true, sessionCookies: true, metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      let cookies: unknown[] = [];
      if (connection.sessionCookies) {
        try { cookies = JSON.parse(connection.sessionCookies); } catch {}
      }

      const meta = parseMeta(connection.metadata);
      const csrfToken = typeof meta.csrfToken === "string" ? meta.csrfToken : null;

      return reply.send({
        success: true,
        data: { accessToken: connection.accessToken, cookies, csrfToken },
      });
    }
  );

  // GET /api/marketplaces/mercari/addresses — returns delivery addresses stored in metadata
  fastify.get(
    "/mercari/addresses",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      const meta = parseMeta(connection.metadata);
      const addresses = Array.isArray(meta.addresses) ? meta.addresses : [];
      const preferredAddressId = typeof meta.preferredAddressId === "number" ? meta.preferredAddressId : null;
      const preferredShippingMethod =
        meta.preferredShippingMethod === "SOYO" || meta.preferredShippingMethod === "PREPAID"
          ? meta.preferredShippingMethod
          : null;
      return reply.send({ success: true, data: addresses, preferredAddressId, preferredShippingMethod });
    }
  );

  // PATCH /api/marketplaces/mercari/preferred-address — sets the address prefill should
  // default new Mercari listings to, chosen from the account's synced address list.
  fastify.patch(
    "/mercari/preferred-address",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { addressId } = (request.body ?? {}) as { addressId?: number };
      if (typeof addressId !== "number") {
        return reply.status(400).send({ success: false, error: "addressId is required" });
      }

      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      const meta = parseMeta(connection.metadata);
      const addresses = Array.isArray(meta.addresses) ? meta.addresses : [];
      const exists = addresses.some((a: any) => Number(a?.id) === addressId);
      if (!exists) {
        return reply.status(400).send({ success: false, error: "Unknown address ID" });
      }

      await fastify.prisma.marketplaceConnection.update({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        data: { metadata: { ...meta, preferredAddressId: addressId } as any },
      });

      return reply.send({ success: true, data: { preferredAddressId: addressId } });
    }
  );

  // PATCH /api/marketplaces/mercari/preferred-shipping-method — sets the shipping method
  // (SOYO/PREPAID) prefill should default new Mercari listings to when no prior listing
  // or item weight already implies one.
  fastify.patch(
    "/mercari/preferred-shipping-method",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { method } = (request.body ?? {}) as { method?: string };
      if (method !== "SOYO" && method !== "PREPAID") {
        return reply.status(400).send({ success: false, error: "method must be SOYO or PREPAID" });
      }

      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      const meta = parseMeta(connection.metadata);
      await fastify.prisma.marketplaceConnection.update({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        data: { metadata: { ...meta, preferredShippingMethod: method } as any },
      });

      return reply.send({ success: true, data: { preferredShippingMethod: method } });
    }
  );

  // POST /api/marketplaces/mercari/refresh-addresses
  // - With { addresses } body: saves addresses directly (from mobile WebView).
  // - Without body: creates a fetch-addresses job for the browser extension to execute.
  fastify.post(
    "/mercari/refresh-addresses",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { addresses } = ((request.body ?? {}) as { addresses?: unknown[] });

      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
        select: { metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Mercari account not connected" });
      }

      // Mobile WebView sends addresses directly — save them and return immediately.
      if (Array.isArray(addresses)) {
        const existingMeta = parseMeta(connection.metadata);
        await fastify.prisma.marketplaceConnection.update({
          where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
          data: { metadata: { ...existingMeta, addresses } as any },
        });
        return reply.send({ success: true, data: addresses });
      }

      // If ZenRows is configured, fetch addresses immediately server-side (no extension, no
      // queue wait) and return them. This is a plain HTTPS call, so it needs only ZENROWS_API_KEY
      // (not Redis). On failure, fall through to the extension-job path below.
      if (MercariZenRowsService.isConfigured()) {
        try {
          const svc = new MercariZenRowsService(fastify.prisma);
          const fetched = await svc.fetchDeliveryAddresses(request.user!.id);
          const existingMeta = parseMeta(connection.metadata);
          await fastify.prisma.marketplaceConnection.update({
            where: { userId_marketplace: { userId: request.user!.id, marketplace: "MERCARI" } },
            data: { metadata: { ...existingMeta, addresses: fetched } as any },
          });
          return reply.send({ success: true, data: fetched });
        } catch (err) {
          fastify.log.error(
            { err },
            "ZenRows address fetch failed — falling back to extension job"
          );
        }
      }

      // Web: create a job the extension will pick up and execute in a real browser tab.
      const job = await fastify.prisma.mercariJob.create({
        data: {
          userId: request.user!.id,
          listingId: null,
          payload: { type: "fetch-addresses" },
        },
      });

      // Server-side ZenRows fallback if the extension doesn't complete it (no-op unless configured).
      scheduleMercariZenRowsFallback(job.id);

      return reply.status(202).send({ success: true, data: { jobId: job.id } });
    }
  );

  // POST /api/marketplaces/poshmark/connect-token — saves a Poshmark session captured by
  // the extension after the user logs in via poshmark.com/login.
  fastify.post(
    "/poshmark/connect-token",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { accessToken, accountId, accountName, cookies, csrfToken } = request.body as {
        accessToken?: string;
        accountId?: string;
        accountName?: string;
        cookies?: unknown[];
        csrfToken?: string;
      };

      if (!accessToken?.trim()) {
        return reply.status(400).send({ success: false, error: "accessToken is required" });
      }

      const cookiesJson =
        Array.isArray(cookies) && cookies.length > 0 ? JSON.stringify(cookies) : undefined;

      const existing = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "POSHMARK" } },
        select: { metadata: true },
      });
      const existingMeta = parseMeta(existing?.metadata);
      const newMeta: Record<string, unknown> = { ...existingMeta };
      if (csrfToken) newMeta.csrfToken = csrfToken;
      const metadataToStore = Object.keys(newMeta).length > 0 ? newMeta : undefined;

      await fastify.prisma.marketplaceConnection.upsert({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "POSHMARK" } },
        update: {
          accessToken,
          ...(cookiesJson !== undefined ? { sessionCookies: cookiesJson } : {}),
          ...(metadataToStore !== undefined ? { metadata: metadataToStore as any } : {}),
          accountId: accountId ?? null,
          accountName: accountName ?? null,
          isActive: true,
          expiresAt: null,
        },
        create: {
          userId: request.user!.id,
          marketplace: "POSHMARK",
          accessToken,
          sessionCookies: cookiesJson ?? null,
          metadata: (metadataToStore ?? undefined) as any,
          accountId: accountId ?? null,
          accountName: accountName ?? null,
        },
      });

      return reply.send({
        success: true,
        data: { connected: true, accountName: accountName ?? null },
      });
    }
  );

  // GET /api/marketplaces/poshmark/session — returns stored cookies so the extension can
  // re-inject them into a poshmark.com tab before making API calls.
  fastify.get(
    "/poshmark/session",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "POSHMARK" } },
        select: { accessToken: true, sessionCookies: true, metadata: true, isActive: true },
      });

      if (!connection?.isActive) {
        return reply.status(404).send({ success: false, error: "Poshmark account not connected" });
      }

      let cookies: unknown[] = [];
      if (connection.sessionCookies) {
        try { cookies = JSON.parse(connection.sessionCookies); } catch {}
      }

      const meta = parseMeta(connection.metadata);
      const csrfToken = typeof meta.csrfToken === "string" ? meta.csrfToken : null;

      return reply.send({
        success: true,
        data: { accessToken: connection.accessToken, cookies, csrfToken },
      });
    }
  );

  // GET /api/marketplaces/ebay/category-suggestions?q=
  fastify.get(
    "/ebay/category-suggestions",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { q } = request.query as { q?: string };
      if (!q?.trim()) {
        return reply.send({ success: true, data: [] });
      }

      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "EBAY" } },
      });
      if (!connection || !connection.isActive) {
        return reply.status(404).send({ success: false, error: "eBay account not connected" });
      }

      let freshConnection;
      try {
        freshConnection = await refreshConnectionIfNeeded(fastify.prisma, connection);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Token refresh failed";
        return reply.status(401).send({ success: false, error: message });
      }

      const apiBase =
        process.env.EBAY_SANDBOX === "true"
          ? "https://api.sandbox.ebay.com"
          : "https://api.ebay.com";

      // Use Application token for taxonomy — public catalog data, no user context needed
      const appToken = await getEbayAppToken();
      // eBay US category tree ID is 0
      const url = `${apiBase}/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${appToken}` },
      });

      if (!res.ok) {
        fastify.log.warn({ status: res.status, q }, "eBay category suggestions failed");
        return reply.send({ success: true, data: [] });
      }

      const body = (await res.json()) as {
        categorySuggestions?: Array<{
          category: { categoryId: string; categoryName: string };
          categoryTreeNodeAncestors?: Array<{ categoryName: string; categoryTreeNodeLevel: number }>;
        }>;
      };

      const data = (body.categorySuggestions ?? []).slice(0, 20).map((s) => {
        const ancestors = (s.categoryTreeNodeAncestors ?? [])
          .sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel)
          .map((a) => a.categoryName);
        return {
          categoryId: s.category.categoryId,
          categoryName: s.category.categoryName,
          breadcrumb: [...ancestors, s.category.categoryName].join(" › "),
        };
      });

      return reply.send({ success: true, data });
    }
  );

  // GET /api/marketplaces/ebay/category-aspects?categoryId=
  fastify.get(
    "/ebay/category-aspects",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { categoryId } = request.query as { categoryId?: string };
      if (!categoryId?.trim()) {
        return reply.send({ success: true, data: [] });
      }

      const connection = await fastify.prisma.marketplaceConnection.findUnique({
        where: { userId_marketplace: { userId: request.user!.id, marketplace: "EBAY" } },
      });
      if (!connection || !connection.isActive) {
        return reply.status(404).send({ success: false, error: "eBay account not connected" });
      }

      let freshConnection;
      try {
        freshConnection = await refreshConnectionIfNeeded(fastify.prisma, connection);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Token refresh failed";
        return reply.status(401).send({ success: false, error: message });
      }

      // Taxonomy API uses an Application token (client credentials), not the user's OAuth token.
      // This avoids sandbox/production token mismatch — category data is public catalog data.
      const appToken = await getEbayAppToken();
      const taxonomyBase = isSandbox()
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com";

      const url = `${taxonomyBase}/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId.trim())}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${appToken}` },
      });

      if (!res.ok) {
        const errBody = await res.text();
        fastify.log.warn({ status: res.status, categoryId, errBody }, "eBay category aspects failed");
        return reply.status(res.status).send({
          success: false,
          error: `eBay aspects API returned ${res.status}: ${errBody.slice(0, 200)}`,
        });
      }

      const body = (await res.json()) as {
        aspects?: Array<{
          localizedAspectName: string;
          aspectValues?: Array<{ localizedValue: string }>;
          aspectConstraint?: {
            aspectUsage?: string; // "REQUIRED" | "RECOMMENDED" | "OPTIONAL"
            aspectRequired?: boolean;
          };
        }>;
      };

      const allAspects = body.aspects ?? [];

// Sort: required first, then RECOMMENDED, then OPTIONAL. Cap at 30 total.
      const usageOrder: Record<string, number> = { REQUIRED: 0, RECOMMENDED: 1, OPTIONAL: 2 };
      const aspects = allAspects
        .sort((a, b) => {
          const ac = a.aspectConstraint;
          const bc = b.aspectConstraint;
          const aReq = ac?.aspectRequired === true || ac?.aspectUsage === "REQUIRED" ? 0
            : ac?.aspectUsage === "RECOMMENDED" ? 1 : 2;
          const bReq = bc?.aspectRequired === true || bc?.aspectUsage === "REQUIRED" ? 0
            : bc?.aspectUsage === "RECOMMENDED" ? 1 : 2;
          return aReq - bReq;
        })
        .slice(0, 30)
        .map((a) => {
          const c = a.aspectConstraint;
          return {
            name: a.localizedAspectName,
            required: c?.aspectRequired === true || c?.aspectUsage === "REQUIRED",
            suggestedValues: (a.aspectValues ?? []).slice(0, 30).map((v) => v.localizedValue),
          };
        });

      return reply.send({ success: true, data: aspects });
    }
  );

  // GET /api/marketplaces/ebay/importable-listings
  fastify.get(
    "/ebay/importable-listings",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const {
        status = "active",
        showImported = "false",
        page = "1",
        limit = "50",
        search = "",
      } = request.query as Record<string, string>;

      if (!["active", "ended", "sold"].includes(status)) {
        return reply.status(400).send({ success: false, error: "status must be active, ended, or sold" });
      }

      try {
        const service = new ImportService(fastify.prisma);
        const result = await service.getImportableListings(
          request.user!.id,
          status as "active" | "ended" | "sold",
          showImported === "true",
          Math.max(1, Number.parseInt(page, 10) || 1),
          Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50)),
          search
        );
        return reply.send({ success: true, ...result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch eBay listings";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // POST /api/marketplaces/ebay/import
  fastify.post(
    "/ebay/import",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { ebayItemIds } = request.body as { ebayItemIds?: unknown };

      if (!Array.isArray(ebayItemIds) || ebayItemIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: "ebayItemIds must be a non-empty array of strings",
        });
      }

      const ids = ebayItemIds.filter((id): id is string => typeof id === "string" && id.length > 0);
      if (ids.length === 0) {
        return reply.status(400).send({ success: false, error: "No valid eBay item IDs provided" });
      }

      try {
        const service = new ImportService(fastify.prisma);
        const result = await service.importItems(request.user!.id, ids);
        return reply.send({ success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // GET /api/marketplaces/oauth/:marketplace/authorize
  fastify.get(
    "/oauth/:marketplace/authorize",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { marketplace } = request.params as { marketplace: string };
      try {
        const url = buildOAuthUrl(marketplace.toUpperCase(), request.user!.id);
        return reply.send({ success: true, data: { url } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "OAuth not configured";
        return reply.status(400).send({ success: false, error: message });
      }
    }
  );

  // GET /api/marketplaces/oauth/:marketplace/callback
  // Public — eBay redirects the browser here with ?code=&state=
  fastify.get("/oauth/:marketplace/callback", async (request, reply) => {
    const { marketplace } = request.params as { marketplace: string };
    const { code, state, error, error_description } = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const errorRedirect = (msg: string) =>
      reply.redirect(
        `${webUrl}/marketplaces?error=${encodeURIComponent(msg)}`
      );

    // Provider declined or user cancelled
    if (error) {
      return errorRedirect(error_description ?? error ?? "Authorization denied");
    }

    if (!code || !state) {
      return errorRedirect("Missing authorization code or state parameter");
    }

    const stateData = verifyState(state);
    if (!stateData) {
      return errorRedirect("Invalid or expired authorization state — please try again");
    }

    try {
      const tokens = await exchangeOAuthCode(marketplace.toUpperCase(), code);

      await fastify.prisma.marketplaceConnection.upsert({
        where: {
          userId_marketplace: {
            userId: stateData.userId,
            marketplace: marketplace.toUpperCase() as any,
          },
        },
        update: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: tokens.expiresAt ?? null,
          accountName: tokens.accountName ?? null,
          accountId: tokens.accountId ?? null,
          isActive: true,
        },
        create: {
          userId: stateData.userId,
          marketplace: marketplace.toUpperCase() as any,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: tokens.expiresAt ?? null,
          accountName: tokens.accountName ?? null,
          accountId: tokens.accountId ?? null,
        },
      });

      return reply.redirect(
        `${webUrl}/marketplaces?connected=${marketplace.toLowerCase()}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authorization failed";
      fastify.log.error({ err, marketplace }, "OAuth callback error");
      return errorRedirect(message);
    }
  });
}

// ─── OAuth URL builder ────────────────────────────────────────────────────────

function buildOAuthUrl(marketplace: string, userId: string): string {
  switch (marketplace) {
    case "EBAY": {
      // Build manually so scopes are separated by %20 (not +), which eBay requires
      const params = new URLSearchParams({
        client_id: process.env.EBAY_CLIENT_ID ?? "",
        response_type: "code",
        redirect_uri: getEbayRedirectUri(),
        state: signState(userId),
      });
      // Append scope separately with %20-encoded spaces
      const scopeEncoded = EBAY_SCOPES.split(" ")
        .map(encodeURIComponent)
        .join("%20");
      return `${EBAY_AUTH_BASE()}?${params.toString()}&scope=${scopeEncoded}`;
    }
    default:
      throw new Error(`OAuth not yet configured for ${marketplace}`);
  }
}

// ─── Token exchange ───────────────────────────────────────────────────────────

interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountName?: string;
  accountId?: string;
}

async function exchangeOAuthCode(
  marketplace: string,
  code: string
): Promise<OAuthTokenResult> {
  switch (marketplace) {
    case "EBAY":
      return exchangeEbayCode(code);
    default:
      throw new Error(`OAuth exchange not implemented for ${marketplace}`);
  }
}

async function exchangeEbayCode(code: string): Promise<OAuthTokenResult> {
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch(EBAY_TOKEN_URL(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getEbayRedirectUri(),
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`eBay token exchange failed (${tokenRes.status}): ${body}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Fetch the eBay user identity to get accountName / accountId
  let accountName: string | undefined;
  let accountId: string | undefined;

  try {
    const identityRes = await fetch(EBAY_IDENTITY_URL(), {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (identityRes.ok) {
      const identity = (await identityRes.json()) as {
        username?: string;
        userId?: string;
      };
      accountName = identity.username ?? identity.userId;
      accountId = identity.userId;
    }
  } catch {
    // Non-fatal — we can still store the connection without a display name
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    accountName,
    accountId,
  };
}

// ─── Application token (client credentials) ───────────────────────────────────
// Used for public APIs like Taxonomy that don't need a user context.
// Simple in-memory cache so we don't request a new token on every call.

let _appTokenCache: { token: string; expiresAt: number } | null = null;

async function getEbayAppToken(): Promise<string> {
  if (_appTokenCache && Date.now() < _appTokenCache.expiresAt - 60_000) {
    return _appTokenCache.token;
  }

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenUrl = isSandbox()
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay app token request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}
