#!/usr/bin/env tsx
/**
 * AI-readiness diagnostic (static, no network).
 * Checks discovery, content, structured data, metadata, and AI/machine
 * access wiring against repo source. Exit 1 on critical failures.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

type Check = {
  name: string;
  pass: boolean;
  critical: boolean;
  detail?: string;
};
const checks: Check[] = [];
const has = (src: string, re: RegExp) => re.test(src);

const robots = read("app/robots.ts");
checks.push({
  name: "robots allows public + AI crawlers",
  pass: has(robots, /userAgent:\s*"\*"/) && has(robots, /allow:.*"\//s),
  critical: true,
});
checks.push({
  name: "robots does not block rss.xml",
  pass: !has(robots, /disallow:[\s\S]*?"\/rss\.xml"/),
  critical: true,
});
checks.push({
  name: "robots sitemap references existing sitemaps",
  pass:
    has(robots, /\/sitemap\.xml/) && has(robots, /\/products\/sitemap\.xml/),
  critical: true,
});
checks.push({
  name: "robots keeps dynamic /api/ off crawlers",
  pass: has(robots, /"\/api\/"/),
  critical: false,
});

const sitemap = read("app/sitemap.ts");
checks.push({
  name: "sitemap derives shop categories from canonical source",
  pass: has(sitemap, /getCategories\(\)/) && !has(sitemap, /"\/shop\/ai-apps"/),
  critical: false,
});
checks.push({
  name: "sitemap includes privacy + changelog",
  pass: has(sitemap, /\/privacy/) && has(sitemap, /\/changelog/),
  critical: false,
});

const nextConfig = read("next.config.mjs");
checks.push({
  name: "Content-Signal AI policy header present",
  pass: has(nextConfig, /Content-Signal/) && has(nextConfig, /ai-input=yes/),
  critical: false,
});

const llms = read("app/(llms)/llms.txt/route.ts");
checks.push({
  name: "llms.txt lists core hubs + machine-readable resources",
  pass:
    has(llms, /\/services/) &&
    has(llms, /\/blog/) &&
    has(llms, /llms-full\.txt/) &&
    has(llms, /sitemap\.xml/) &&
    has(llms, /rss\.xml/),
  critical: true,
});
checks.push({
  name: "llms-full.txt route exists and is force-static",
  pass:
    existsSync(join(root, "app/(llms)/llms-full.txt/route.ts")) &&
    has(read("app/(llms)/llms-full.txt/route.ts"), /force-static/),
  critical: true,
});
checks.push({
  name: "rss.xml route exists and is force-static",
  pass:
    existsSync(join(root, "app/rss.xml/route.ts")) &&
    has(read("app/rss.xml/route.ts"), /force-static/),
  critical: false,
});

const layout = read("app/layout.tsx");
checks.push({
  name: "layout JSON-LD uses stable @id entity identifiers",
  pass:
    has(layout, /#website/) &&
    has(layout, /#person/) &&
    has(layout, /#organization/),
  critical: false,
});
checks.push({
  name: "layout advertises RSS feed discovery",
  pass: has(layout, /rss\.xml/),
  critical: false,
});

const blogPost = read("app/(app)/(root)/blog/[slug]/page.tsx");
checks.push({
  name: "blog posts emit BlogPosting + BreadcrumbList JSON-LD",
  pass: has(blogPost, /BlogPosting/) && has(blogPost, /BreadcrumbList/),
  critical: false,
});
checks.push({
  name: "blog posts set canonical URLs",
  pass: has(blogPost, /canonical/),
  critical: true,
});

const home = read("app/(app)/(root)/page.tsx");
checks.push({
  name: "homepage sets canonical URL",
  pass: has(home, /canonical/),
  critical: false,
});

const groups: Record<string, Check[]> = {
  Discovery: checks.slice(0, 4),
  Sitemap: checks.slice(4, 6),
  "AI signals": checks.slice(6, 7),
  "Machine access": checks.slice(7, 10),
  "Structured data": checks.slice(10, 13),
  Metadata: checks.slice(13, 15),
};

let critical = 0;
console.log("\nAI READINESS\n");
for (const [group, items] of Object.entries(groups)) {
  const passed = items.filter((c) => c.pass).length;
  const pct = Math.round((passed / items.length) * 100);
  console.log(`${group}: ${pct}% (${passed}/${items.length})`);
  for (const c of items) {
    if (!c.pass) {
      critical += c.critical ? 1 : 0;
      console.log(`  ${c.critical ? "CRITICAL" : "warning"}: ${c.name}`);
    }
  }
}
console.log(`\nCritical issues: ${critical}`);
console.log(
  critical === 0
    ? "AI readiness static checks passed.\n"
    : "Fix critical issues above.\n",
);
process.exit(critical === 0 ? 0 : 1);
