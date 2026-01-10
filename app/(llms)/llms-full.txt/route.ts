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
  const text = await Promise.all(
    allPosts.map(
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

  return `<SYSTEM>This document contains comprehensive information about ${USER.displayName}'s professional profile, portfolio, shop, and blog content. It includes personal details, work experience, projects, achievements, certifications, commercial products, and all published blog posts. This data is formatted for consumption by Large Language Models (LLMs) to provide accurate and up-to-date information about ${USER.displayName}'s background, skills, and expertise as a Frontend Developer and AI product creator.</SYSTEM>

# hiretimsf.com

> A minimal portfolio, blog, and shop to showcase my work as a Frontend Developer and AI product creator.

${aboutText}
${experienceText}
${projectsText}
${shopText}

## Blog

${await getBlogContent()}`;
}

export const dynamic = "force-static";

export async function GET() {
  return new Response(await getContent(), {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
    },
  });
}
