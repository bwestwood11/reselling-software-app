import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help with ${SITE_NAME}: contact us, and find answers about the Chrome extension, marketplace connections and billing.`,
  alternates: { canonical: "/support" },
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I set up the Chrome extension?",
    a: (
      <>
        Install {SITE_NAME} Crosslister from the Chrome Web Store, click its icon in your browser
        toolbar and sign in with your {SITE_NAME} account. Then use the Connect buttons in the
        popup to link Mercari and Poshmark. You need an active {SITE_NAME} subscription (or free
        trial) to publish.
      </>
    ),
  },
  {
    q: "The extension says I'm not signed in, or my marketplace shows as disconnected.",
    a: "Open the extension popup and sign in again, then reconnect the marketplace. Make sure you're logged in to Mercari or Poshmark in the same Chrome browser. If a marketplace signs you out, the connection has to be refreshed.",
  },
  {
    q: "My listing is stuck on “getting listed”.",
    a: "Mercari and Poshmark listings are published by the extension from your own browser, so Chrome needs to be open with the extension signed in. Keep the browser open for a minute or two. If the listing fails, open it in Listings, fix any error shown and republish.",
  },
  {
    q: "How do I connect or disconnect a marketplace?",
    a: "Go to Marketplaces (or Settings → Marketplace Connections) in your dashboard. eBay and Depop connect through their own sign-in pages; Mercari and Poshmark connect through the Chrome extension. Disconnecting removes the stored connection.",
  },
  {
    q: "How do I manage my subscription or buy AI credits?",
    a: "Go to Settings → Billing. You can start or change a plan, buy AI credit top-ups and open the billing portal to update your card, download invoices or cancel.",
  },
  {
    q: "How do I delete my account and data?",
    a: (
      <>
        Email us from the address on your account and we&rsquo;ll delete your account and
        associated data. See our{" "}
        <Link href="/privacy" className="font-medium text-orange-600 hover:underline">
          Privacy Policy
        </Link>{" "}
        for details.
      </>
    ),
  },
];

export default function SupportPage(): import("react").JSX.Element {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${SITE_NAME} support request`)}`;

  return (
    <div className="min-h-screen bg-[#f6f5f3] text-zinc-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white shadow-sm">
            O
          </span>
          <span className="text-sm font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
        >
          Log in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-8 px-6 pb-24">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Support</h1>
          <p className="leading-relaxed text-zinc-600">
            Need help with {SITE_NAME} or the {SITE_NAME} Crosslister Chrome extension? Check the
            answers below or email us and we&rsquo;ll get back to you as soon as we can.
          </p>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-600 to-amber-500 p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)] sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold">Contact support</p>
            <p className="mt-1 text-sm text-orange-50/90">
              Include your account email and, if it&rsquo;s about a listing, which marketplace.
            </p>
          </div>
          <a
            href={mailto}
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition-all hover:-translate-y-0.5"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Common questions</h2>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-[0_12px_30px_-28px_rgba(24,24,27,0.5)]"
              >
                <summary className="cursor-pointer list-none font-semibold text-zinc-900 marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q}
                    <span className="text-orange-500 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-sm text-zinc-500">
          See also our{" "}
          <Link href="/privacy" className="font-medium text-orange-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
