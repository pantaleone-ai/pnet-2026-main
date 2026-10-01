import { PORTFOLIO_APPS } from "@/config/portfolio";
import { CANONICAL_ORIGIN, ENTITY } from "@/lib/seo/ai-discovery";

function abs(path: string): string {
  if (path.startsWith("http")) return path;
  return `${CANONICAL_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildContent(): string {
  const apps = PORTFOLIO_APPS.map(
    (app) =>
      `- [${app.name}](${app.primaryCTA.href}): ${app.description} Category: ${app.category}. Status: ${app.status}. Primary activation event: \`${app.primaryActivationEvent}\`.`,
  ).join("\n");

  const domains = PORTFOLIO_APPS.map((app) => `- ${app.domain}`).join("\n");

  const socials = [...ENTITY.org.sameAs]
    .map((profile) => `- ${profile}`)
    .join("\n");

  return `# Agents

> Machine-readable portfolio index for AI agents and retrieval systems. Pantaleone.net is the business site of Matt Pantaleone (Pantaleone Digital Services LLC).

This file lists live Pantaleone products, their canonical domains, and social profiles. Each product runs on its own domain with independent data and economics. No shared pixels or audiences across unrelated apps.

## Portfolio apps

${apps}

## Canonical domains

${domains}

- ${CANONICAL_ORIGIN} (control plane)

## Social profiles

${socials}

## Discovery

- [llms.txt](${abs("/llms.txt")}): Company, services, and authority articles.
- [llms-full.txt](${abs("/llms-full.txt")}): Consolidated company, services, projects, and selected articles.
- [Apps (HTML)](${abs("/apps")}): Human-readable portfolio page.
- [Sitemap](${abs("/sitemap.xml")}): Canonical URL discovery.
- [RSS feed](${abs("/rss.xml")}): Freshness discovery for posts and products.
`;
}

export const dynamic = "force-static";

export async function GET() {
  return new Response(buildContent(), {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
