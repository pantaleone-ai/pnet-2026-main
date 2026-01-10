import { SITE_INFO } from "@/config/seo/site";
import { getBlogPosts } from "@/features/blog/data/blogSource";

const allPosts = getBlogPosts();

const content = `# pantaleone.net

> Driving Growth With Agentic AI & Automation Solutions.
 
- [Experience](${SITE_INFO.url}/experience.md): Highlights from my career and key roles I've taken on.
- [Projects](${SITE_INFO.url}/projects.md): Selected projects that show my skills and creativity.
- [Shop](${SITE_INFO.url}/shop.md): AI applications, workflows, services, and digital products.

## Blog

${allPosts.map((item) => `- [${item.title}](${SITE_INFO.url}/blog.mdx/${item.slug}): ${item.description}`).join("\n")}
`;

export const dynamic = "force-static";

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
    },
  });
}
