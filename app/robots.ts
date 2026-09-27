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
        // No per-bot disallow is added: public canonical content, llms.txt,
        // sitemap, Markdown endpoints, images, and blog content stay crawlable.
        allow: [
          "/",
          "/api/feeds/",
          "/api/products/feed",
          "/llms.txt",
          "/llms-full.txt",
          "/sitemap.xml",
          "/rss.xml",
          "/*.md",
          "/blog.mdx/",
        ],
        disallow: [
          "/api/",
          "/_next/",
          "/_vercel/",
          "/private/",
          "/about",
          "/experience",
          "/education",
        ],
      },
    ],
    sitemap: [getBaseUrl("/sitemap.xml"), getBaseUrl("/products/sitemap.xml")],
  };
}
