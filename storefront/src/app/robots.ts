import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Transactional and per-visitor surfaces. `/design` is the internal
      // specimen page and should never be indexed either.
      disallow: ["/*/cart", "/*/checkout", "/*/account", "/*/search", "/*/design"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
