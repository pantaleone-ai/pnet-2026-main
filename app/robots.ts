import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/helpers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/private/",
          "/about",
          "/experience",
          "/education",
          "/rss.xml",
          "/robots.txt",
          "/privacy",
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
