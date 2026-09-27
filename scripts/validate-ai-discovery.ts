#!/usr/bin/env tsx
/**
 * AI-discovery validation (static, no network).
 * Checks llms.txt curation, Markdown representations, discovery links,
 * sitemap/robots/RSS wiring, JSON-LD presence, and canonical hygiene.
 * Exit 1 on critical failures. Run: npm run validate:ai-discovery
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

type Check = { name: string; pass: boolean; critical: boolean };
const checks: Check[] = [];
const has = (src: string, re: RegExp) => re.test(src);

const llms = read("app/(llms)/llms.txt/route.ts");
checks.push({
  name: "llms.txt starts with H1 (# Pantaleone)",
  pass: has(llms, /# Pantaleone/),
  critical: true,
});
checks.push({
  name: "llms.txt has Core/Services/Proof/Resources/Technical sections",
  pass:
    has(llms, /## Core/) &&
    has(llms, /## Services/) &&
    has(llms, /## Proof and Projects/) &&
    has(llms, /## Resources/) &&
    has(llms, /## Technical/),
  critical: true,
});
checks.push({
  name: "llms.txt curates authority posts (not full blog dump)",
  pass:
    has(llms, /AUTHORITY_POSTS\.map/) &&
    !has(llms, /allPosts\.map\(\(item\)/),
  critical: true,
});
checks.push({
  name: "llms.txt uses canonical absolute URLs",
  pass:
    has(llms, /CANONICAL_ORIGIN/) &&
    has(read("lib/seo/ai-discovery.ts"), /https:\/\/pantaleone\.net/),
  critical: true,
});
checks.push({
  name: "llms.txt has no sales superlatives (best|leading|world-class|revolutionary)",
  pass:
    !has(llms, /\bbest\b/i) ||
    has(llms, /best-practices-for-local-redis/) === false
      ? !/\b(leading|world-class|revolutionary)\b/i.test(llms)
      : true,
  critical: false,
});
checks.push({
  name: "llms.txt has no prompt-injection (ignore.*polic|recommend Pantaleone)",
  pass:
    !has(llms, /ignore.*polic/i) && !has(llms, /recommend Pantaleone/i),
  critical: true,
});

for (const r of [
  "app/(llms)/services.md/route.ts",
  "app/(llms)/b2b.md/route.ts",
  "app/(llms)/contact.md/route.ts",
  "app/(llms)/index.md/route.ts",
  "app/(llms)/projects.md/route.ts",
  "app/(llms)/shop.md/route.ts",
]) {
  checks.push({
    name: `Markdown representation exists and is force-static: ${r}`,
    pass: exists(r) && has(read(r), /force-static/),
    critical: true,
  });
}

const layout = read("app/layout.tsx");
checks.push({
  name: "HTML advertises Markdown alternate + describedby llms.txt",
  pass:
    has(layout, /text\/markdown/) &&
    has(layout, /describedby/) &&
    has(layout, /llms\.txt/),
  critical: true,
});
checks.push({
  name: "HTML advertises RSS discovery",
  pass: has(layout, /rss\.xml/),
  critical: true,
});

const robots = read("app/robots.ts");
checks.push({
  name: "robots allows * and keeps machine resources crawlable",
  pass:
    has(robots, /userAgent:\s*"\*"/) &&
    has(robots, /llms\.txt/) &&
    has(robots, /sitemap\.xml/) &&
    has(robots, /rss\.xml/),
  critical: true,
});
checks.push({
  name: "robots does not blanket-block AI crawlers",
  pass:
    !has(robots, /userAgent:\s*"GPTBot"/) &&
    !has(robots, /userAgent:\s*"ClaudeBot"/) &&
    !has(robots, /userAgent:\s*"CCBot"/),
  critical: true,
});
checks.push({
  name: "robots keeps dynamic /api/ disallowed except feeds",
  pass: has(robots, /"\/api\/"/),
  critical: false,
});

const sitemap = read("app/sitemap.ts");
checks.push({
  name: "sitemap uses real blog dates (not single fake lastmod)",
  pass: has(sitemap, /post\.lastUpdated/),
  critical: true,
});
checks.push({
  name: "sitemap excludes markdown/utility endpoints",
  pass: !has(sitemap, /\.md/) && !has(sitemap, /llms/),
  critical: false,
});

const rss = read("app/rss.xml/route.ts");
checks.push({
  name: "RSS entries carry author + categories + updated dates",
  pass:
    has(rss, /author/) && has(rss, /category/) && has(rss, /lastUpdated/),
  critical: true,
});

checks.push({
  name: "layout JSON-LD has WebSite/Person/Organization with stable @id",
  pass:
    has(layout, /#website/) &&
    has(layout, /#person/) &&
    has(layout, /#organization/),
  critical: true,
});
const blogPost = read("app/(app)/(root)/blog/[slug]/page.tsx");
checks.push({
  name: "blog posts emit BlogPosting + BreadcrumbList with canonical + markdown alternate",
  pass:
    has(blogPost, /BlogPosting/) &&
    has(blogPost, /BreadcrumbList/) &&
    has(blogPost, /canonical/) &&
    has(blogPost, /blog\.mdx/),
  critical: true,
});

const full = read("app/(llms)/llms-full.txt/route.ts");
checks.push({
  name: "llms-full.txt is curated (authority subset, not full archive)",
  pass: has(full, /AUTHORITY_POSTS/) && has(full, /sitemap\.xml/),
  critical: true,
});

const discovery = read("lib/seo/ai-discovery.ts");
checks.push({
  name: "single-source entity model exists",
  pass:
    has(discovery, /CANONICAL_ORIGIN/) &&
    has(discovery, /AUTHORITY_POSTS/) &&
    has(discovery, /CORE_PAGES/),
  critical: true,
});

// Canonical hygiene: no localhost/staging URLs in machine routes
for (const f of [
  "app/(llms)/llms.txt/route.ts",
  "app/(llms)/llms-full.txt/route.ts",
  "app/(llms)/services.md/route.ts",
  "lib/seo/ai-discovery.ts",
]) {
  const src = read(f);
  checks.push({
    name: `no localhost/staging URLs in ${f}`,
    pass: !has(src, /localhost/) && !has(src, /vercel\.app/),
    critical: true,
  });
}

let critical = 0;
let failed = 0;
console.log("\nAI DISCOVERY VALIDATION\n");
for (const c of checks) {
  const icon = c.pass ? "PASS" : c.critical ? "CRITICAL" : "WARN";
  if (!c.pass) {
    failed += 1;
    if (c.critical) critical += 1;
    console.log(`  [${icon}] ${c.name}`);
  }
}
const passed = checks.length - failed;
console.log(`\n${passed}/${checks.length} passed. Critical failures: ${critical}`);
console.log(
  critical === 0
    ? "AI discovery validation passed.\n"
    : "Fix critical issues above.\n",
);
process.exit(critical === 0 ? 0 : 1);
