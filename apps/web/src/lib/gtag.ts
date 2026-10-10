// Thin wrapper around the Google tag loaded in app/layout.tsx. Every call is a no-op when
// analytics is off (no NEXT_PUBLIC_GA_MEASUREMENT_ID) or blocked by the browser.

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: GtagParams) => void;
  }
}

/**
 * Tell Google Consent Mode whether analytics cookies are allowed. With "denied" the tag
 * still loads but sets and reads no cookies, sending only cookieless pings that Google
 * uses for modelled reporting. "default" must be queued before the tag is configured;
 * "update" applies a later choice. Advertising storage is always denied — we run no ads.
 */
export function setAnalyticsConsent(
  command: "default" | "update",
  analytics: "granted" | "denied"
): void {
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js only understands `arguments` objects in the queue, not arrays.
  (function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  })("consent", command, {
    analytics_storage: analytics,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function trackEvent(name: string, params?: GtagParams): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

/**
 * This visitor's GA client ID, read from the `_ga` cookie ("GA1.1.<id>.<timestamp>").
 * Passed to the API at checkout so purchases reported server-side from the Stripe
 * webhook are attributed to the same visitor.
 */
export function getGaClientId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/)?.[1];
}

/**
 * Current GA session ID, from the property's `_ga_<ID>` cookie ("GS1.1.<sid>.…" or
 * "GS2.1.s<sid>$…"). GA needs it on server-sent events for them to show in Realtime
 * and be tied to the session that started the checkout.
 */
export function getGaSessionId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.replace(/^G-/, "");
  if (!id || typeof document === "undefined") return undefined;
  return document.cookie.match(new RegExp(`(?:^|;\\s*)_ga_${id}=GS\\d\\.\\d\\.s?(\\d+)`))?.[1];
}
