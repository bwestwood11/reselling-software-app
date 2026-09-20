import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated app routes and API have nothing to index.
      disallow: [
        "/api/",
        "/dashboard",
        "/inventory",
        "/listings",
        "/marketplaces",
        "/settings",
        "/verify-email",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
