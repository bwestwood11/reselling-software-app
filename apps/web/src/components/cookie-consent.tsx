"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_NAME } from "@/lib/site";
import { setAnalyticsConsent } from "@/lib/gtag";
import {
  CONSENT_OPEN_EVENT,
  clearGaCookies,
  consentRequired,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

/**
 * Loads Google Analytics under Google Consent Mode and shows the consent banner while a
 * choice is still needed. Where opt-in is required the tag runs cookieless until
 * "Accept"; elsewhere analytics cookies are on by default and the banner only appears
 * when reopened from the privacy page.
 */
export function CookieConsent({ gaId }: { gaId: string }): import("react").JSX.Element | null {
  // null until mounted — the choice lives in cookies, which the server render can't see.
  const [consent, setConsent] = useState<ConsentChoice | "pending" | null>(null);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    const required = consentRequired();
    // Queued here, before <GoogleAnalytics> mounts, so the tag starts in the right mode.
    setAnalyticsConsent("default", stored ?? (required ? "denied" : "granted"));
    setConsent(stored ?? (required ? "pending" : "granted"));
    const reopen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  function choose(choice: ConsentChoice) {
    writeConsent(choice);
    setAnalyticsConsent("update", choice);
    if (choice === "denied") clearGaCookies();
    setReopened(false);
    setConsent(choice);
  }

  if (consent === null) return null;

  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      {(consent === "pending" || reopened) && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_18px_54px_-24px_rgba(24,24,27,0.45)] sm:flex-row sm:items-center sm:gap-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">Analytics cookies</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                We&apos;d like to use Google Analytics cookies to understand how {SITE_NAME} is
                used and improve it. They&apos;re only set if you accept. See our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-orange-600 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 sm:flex-none"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose("granted")}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Reopens the consent banner so a visitor can change or withdraw their choice. */
export function CookiePreferencesButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): import("react").JSX.Element {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}
