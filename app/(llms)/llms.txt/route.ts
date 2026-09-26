import { SITE_INFO } from "@/config/seo/site";
import { ECOSYSTEM_GROUPS } from "@/config/ecosystem";
import { getBlogPosts } from "@/features/blog/data/blogSource";

const allPosts = getBlogPosts();

const content = `# pantaleone.net

> Driving Growth With Agentic AI & Automation Solutions.

Pantaleone.net is the portfolio and business site of Matt Pantaleone, AI engineer
and automation specialist: AI agents, workflow automation, AI integration, and
custom AI software. Public entities: Services, Projects, Shop products
(AI apps and AI workflows), Blog articles, Experience, and Resources.

## Core Content

- [Services](${SITE_INFO.url}/services): AI agents, automation, and integration services.
- [Projects](${SITE_INFO.url}/projects.md): Selected projects that show my skills and creativity.
- [Shop](${SITE_INFO.url}/shop.md): AI applications, workflows, services, and digital products.
- [Blog](${SITE_INFO.url}/blog): Practical thinking on AI systems, agents, and automation.
- [AI Readiness Guide](${SITE_INFO.url}/resources/ai-readiness-guide): Resource on making sites AI-agent-ready.
- [Contact](${SITE_INFO.url}/contact): Work inquiries and consultation requests.

## Ecosystem

${ECOSYSTEM_GROUPS.map((group) => `### ${group.heading}\n\n${group.links.map((link) => `- [${link.label}](${link.href})`).join("\n")}`).join("\n\n")}

## Blog

${allPosts.map((item) => `- [${item.title}](${SITE_INFO.url}/blog.mdx/${item.slug}): ${item.description}`).join("\n")}

## Machine-Readable Resources

- [llms-full.txt](${SITE_INFO.url}/llms-full.txt): Full machine-readable profile, products, projects, and blog content.
- [Sitemap](${SITE_INFO.url}/sitemap.xml): Canonical URLs for all public pages.
- [RSS feed](${SITE_INFO.url}/rss.xml): Latest blog posts and shop products.
- [Projects (markdown)](${SITE_INFO.url}/projects.md): Machine-readable project list.
- [Shop (markdown)](${SITE_INFO.url}/shop.md): Machine-readable product list.
`;

export const dynamic = "force-static";

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
      // Deploy-time static (Vercel purges CDN on deploy) => 1yr CDN pin.
      // Zero ISR (no revalidate).
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
