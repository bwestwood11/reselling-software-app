// Thin wrapper around the Google tag loaded in app/layout.tsx. Every call is a no-op when
// analytics is off (no NEXT_PUBLIC_GA_MEASUREMENT_ID) or blocked by the browser.

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: GtagParams) => void;
  }
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
