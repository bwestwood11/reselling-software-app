import type { PrismaClient } from "@repo/db";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if < 5 min remaining

const EBAY_TOKEN_URL =
  process.env.EBAY_SANDBOX === "true"
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_REFRESH_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
].join(" ");

type Connection = {
  id: string;
  marketplace: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
};

/**
 * If the connection's access token is expiring soon (within 5 minutes),
 * obtain a fresh one via the refresh token and persist it in the database.
 *
 * Returns the connection object (updated or original) with a valid accessToken.
 */
export async function refreshConnectionIfNeeded(
  db: PrismaClient,
  connection: Connection
): Promise<Connection> {
  if (!connection.expiresAt) return connection;

  const msRemaining = connection.expiresAt.getTime() - Date.now();
  if (msRemaining > REFRESH_BUFFER_MS) return connection; // still fresh

  if (!connection.refreshToken) {
    throw new Error(
      `${connection.marketplace} access token is expired and no refresh token is available. Please reconnect.`
    );
  }

  if (connection.marketplace === "EBAY") {
    return refreshEbayConnection(db, connection);
  }

  // For other marketplaces without refresh support, just return as-is
  return connection;
}

async function refreshEbayConnection(
  db: PrismaClient,
  connection: Connection
): Promise<Connection> {
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken!,
      scope: EBAY_REFRESH_SCOPES,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const updated = await db.marketplaceConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token,
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return {
    ...connection,
    accessToken: updated.accessToken,
    refreshToken: updated.refreshToken,
    expiresAt: updated.expiresAt,
  };
}
