import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/helpers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Public canonical content stays crawlable: HTML pages, sitemaps,
        // RSS, images, llms.txt, and Markdown representations.
        // AI search, AI assistants, and retrieval agents are allowed via "*".
        // This includes Googlebot, Bingbot, OAI-SearchBot (search/retrieval),
        // ClaudeBot, and CCBot. Training use is signaled separately via the
        // Content-Signal response header (search=yes, ai-input=yes,
        // ai-train=no) in next.config.mjs — robots.txt is not the training
        // opt-out layer.
        //
        // Vendor distinctions preserved (do not conflate):
        // - OAI-SearchBot = search/retrieval; GPTBot = training crawler.
        //   Blocking GPTBot does not block OAI-SearchBot and vice versa.
        // - ClaudeBot/CCBot behavior follows Anthropic/Common Crawl docs;
        //   both remain allowed here for search/retrieval.
        // No per-bot disallow is added. robots.txt is not used for
        // canonicalization — canonical URLs handle that.
        allow: [
          "/",
          "/api/feeds/",
          "/api/products/feed",
          "/llms.txt",
          "/llms-full.txt",
          "/agents.md",
          "/sitemap.xml",
          "/rss.xml",
          "/*.md",
          "/blog.mdx/",
        ],
        // Private, internal, and execution-triggering routes stay blocked.
        // /checkout is a dynamic flow with no indexable value. /about,
        // /experience, and /education are disallowed because middleware.ts
        // permanently redirects them to the homepage — they are not
        // indexable content pages. If those redirects are ever removed (a
        // public URL behavior change requiring its own migration plan),
        // remove them from this list.
        disallow: [
          "/api/",
          "/_next/",
          "/_vercel/",
          "/private/",
          "/checkout",
          "/about",
          "/experience",
          "/education",
        ],
      },
    ],
    // Both sitemaps are generated at build time:
    // - /sitemap.xml covers static pages, blog posts, and shop hubs.
    // - /products/sitemap.xml (app/products/sitemap.ts) covers product detail.
    sitemap: [getBaseUrl("/sitemap.xml"), getBaseUrl("/products/sitemap.xml")],
  };
}
