const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/** GA identifiers captured in the browser at checkout and stored in Stripe metadata. */
export interface GaIds {
  clientId?: string;
  sessionId?: string;
}

/** Stripe metadata entries for the GA identifiers that are present. */
export function gaMetadata(ga: GaIds): Record<string, string> {
  return {
    ...(ga.clientId && { gaClientId: ga.clientId }),
    ...(ga.sessionId && { gaSessionId: ga.sessionId }),
  };
}

export interface GaPurchase {
  /** GA client ID captured in the browser at checkout. */
  clientId: string;
  /** GA session the checkout started in — without it the event is hidden from Realtime. */
  sessionId?: string;
  /** Stripe invoice or checkout-session id — GA de-duplicates purchases on this. */
  transactionId: string;
  /** Amount charged, in major units (dollars). */
  value: number;
  currency: string;
  itemId: string;
  itemName: string;
  quantity?: number;
  /** Extra event parameters, e.g. the Stripe billing reason. */
  params?: Record<string, string | number>;
}

/**
 * Report a purchase to GA4 through the Measurement Protocol. Charges happen in Stripe
 * with no browser present (trial conversions, renewals), so they can't be tracked
 * client-side. No-op unless GA_MEASUREMENT_ID and GA_API_SECRET are set; never throws,
 * so analytics can't break billing.
 */
export async function sendGaPurchase(purchase: GaPurchase): Promise<void> {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) {
    console.warn(
      `[ga] purchase ${purchase.transactionId} not sent: GA_MEASUREMENT_ID / GA_API_SECRET not set`
    );
    return;
  }

  const quantity = purchase.quantity ?? 1;
  try {
    const res = await fetch(
      `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          client_id: purchase.clientId,
          events: [
            {
              name: "purchase",
              params: {
                transaction_id: purchase.transactionId,
                value: purchase.value,
                currency: purchase.currency,
                engagement_time_msec: 1,
                ...(purchase.sessionId && { session_id: purchase.sessionId }),
                items: [
                  {
                    item_id: purchase.itemId,
                    item_name: purchase.itemName,
                    price: purchase.value / quantity,
                    quantity,
                  },
                ],
                ...purchase.params,
              },
            },
          ],
        }),
      }
    );
    if (!res.ok) {
      console.error(`[ga] purchase ${purchase.transactionId} rejected: ${res.status}`);
      return;
    }
    console.log(`[ga] purchase ${purchase.transactionId} sent (${purchase.value} ${purchase.currency})`);
  } catch (err) {
    console.error(`[ga] purchase ${purchase.transactionId} failed to send:`, err);
  }
}
