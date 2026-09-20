export const SITE_NAME = "Omventa";

export const SITE_TAGLINE = "Crosslisting Software for Resellers";

export const SITE_DESCRIPTION =
  "Omventa helps resellers manage inventory and crosslist to eBay, Poshmark, Mercari, Depop and more from one dashboard — with AI-written descriptions and photo editing.";

// Public origin of the web app. Set NEXT_PUBLIC_APP_URL per environment.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://omventa.com").replace(
  /\/$/,
  ""
);

// Address shown on the privacy page and used for privacy/data requests.
export const CONTACT_EMAIL = "support@omventa.com";

export const SITE_KEYWORDS = [
  "crosslisting software",
  "crosslister",
  "reselling software",
  "eBay crosslisting",
  "Poshmark crosslisting",
  "Mercari crosslisting",
  "Depop crosslisting",
  "inventory management for resellers",
];
