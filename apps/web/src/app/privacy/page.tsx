import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and protects your data across the website, mobile app and Chrome extension.`,
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE_DATE = "September 20, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-zinc-600">{children}</p>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 leading-relaxed text-zinc-600 marker:text-orange-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-zinc-800">{children}</strong>;
}

export default function PrivacyPage(): import("react").JSX.Element {
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

      <main className="mx-auto w-full max-w-3xl px-6 pb-24">
        <article className="space-y-10 rounded-3xl border border-zinc-200 bg-white px-6 py-10 shadow-[0_18px_54px_-48px_rgba(24,24,27,0.45)] sm:px-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-zinc-500">Effective {EFFECTIVE_DATE}</p>
            <P>
              This policy explains what information {SITE_NAME} (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;) collects when you use our website, mobile app and the {SITE_NAME}{" "}
              Crosslister Chrome extension (together, the &ldquo;Service&rdquo;), how we use it,
              and the choices you have. {SITE_NAME} is software that helps resellers manage
              inventory and list items on marketplaces such as eBay, Depop, Mercari and Poshmark.
            </P>
          </div>

          <Section title="1. Information we collect">
            <List
              items={[
                <>
                  <B>Account information</B> — your name, email address and a securely hashed
                  password, or your Google account profile if you sign in with Google. We also
                  keep your subscription plan and status.
                </>,
                <>
                  <B>Inventory and listing content</B> — item titles, descriptions, prices, cost
                  prices, quantities, condition, photos and other details you enter or import,
                  plus the status of the listings created from them.
                </>,
                <>
                  <B>Marketplace connections</B> — when you connect a marketplace we store what is
                  needed to act on your behalf: OAuth access and refresh tokens (for example
                  eBay), or session tokens and cookies captured from your own logged-in browser
                  session (Mercari and Poshmark, via our Chrome extension). We also store your
                  marketplace account name and ID. If you connect Mercari by entering your
                  credentials, they are used to sign in and are not saved to your {SITE_NAME}{" "}
                  account.
                </>,
                <>
                  <B>Payment information</B> — payments are handled by Stripe. We receive your
                  billing status and the limited details Stripe shares with us, but we never see
                  or store your full card number.
                </>,
                <>
                  <B>Activity and technical data</B> — records of publish, update, delist and sync
                  events (including errors), AI credit usage, and standard server logs such as IP
                  address, browser type and timestamps.
                </>,
              ]}
            />
          </Section>

          <Section title="2. How we use your information">
            <List
              items={[
                "Provide the Service: create, publish, update, delist and sync your listings and detect when items sell.",
                "Generate AI-assisted content you request, such as listing descriptions and edited product photos.",
                "Process subscriptions, free trials, AI credit purchases and billing.",
                "Send transactional email such as your verification code, and respond to support requests.",
                "Keep the Service secure, prevent abuse and fraud, and fix bugs.",
              ]}
            />
            <P>We do not sell your personal information and we do not use it for advertising.</P>
          </Section>

          <Section title="3. Chrome extension">
            <P>
              The {SITE_NAME} Crosslister extension has a single purpose: publishing, delisting
              and checking the status of your own listings on Mercari and Poshmark from your
              browser. It:
            </P>
            <List
              items={[
                "runs only on mercari.com, poshmark.com and our API (api.omventa.com);",
                "reads your Mercari or Poshmark session cookies and tokens only after you choose to connect that marketplace, and sends them over HTTPS to our servers so we can post on your behalf;",
                "stores your sign-in token for the extension locally in your browser so you stay signed in;",
                "shows a notification when one of your listings is detected as sold; and",
                "does not read your browsing history or anything on other websites.",
              ]}
            />
            <P>
              Data obtained through the extension is used only to provide these features. We do not
              sell it, use it for advertising, or use it to determine creditworthiness or
              eligibility for lending.
            </P>
          </Section>

          <Section title="4. Who we share information with">
            <P>
              We share information only with the providers that help us run the Service, and with
              the marketplaces you tell us to use:
            </P>
            <List
              items={[
                <>
                  <B>Marketplaces you connect</B> (eBay, Depop, Mercari, Poshmark and others) —
                  your listing content and credentials or tokens, so listings can be created and
                  managed.
                </>,
                <>
                  <B>Infrastructure</B> — cloud hosting, our database, file storage for photos
                  (Amazon Web Services) and transactional email (Amazon SES).
                </>,
                <>
                  <B>Stripe</B> — payment processing and subscription management.
                </>,
                <>
                  <B>AI and image providers</B> — when you use AI features, the item photos and
                  details you select are sent to our AI provider (OpenAI) to write descriptions,
                  and photos are sent to PhotoRoom for background removal and similar edits.
                </>,
                <>
                  <B>Automation providers</B> — some marketplaces have no public API, so we use
                  browser-automation, CAPTCHA-solving and proxy services to sign in and publish on
                  your behalf.
                </>,
                <>
                  <B>Google</B> — if you choose to sign in with Google.
                </>,
              ]}
            />
            <P>
              We may also disclose information if required by law, to protect the rights, safety
              and security of our users and the Service, or in connection with a merger or sale of
              the business.
            </P>
          </Section>

          <Section title="5. Cookies and local storage">
            <P>
              We use a session cookie to keep you signed in and a small amount of browser storage
              for preferences such as your last-used inventory view. We do not use advertising or
              third-party tracking cookies. The Chrome extension uses its own local extension
              storage for its sign-in token.
            </P>
          </Section>

          <Section title="6. Retention and deletion">
            <P>
              We keep your information while your account is open. You can disconnect a
              marketplace at any time in Settings, which removes the stored tokens for that
              connection, and you can delete inventory items you no longer want. To delete your
              account and associated data, contact us at the address below. We honor marketplace
              account-deletion notifications (such as eBay&rsquo;s) by removing the related data.
              Some records may be kept for a limited time where required for legal, tax, fraud
              prevention or backup purposes.
            </P>
          </Section>

          <Section title="7. Security">
            <P>
              We use industry-standard safeguards, including encrypted connections (HTTPS), hashed
              passwords and access controls. No system is perfectly secure, so we cannot guarantee
              absolute security. Please use a strong, unique password.
            </P>
          </Section>

          <Section title="8. Your choices and rights">
            <P>
              Depending on where you live, you may have the right to access, correct, export or
              delete your personal information, and to object to or restrict certain processing.
              You can update your profile in Settings, or contact us to exercise any of these
              rights. We will not discriminate against you for doing so.
            </P>
          </Section>

          <Section title="9. International transfers">
            <P>
              We and our providers may process and store information in the United States and other
              countries where data protection laws may differ from those where you live. By using
              the Service you understand your information may be transferred to these locations.
            </P>
          </Section>

          <Section title="10. Children">
            <P>
              The Service is intended for adults and is not directed to anyone under 18. We do not
              knowingly collect information from children.
            </P>
          </Section>

          <Section title="11. Changes to this policy">
            <P>
              We may update this policy from time to time. When we make material changes we will
              update the effective date above and, where appropriate, notify you by email or in the
              app.
            </P>
          </Section>

          <Section title="12. Contact us">
            <P>
              Questions or requests about privacy? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-orange-600 underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </P>
          </Section>
        </article>
      </main>
    </div>
  );
}
