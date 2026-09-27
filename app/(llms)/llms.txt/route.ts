import { ECOSYSTEM_GROUPS } from "@/config/ecosystem";
import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProjects } from "@/features/projects/data/projectSource";
import { getCategories } from "@/features/shop/data/shopSource";
import {
  AUTHORITY_POSTS,
  CANONICAL_ORIGIN,
  CORE_PAGES,
} from "@/lib/seo/ai-discovery";

function abs(path: string): string {
  if (path.startsWith("http")) return path;
  return `${CANONICAL_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildContent(): string {
  const allPosts = getBlogPosts();
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const projects = getProjects();
  const categories = getCategories();

  const core = CORE_PAGES.map(
    (p) => `- [${p.label}](${abs(p.path)}): ${p.why}`,
  ).join("\n");

  const services = [
    `- [Workflow audit](${abs("/services")}): Two-week audit of one process for $2,500 one-time; ranked build list. Canonical pricing source.`,
    `- [Agent and automation builds](${abs("/services")}): $8,500/mo N8N or LangChain build with logging, retries, and kill switch.`,
    `- [B2B AI work for teams](${abs("/b2b")}): Integration with CRM, helpdesk, warehouse; team handoff with repo and runbook.`,
    `- [AI integration and custom AI software](${abs("/services")}): Next.js, TypeScript, LangChain, n8n; scoped from the audit.`,
  ].join("\n");

  const proof = projects
    .slice(0, 12)
    .map(
      (p) =>
        `- [${p.title}](${abs("/projects")}): ${(p.description ?? "Pantaleone project with build notes.").trim().slice(0, 160)}`,
    )
    .join("\n");

  const products = categories
    .map(
      (c) =>
        `- [${c}](${abs(`/shop/${c === "Apps" ? "ai-apps" : "ai-workflows"}`)}): Machine-readable ${c} catalog; see also ${abs("/shop.md")}.`,
    )
    .join("\n");

  const authority = AUTHORITY_POSTS.map((a) => {
    const post = bySlug.get(a.slug);
    const title = post?.title ?? a.slug;
    const desc = post?.description ?? a.why;
    return `- [${title}](${abs(`/blog.mdx/${a.slug}`)}): ${desc} ${a.why}`;
  }).join("\n");

  const ecosystem = ECOSYSTEM_GROUPS.map(
    (group) =>
      `### ${group.heading}\n\n${group.links.map((link) => `- [${link.label}](${link.href})`).join("\n")}`,
  ).join("\n\n");

  return `# Pantaleone

> ${"We build AI systems that eliminate expensive manual work: AI agents, workflow automation, AI integration, and custom AI software."}

Pantaleone.net is the business site of Matt Pantaleone (Pantaleone Digital Services LLC): AI agents, workflow automation, AI integration, and custom AI software for B2B teams. Services are fixed-price starting with a $2,500 workflow audit.

## Core

${core}

## Services

${services}

## Proof and Projects

- [Projects hub](${abs("/projects")}): Selected builds showing skills and delivery approach.
${proof}

## Products and Apps

- [Shop](${abs("/shop")}): AI applications, workflows, and digital products.
${products}
- [AI Apps](${abs("/shop/ai-apps")}): Purchasable AI applications.
- [AI Workflows](${abs("/shop/ai-workflows")}): Purchasable n8n and automation workflows.

## Resources

- [AI Readiness Guide](${abs("/resources/ai-readiness-guide")}): Checklist for preparing a process and site for AI agents.
- [Blog](${abs("/blog")}): Practical writing on AI systems, agents, and automation.

## Technical

Selected authority articles (not the full archive; full list via sitemap and RSS):

${authority}

## Ecosystem

External Pantaleone products referenced from the business site:

${ecosystem}

## Optional

- [llms-full.txt](${abs("/llms-full.txt")}): Consolidated company, services, projects, and selected articles.
- [Sitemap](${abs("/sitemap.xml")}): Canonical URL discovery.
- [RSS feed](${abs("/rss.xml")}): Freshness discovery for posts and products.
- [Projects (markdown)](${abs("/projects.md")}): Machine-readable project list.
- [Shop (markdown)](${abs("/shop.md")}): Machine-readable product list.
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
