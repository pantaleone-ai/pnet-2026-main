import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/helpers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
