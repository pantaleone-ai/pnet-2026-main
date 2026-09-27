/**
 * Single source of truth for AI-discovery entities.
 * Used to generate llms.txt, llms-full.txt, Markdown representations,
 * JSON-LD, sitemap priorities, and validation.
 *
 * Canonical content remains the HTML pages; this file only centralizes
 * titles, descriptions, URLs, and curation so machine surfaces stay in sync.
 */

export const CANONICAL_ORIGIN = "https://pantaleone.net";

export const ENTITY = {
  org: {
    name: "Pantaleone Digital Services LLC",
    brand: "Pantaleone",
    url: CANONICAL_ORIGIN,
    description:
      "We build AI systems that eliminate expensive manual work: AI agents, workflow automation, AI integration, and custom AI software.",
    logo: `${CANONICAL_ORIGIN}/logo.png`,
    areaServed: ["United States", "Canada", "Europe"],
  },
  person: {
    name: "Matt Pantaleone",
    jobTitle: "Founder & Lead Developer",
    url: CANONICAL_ORIGIN,
  },
} as const;

export type CorePage = {
  path: string;
  label: string;
  why: string;
};

export const CORE_PAGES: CorePage[] = [
  {
    path: "/",
    label: "Homepage",
    why: "What Pantaleone is and who it serves; start here for company facts.",
  },
  {
    path: "/services",
    label: "Services and pricing",
    why: "Canonical pricing and engagement model: $2,500 workflow audit, $8,500/mo build, custom retainer; how engagements work.",
  },
  {
    path: "/b2b",
    label: "B2B AI work for teams",
    why: "Team outcomes, measurement approach, and service breakdown for B2B buyers.",
  },
  {
    path: "/contact",
    label: "Contact",
    why: "How to start an engagement; replies within two business days.",
  },
  {
    path: "/resources/ai-readiness-guide",
    label: "AI Readiness Guide",
    why: "Authoritative resource on preparing sites and processes for AI agents.",
  },
];

export const SERVICES: CorePage[] = [
  {
    path: "/services",
    label: "Workflow audit ($2,500 one-time)",
    why: "Two-week audit of one process with ranked build list; canonical pricing source.",
  },
  {
    path: "/services",
    label: "Agent and automation builds ($8,500/mo)",
    why: "N8N or LangChain builds wired to CRM/helpdesk/warehouse with logging and kill switch.",
  },
  {
    path: "/b2b",
    label: "B2B integration and handoff",
    why: "Integration with existing stack, team working sessions, repo plus runbook handoff.",
  },
  {
    path: "/resources/ai-readiness-guide",
    label: "AI readiness assessment",
    why: "Checklist for determining whether a workflow is ready to automate.",
  },
];

/**
 * Curated authority articles for llms.txt.
 * Selected for originality, first-hand expertise, service relevance,
 * longevity, and citation potential. Excludes duplicates, outdated
 * llms.txt claims post, off-pillar, and thin prompt-teardown news items.
 */
export type AuthorityPost = { slug: string; why: string };

export const AUTHORITY_POSTS: AuthorityPost[] = [
  {
    slug: "agentdna-enterprise-ai-agent-infrastructure",
    why: "Core Pantaleone framework for production AI agents; answers what AgentDNA is.",
  },
  {
    slug: "ai-readiness-assessment-checklist",
    why: "Strategic checklist for enterprise AI readiness; maps to audit service.",
  },
  {
    slug: "measuring-ai-agent-roi",
    why: "How agent ROI is measured; supports pricing and B2B measurement claims.",
  },
  {
    slug: "ai-agent-workflows",
    why: "Technical overview of agent workflow patterns used in builds.",
  },
  {
    slug: "building-ai-agent-workflows-n8n-langchain",
    why: "Practical n8n plus LangChain implementation guide matching the build stack.",
  },
  {
    slug: "mcp-ai-server-for-highquality-ai",
    why: "Building MCP servers for high-quality AI tool use.",
  },
  {
    slug: "private-ai-stack-setup-in-minutes",
    why: "Private AI stack setup; infrastructure approach behind client builds.",
  },
  {
    slug: "best-practices-for-local-redis-use-with-local-N8N",
    why: "n8n infrastructure detail: local Redis usage and reliability.",
  },
  {
    slug: "free-authentication-nextjs-ai-agent-saas-app-quickstart",
    why: "Next.js AI SaaS starter with auth; base for custom AI software offers.",
  },
  {
    slug: "activate-top-oauth-providers-inapp",
    why: "OAuth provider integration for shipped AI apps.",
  },
];

export const MARKDOWN_ROUTES = [
  "/index.md",
  "/services.md",
  "/b2b.md",
  "/contact.md",
  "/projects.md",
  "/shop.md",
] as const;

export function abs(path: string): string {
  if (path.startsWith("http")) return path;
  return `${CANONICAL_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
