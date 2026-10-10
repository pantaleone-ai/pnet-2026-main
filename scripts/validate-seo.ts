#!/usr/bin/env tsx
/**
 * Build-time SEO quality gate (static, no network).
 *
 * Validates the guarantees this codebase makes about SEO:
 * - METADATA: every important public route has a unique title/description/
 *   canonical entry, same-origin, no stale pantaleone.ai references.
 * - ENTITY: Person name is the real human name; sameAs holds only
 *   equivalent profiles (no owned product domains).
 * - HEADINGS: every primary indexable page renders exactly one H1.
 * - ROBOTS: valuable public pages are not disallowed; private/API routes are.
 * - SITEMAP: required URLs present, no duplicate product URLs across sitemaps.
 * - STRUCTURED DATA: no fabricated reviews/ratings; no physical shipping
 *   or mail-return claims on digital goods; single og:type per product page.
 * - AI DISCOVERY: Markdown/llms routes exist for every declared route.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { AUTHOR, FAVICONS, HEAD, KEYWORDS, OPEN_GRAPH } from "@/config/seo";
import { ENTITY, MARKDOWN_ROUTES } from "@/lib/seo/ai-discovery";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// --- METADATA -------------------------------------------------------------
if (!HEAD || HEAD.length === 0) err("HEAD configuration is missing or empty");

const REQUIRED_SLUGS = [
  "/",
  "/services",
  "/b2b",
  "/about",
  "/experience",
  "/education",
  "/blog",
  "/projects",
  "/apps",
  "/shop",
  "/shop/ai-apps",
  "/shop/ai-workflows",
  "/contact",
  "/privacy",
  "/changelog",
  "/resources/ai-readiness-guide",
];
for (const slug of REQUIRED_SLUGS) {
  if (!HEAD.some((h) => h.slug === slug)) err(`HEAD missing entry for ${slug}`);
}

const titles = HEAD.map((h) => h.title);
if (new Set(titles).size !== titles.length) {
  err("HEAD contains duplicate titles — every indexable page needs a unique title");
}
const slugs = HEAD.map((h) => h.slug);
if (new Set(slugs).size !== slugs.length) err("HEAD contains duplicate slugs");

for (const h of HEAD) {
  if (!h.title || !h.description) err(`HEAD entry "${h.page}" missing title/description`);
  if (!h.slug.startsWith("/")) err(`HEAD entry "${h.page}" slug not same-origin: ${h.slug}`);
  const blob = `${h.title} ${h.description}`;
  if (/pantaleone\.ai/i.test(blob)) err(`HEAD entry "${h.page}" has stale pantaleone.ai reference`);
}

if (!KEYWORDS || KEYWORDS.length === 0) warn("No keywords defined for SEO");
if (!AUTHOR?.name) err("Author information is missing");
if (!FAVICONS?.icon || FAVICONS.icon.length === 0) warn("No favicons configured");
if (!OPEN_GRAPH) err("OpenGraph configuration is missing");

// --- ENTITY ---------------------------------------------------------------
if (ENTITY.person.name !== "Matt Pantaleone") {
  err(`ENTITY.person.name must be the real human name, got "${ENTITY.person.name}"`);
}
const PRODUCT_DOMAINS = [
  "aiceo.io",
  "aicapturelab.com",
  "imgsquash.com",
  "profitsignals.xyz",
  "mixphd.com",
  "proswing.net",
  "synthetic.pics",
  "rapigent.com",
];
for (const profile of [...ENTITY.person.sameAs, ...ENTITY.org.sameAs]) {
  if (PRODUCT_DOMAINS.some((d) => profile.includes(d))) {
    err(`ENTITY.sameAs must not contain owned product domain: ${profile}`);
  }
}

// Layout must not reintroduce the removed patterns.
const layout = read("app/layout.tsx");
if (/\["Organization", "LocalBusiness"\]/.test(layout)) {
  err("layout still declares Organization+LocalBusiness combo");
}
if (/addressLocality/.test(layout)) {
  err("layout still asserts a specific business locality");
}
if (/ECOSYSTEM_URLS/.test(layout)) {
  err("layout still spreads ecosystem product URLs into sameAs");
}
if (/name: siteConfig\.name/.test(layout)) {
  err("layout still uses the site title string as the Person name");
}

// --- HEADINGS ---------------------------------------------------------------
const H1_PAGES = [
  "app/(app)/(root)/about/page.tsx",
  "app/(app)/(root)/b2b/page.tsx",
  "app/(app)/(root)/blog/page.tsx",
  "app/(app)/(root)/changelog/page.tsx",
  "app/(app)/(root)/contact/page.tsx",
  "app/(app)/(root)/education/page.tsx",
  "app/(app)/(root)/experience/page.tsx",
  "app/(app)/(root)/privacy/page.tsx",
  "app/(app)/(root)/projects/page.tsx",
  "app/(app)/(root)/apps/page.tsx",
  "app/(app)/(root)/resources/ai-readiness-guide/page.tsx",
  "app/(app)/(root)/services/page.tsx",
  "app/(app)/(root)/shop/page.tsx",
  "app/(app)/(root)/shop/[category]/page.tsx",
];
for (const rel of H1_PAGES) {
  const src = read(rel);
  if (!existsSync(join(ROOT, rel))) {
    err(`expected page missing: ${rel}`);
    continue;
  }
  if (!/as="h1"/.test(src)) err(`${rel} has no as="h1" page title`);
  const h1Count = (src.match(/<h1[\s>]/g) ?? []).length;
  const asH1Count = (src.match(/as="h1"/g) ?? []).length;
  if (h1Count + asH1Count !== 1) {
    err(`${rel} must render exactly one H1 (found ${h1Count} <h1> + ${asH1Count} as="h1"})`);
  }
}
// Homepage H1 lives in Hero; section headings must stay h2.
const home = read("app/(app)/(root)/page.tsx");
if (!/(Hero)/.test(home)) warn("homepage does not render Hero (expected H1 source)");
const hero = read("features/home/components/Hero.tsx");
if (!/<h1[\s>]/.test(hero)) err("Hero must render the homepage H1");
// Blog post title component defaults to h1; MDX body `#` headings demote
// to h2 in mdxComponents so each post renders exactly one H1.
const postTitle = read("features/blog/components/BlogPostTitle.tsx");
if (!/as = "h1"/.test(postTitle)) err("BlogPostTitle must default to h1");
const mdx = read("components/mdx/mdxComponents.tsx");
if (!/<Heading as="h2" sizeAs="h1"/.test(mdx)) {
  err("MDX h1 must demote to h2 semantics (sizeAs h1) below the page-level H1");
}

// --- ROBOTS -----------------------------------------------------------------
const robots = read("app/robots.ts");
// /about, /experience, /education 301-redirect to / via middleware.ts, so
// they must stay disallowed AND out of the sitemap. If those redirects are
// ever removed, this gate forces the sitemap/robots update below.
const middleware = read("middleware.ts");
const REDIRECTED_PAGES = ["/about", "/experience", "/education"];
const redirectsExist = REDIRECTED_PAGES.every((p) => middleware.includes(`"${p}"`));
if (!redirectsExist) {
  warn(
    "middleware.ts no longer redirects /about, /experience, /education — " +
      "re-evaluate robots disallow and sitemap inclusion for those pages",
  );
}
for (const p of REDIRECTED_PAGES) {
  const disallowBlock = robots.slice(robots.indexOf("disallow"));
  if (redirectsExist && !disallowBlock.includes(`"${p}"`)) {
    err(`robots.txt must disallow ${p} while it redirects (see middleware.ts)`);
  }
}
for (const p of ["/api/", "/_next/", "/private/", "/checkout"]) {
  if (!robots.includes(p)) err(`robots.txt missing protection for ${p}`);
}
// Dead legacy prefixes (/p, /tag, /nft-art, /product, ...) have no
// equivalent page and must 410 via middleware.ts — a 301 to the homepage
// is a soft-404 that keeps them in Search Console's "Page with redirect"
// report indefinitely. This fails closed if homepage redirects return.
const nextConfig = read("next.config.mjs");
if (/destination:\s*["']\/["']/.test(nextConfig)) {
  err("next.config.mjs must not 301 dead paths to the homepage (soft-404) — use the middleware.ts 410");
}
for (const seg of ["GONE_SEGMENTS", '"p"', '"tag"', '"nft-art"', "410"]) {
  if (!middleware.includes(seg)) {
    err(`middleware.ts missing dead-prefix 410 handling (${seg})`);
  }
}
// A static public/robots.txt would shadow the app/robots.ts route in
// production — the route must remain the single source.
if (existsSync(join(ROOT, "public/robots.txt"))) {
  err("public/robots.txt shadows app/robots.ts — delete it, the route is the single source");
}
// The sitemap, images, RSS, and machine-readable surfaces must be crawlable.
for (const blocked of ["/sitemap.xml", "*.json$", "Googlebot-Image"]) {
  if (robots.includes(`Disallow: ${blocked}`) || robots.includes(`Disallow: ${blocked}\n`)) {
    err(`robots.txt must not block ${blocked}`);
  }
}
if (!robots.includes("/products/sitemap.xml")) {
  err("robots.txt missing product sitemap reference");
}
if (!existsSync(join(ROOT, "app/products/sitemap.ts"))) {
  err("robots references /products/sitemap.xml but app/products/sitemap.ts is missing");
}

// --- SITEMAP ------------------------------------------------------------------
const sitemap = read("app/sitemap.ts");
for (const p of ["/services", "/b2b", "/projects", "/apps", "/shop", "/resources/ai-readiness-guide"]) {
  if (!sitemap.includes(`"${p}"`) && !sitemap.includes(`'${p}'`)) {
    err(`sitemap.ts missing ${p}`);
  }
}
for (const p of REDIRECTED_PAGES) {
  if (sitemap.includes(`"${p}"`) || sitemap.includes(`'${p}'`)) {
    err(`sitemap.ts must not list ${p} while it redirects (see middleware.ts)`);
  }
}
if (/shopProducts/.test(sitemap)) {
  err("sitemap.ts duplicates product URLs already covered by /products/sitemap.xml");
}

// --- STRUCTURED DATA ------------------------------------------------------------
const converter = read("lib/schema/product-converter.ts");
if (/Alex Thompson|ratingValue: 4\.8|reviewCount: 127/.test(converter)) {
  err("product-converter contains fabricated review/rating data");
}
if (!/isDigital/.test(converter)) {
  err("product-converter must branch shipping/returns on isDigital");
}
const client = read("features/shop/components/ProductDetailClient.tsx");
if (!/isDigital/.test(client)) {
  err("ProductDetailClient must branch shipping/returns on isDigital");
}
const productPage = read("app/(app)/(root)/shop/[category]/[slug]/page.tsx");
if (/"og:type": "product"/.test(productPage)) {
  err('product page emits conflicting og:type "product" alongside openGraph website type');
}

// --- AI DISCOVERY -----------------------------------------------------------------
for (const route of MARKDOWN_ROUTES) {
  const base = route.replace(/^\//, "").replace(/\.md$/, ".md");
  const candidate = join(ROOT, "app/(llms)", base, "route.ts");
  if (!existsSync(candidate)) err(`AI discovery route missing: app/(llms)/${base}/route.ts`);
}
for (const rel of ["app/(llms)/llms.txt/route.ts", "app/(llms)/llms-full.txt/route.ts"]) {
  if (!existsSync(join(ROOT, rel))) err(`AI discovery file missing: ${rel}`);
}

// --- REPORT -------------------------------------------------------------------------
const result: ValidationResult = { valid: errors.length === 0, errors, warnings };

console.log("\n🔍 SEO Quality Gate\n");
if (result.warnings.length > 0) {
  console.log("⚠️  Warnings:");
  for (const w of result.warnings) console.log(`   - ${w}`);
  console.log("");
}
if (result.errors.length > 0) {
  console.log("❌ Errors:");
  for (const e of result.errors) console.log(`   - ${e}`);
  console.log("");
  console.log("❌ SEO validation failed!\n");
  process.exit(1);
}
console.log("✅ SEO validation passed!\n");
process.exit(0);
