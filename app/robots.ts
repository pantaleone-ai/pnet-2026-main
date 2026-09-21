import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/helpers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Allow crawlers on public static feeds, but keep them off the
        // uncached dynamic API functions (/api/search, /api/channels,
        // /api/campaigns, /api/metrics, …) to avoid bot-driven executions.
        allow: ["/", "/api/feeds/", "/api/products/feed"],
        disallow: [
          "/api/",
          "/_next/",
          "/_vercel/",
          "/private/",
          "/about",
          "/experience",
          "/education",
          "/rss.xml",
          "/robots.txt",
          "/changelog",
        ],
      },
    ],
    sitemap: [
      getBaseUrl("/sitemap.xml"),
      getBaseUrl("/products/sitemap.xml"),
    ],
  };
}
