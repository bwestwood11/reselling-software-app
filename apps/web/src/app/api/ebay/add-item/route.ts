import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { EbayTradingClient, TRADING_API_SCOPES } from "@/lib/ebay";
import type { AddItemPayload, EbayAuthConfig } from "@/lib/ebay";

function getEbayConfig(): EbayAuthConfig {
  const clientId = process.env["EBAY_CLIENT_ID"];
  const clientSecret = process.env["EBAY_CLIENT_SECRET"];
  const ruName = process.env["EBAY_REDIRECT_URI"] ?? process.env["EBAY_RUNAME"];
  const sandbox = (process.env["EBAY_SANDBOX"] ?? "true").toLowerCase() !== "false";

  if (!clientId) throw new Error("Missing env var: EBAY_CLIENT_ID");
  if (!clientSecret) throw new Error("Missing env var: EBAY_CLIENT_SECRET");
  if (!ruName) throw new Error("Missing env var: EBAY_REDIRECT_URI or EBAY_RUNAME");

  return {
    clientId,
    clientSecret,
    ruName,
    environment: sandbox ? "sandbox" : "production",
    scopes: [...TRADING_API_SCOPES],
  };
}

function validatePayload(body: unknown): { payload: AddItemPayload; errors: Record<string, string> } | { payload: null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (typeof body !== "object" || body === null) {
    return { payload: null, errors: { _root: "Request body must be a JSON object" } };
  }

  const b = body as Record<string, unknown>;

  if (typeof b["title"] !== "string" || !b["title"].trim()) {
    errors["title"] = "title is required";
  }
  if (typeof b["description"] !== "string" || !b["description"].trim()) {
    errors["description"] = "description is required";
  }
  if (typeof b["categoryId"] !== "string" || !b["categoryId"].trim()) {
    errors["categoryId"] = "categoryId is required";
  }
  if (typeof b["startPrice"] !== "number" || b["startPrice"] <= 0) {
    errors["startPrice"] = "startPrice must be a positive number";
  }
  if (typeof b["conditionId"] !== "number") {
    errors["conditionId"] = "conditionId is required (e.g. 1000 for New, 3000 for Used)";
  }

  const ss = b["shippingService"];
  if (typeof ss !== "object" || ss === null) {
    errors["shippingService"] = "shippingService is required";
  } else {
    const s = ss as Record<string, unknown>;
    if (typeof s["serviceName"] !== "string" || !s["serviceName"].trim()) {
      errors["shippingService.serviceName"] = "serviceName is required";
    }
    if (typeof s["cost"] !== "number" || s["cost"] < 0) {
      errors["shippingService.cost"] = "cost must be a non-negative number";
    }
  }

  const rp = b["returnPolicy"];
  if (typeof rp !== "object" || rp === null) {
    errors["returnPolicy"] = "returnPolicy is required";
  } else {
    const r = rp as Record<string, unknown>;
    if (typeof r["returnsAccepted"] !== "boolean") {
      errors["returnPolicy.returnsAccepted"] = "returnsAccepted must be a boolean";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors };
  }

  const ss2 = b["shippingService"] as Record<string, unknown>;
  const rp2 = b["returnPolicy"] as Record<string, unknown>;

  return {
    payload: {
      title: (b["title"] as string).trim().slice(0, 80),
      description: b["description"] as string,
      categoryId: (b["categoryId"] as string).trim(),
      startPrice: b["startPrice"] as number,
      conditionId: b["conditionId"] as AddItemPayload["conditionId"],
      conditionDescription: typeof b["conditionDescription"] === "string" ? b["conditionDescription"] : undefined,
      listingType: (b["listingType"] as AddItemPayload["listingType"]) ?? "FixedPriceItem",
      listingDuration: (b["listingDuration"] as AddItemPayload["listingDuration"]) ?? "GTC",
      currency: (b["currency"] as AddItemPayload["currency"]) ?? "USD",
      country: (b["country"] as AddItemPayload["country"]) ?? "US",
      quantity: typeof b["quantity"] === "number" ? b["quantity"] : 1,
      pictureUrl: typeof b["pictureUrl"] === "string" ? b["pictureUrl"] : undefined,
      uuid: typeof b["uuid"] === "string" ? b["uuid"] : undefined,
      shippingService: {
        serviceName: ss2["serviceName"] as string,
        cost: ss2["cost"] as number,
        priority: typeof ss2["priority"] === "number" ? ss2["priority"] : 1,
      },
      returnPolicy: {
        returnsAccepted: rp2["returnsAccepted"] as boolean,
        refundOption: typeof rp2["refundOption"] === "string" ? rp2["refundOption"] : undefined,
        returnsWithinOption: typeof rp2["returnsWithinOption"] === "string" ? rp2["returnsWithinOption"] : undefined,
        shippingCostPaidByOption: typeof rp2["shippingCostPaidByOption"] === "string" ? rp2["shippingCostPaidByOption"] : undefined,
      },
    },
    errors: {},
  };
}

/**
 * POST /api/ebay/add-item
 *
 * Creates a fixed-price Buy It Now listing on eBay via the Trading API.
 * Uses the authenticated user's stored OAuth refresh token — no static auth token needed.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate the caller
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's eBay connection
  const connection = await prisma.marketplaceConnection.findUnique({
    where: {
      userId_marketplace: { userId: session.user.id, marketplace: "EBAY" },
    },
  });

  if (!connection?.isActive) {
    return NextResponse.json(
      { success: false, error: "eBay account not connected. Connect your eBay account first." },
      { status: 400 },
    );
  }

  if (!connection.refreshToken) {
    return NextResponse.json(
      { success: false, error: "No eBay refresh token found. Please reconnect your eBay account." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validatePayload(body);
  if (validation.payload === null) {
    return NextResponse.json(
      { success: false, error: "Validation failed", fieldErrors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const config = getEbayConfig();
    const client = new EbayTradingClient(config, connection.refreshToken);
    const result = await client.addItem(validation.payload);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
