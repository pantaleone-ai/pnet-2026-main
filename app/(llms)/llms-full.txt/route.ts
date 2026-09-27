import dayjs from "dayjs";

import { SITE_INFO } from "@/config/seo/site";
import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getLLMText } from "@/features/blog/lib/get-llm-text";
import { getExperienceItems } from "@/features/experience/data/get-experience-items";
import { getProjects } from "@/features/projects/data/projectSource";
import { getCategories, getProductsByCategory } from "@/features/shop/data/shopSource";
import SOCIAL_LINKS from "@/config/socialLinks";
import { TECH_STACK } from "@/config/techStack";
import { USER } from "@/config/user";
import { AUTHORITY_POSTS, CANONICAL_ORIGIN } from "@/lib/seo/ai-discovery";

const allCategories = getCategories();

const allPosts = getBlogPosts();
const EXPERIENCES = getExperienceItems();
const PROJECTS = getProjects();

const aboutText = `## About

${USER.about.trim()}

### Personal Information

- First Name: ${USER.firstName}
- Last Name: ${USER.lastName}
- Display Name: ${USER.displayName}
- Location: ${USER.address}
- Website: ${USER.website}

### Social Links

${SOCIAL_LINKS.map((item) => `- [${item.label}](${item.href})`).join("\n")}

### Tech Stack

${TECH_STACK.map((item) => `- [${item.title}](${item.href})`).join("\n")}\n`;

const experienceText = `## Experience

${EXPERIENCES.map((item) =>
  item.positions
    .map((position) => {
      const skills = position.skills?.join(", ") || "N/A";
      return `### ${position.title} | ${item.companyName}\n\nDuration: ${position.employmentPeriod}\n\nSkills: ${skills}\n\n${position.description?.trim()}`;
    })
    .join("\n\n"),
).join("\n\n")}
`;

const servicesText = `## Services (canonical pricing source: ${CANONICAL_ORIGIN}/services)

- Workflow audit: $2,500 one-time. Two weeks on one process; time costs per step and ranked build list; 90-minute walkthrough.
- Build engagement: $8,500 per month. N8N or LangChain build against client APIs with retries, logging, kill switch; weekly review; 30-day fix window.
- Retainer: Custom per quarter. Queue of workflows, one active build at a time, shared backlog, runbook per system.
- Engagement: audit first, then build, then handoff (repo, workflow JSON, credentials map, runbook). Contact: ${CANONICAL_ORIGIN}/contact (replies within two business days).
`;

const projectsText = `## Projects

${PROJECTS.map((item) => {
  const skills = item.techStacks?.length
    ? `\n\nSkills: ${item.techStacks.join(", ")}`
    : "";
  const description = item.description ? `\n\n${item.description.trim()}` : "";
  const link =
    item.websiteUrl || item.githubUrl
      ? `\n\nProject URL: ${item.websiteUrl || item.githubUrl}`
      : "";
  return `### ${item.title}${link}${skills}${description}`;
}).join("\n\n")}
`;

async function getBlogContent() {
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const selected = AUTHORITY_POSTS.map((a) => bySlug.get(a.slug)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  const text = await Promise.all(
    selected.map(
      async (item) =>
        `---\ntitle: "${item.title}"\ndescription: "${item.description}"\nlast_updated: "${dayjs(item.lastUpdated || item.created).format("MMMM D, YYYY")}"\nsource: "${SITE_INFO.url}/blog.mdx/${item.slug}"\n---\n\n${await getLLMText(item)}`,
    ),
  );
  return text.join("\n\n");
}

async function getContent() {
  const shopText = `## Shop

${allCategories.map((category) => {
  const products = getProductsByCategory(category);

  return `### ${category}

${products.map((product) => {
  const techStack = product.techStacks?.length
    ? `\n\nTechnology Stack: ${product.techStacks.join(", ")}`
    : "";
  const price = product.price ? `\n\nPrice: $${product.price} ${product.currency || 'USD'}` : "";
  const description = product.description ? `\n\n${product.description.trim()}` : "";

  return `#### ${product.title}${price}${techStack}${description}`;
}).join("\n\n")}
`;
}).join("\n\n")}
`;

  return `<SYSTEM>This document contains curated company, services, project, product, and selected authority-article content from pantaleone.net, formatted for LLMs. Pricing is canonical at ${CANONICAL_ORIGIN}/services. For the full article archive use the sitemap at ${CANONICAL_ORIGIN}/sitemap.xml and per-article Markdown at ${CANONICAL_ORIGIN}/blog.mdx/[slug].</SYSTEM>

# pantaleone.net

> Matt Pantaleone builds AI agents, n8n workflows, and Next.js applications that eliminate expensive manual work.

${aboutText}
${experienceText}
${servicesText}
${projectsText}
${shopText}

## Selected authority articles (full archive excluded to keep this file cacheable; see sitemap and /blog.mdx/[slug])

${await getBlogContent()}`;
}

export const dynamic = "force-static";

export async function GET() {
  return new Response(await getContent(), {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
