// Analytics cookie consent. Visitors in opt-in jurisdictions get no GA cookies until they
// accept (Google Analytics runs cookieless under Consent Mode meanwhile); everyone else
// gets cookies by default and can opt out from the privacy page. Shared by the
// middleware and the banner.

export type ConsentChoice = "granted" | "denied";

/** The visitor's saved choice. */
export const CONSENT_COOKIE = "cookie_consent";
/** "1" when the visitor's country requires opt-in — set by the middleware from geo-IP. */
export const CONSENT_REQUIRED_COOKIE = "cookie_consent_required";
/** Dispatched on `window` to reopen the banner (see CookiePreferencesButton). */
export const CONSENT_OPEN_EVENT = "cookie-consent:open";

const SIX_MONTHS = 60 * 60 * 24 * 182;

/** EU/EEA member states plus the UK and Switzerland (ISO 3166-1 alpha-2). */
export const OPT_IN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", // EU
  "IS", "LI", "NO", // EEA
  "GB", "CH",
]);

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function readConsent(): ConsentChoice | undefined {
  const value = readCookie(CONSENT_COOKIE);
  return value === "granted" || value === "denied" ? value : undefined;
}

export function writeConsent(choice: ConsentChoice): void {
  document.cookie = `${CONSENT_COOKIE}=${choice}; path=/; max-age=${SIX_MONTHS}; samesite=lax`;
}

/** Opt-in is assumed unless the middleware positively placed the visitor outside the list. */
export function consentRequired(): boolean {
  return readCookie(CONSENT_REQUIRED_COOKIE) !== "0";
}

/** Remove Google Analytics cookies after consent is withdrawn. */
export function clearGaCookies(): void {
  const names = document.cookie
    .split("; ")
    .map((c) => c.split("=")[0] ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  // GA sets its cookies on the registrable domain, so try every parent of the hostname.
  const parts = window.location.hostname.split(".");
  const domains = parts.map((_, i) => parts.slice(i).join("."));
  for (const name of names) {
    document.cookie = `${name}=; path=/; max-age=0`;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0; domain=.${domain}`;
    }
  }
}
