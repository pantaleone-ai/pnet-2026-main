import { SITE_INFO } from "@/config/seo/site";
import { ECOSYSTEM_GROUPS } from "@/config/ecosystem";
import { getBlogPosts } from "@/features/blog/data/blogSource";

const allPosts = getBlogPosts();

const content = `# pantaleone.net

> Driving Growth With Agentic AI & Automation Solutions.
 
- [Projects](${SITE_INFO.url}/projects.md): Selected projects that show my skills and creativity.
- [Shop](${SITE_INFO.url}/shop.md): AI applications, workflows, services, and digital products.

## Ecosystem

${ECOSYSTEM_GROUPS.map((group) => `### ${group.heading}\n\n${group.links.map((link) => `- [${link.label}](${link.href})`).join("\n")}`).join("\n\n")}

## Blog

${allPosts.map((item) => `- [${item.title}](${SITE_INFO.url}/blog.mdx/${item.slug}): ${item.description}`).join("\n")}
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
