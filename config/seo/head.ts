import { truncateDescription, truncateTitle } from "@/lib/seo";
import type { HeadType } from "@/types";

/**
 * Page-level metadata registry — one entry per important public route.
 * Titles describe the actual intent of the page; descriptions are written
 * for humans and search snippets, not keyword lists.
 */
const HEAD: HeadType[] = [
  {
    page: "Home",
    title: truncateTitle(
      "Pantaleone | AI Agents, Automation & Custom AI Software",
    ),
    description: truncateDescription(
      "We build AI systems that eliminate expensive manual work: AI agents, workflow automation, AI integration, and custom AI software.",
    ),
    slug: "/",
  },
  {
    page: "Services",
    title: truncateTitle(
      "Services & Pricing | AI Workflow Audit and Builds",
    ),
    description: truncateDescription(
      "Fixed-price workflow audit, monthly build engagement, and retainer. N8N, LangChain, and Next.js with repo and runbook handoff.",
    ),
    slug: "/services",
  },
  {
    page: "B2B",
    title: truncateTitle("AI Work for Teams | Pantaleone"),
    description: truncateDescription(
      "N8N workflows, LangChain pipelines, and LLM integrations for teams. Audit, build, and handoff with measured outcomes.",
    ),
    slug: "/b2b",
  },
  {
    page: "About",
    title: truncateTitle(
      "About Matt Pantaleone | AI Engineering & Automation",
    ),
    description: truncateDescription(
      "Matt Pantaleone builds autonomous agents, LLM integrations, and production automation systems for startups and enterprises.",
    ),
    slug: "/about",
  },
  {
    page: "Experience",
    title: truncateTitle("Experience | AI Engineering & Automation Work"),
    description: truncateDescription(
      "Professional history in AI systems, automation engineering, LLM integration, and full-stack development.",
    ),
    slug: "/experience",
  },
  {
    page: "Education",
    title: truncateTitle("Education | Computer Science & AI Engineering"),
    description: truncateDescription(
      "Computer science background with hands-on specialization in AI systems, LLM deployment, and production automation.",
    ),
    slug: "/education",
  },
  {
    page: "Blog",
    title: truncateTitle("Blog | AI Workflows & Automation Notes"),
    description: truncateDescription(
      "Writing on LLM implementation, agentic workflows, and building production AI systems.",
    ),
    slug: "/blog",
  },
  {
    page: "Projects",
    title: truncateTitle("Projects | AI Platforms & Automation Tools"),
    description: truncateDescription(
      "AI tools and platforms built for production: autonomous agents, LLM pipelines, and full-stack applications.",
    ),
    slug: "/projects",
  },
  {
    page: "Apps",
    title: truncateTitle("Apps | Pantaleone Portfolio Products"),
    description: truncateDescription(
      "Live Pantaleone products: generative art, drink recipes, swing analysis, image tools, 3D prints, and AI platforms.",
    ),
    slug: "/apps",
  },
  {
    page: "Shop",
    title: truncateTitle("Shop | AI Workflows, Apps & Services"),
    description: truncateDescription(
      "N8N workflows, AI applications, and consulting services for teams building automation systems.",
    ),
    slug: "/shop",
  },
  {
    page: "ShopAiApps",
    title: truncateTitle("AI Apps | Ready-to-Run Software"),
    description: truncateDescription(
      "Production-ready AI apps and starters: Next.js kits, image tools, and utilities your team can deploy today.",
    ),
    slug: "/shop/ai-apps",
  },
  {
    page: "ShopAiWorkflows",
    title: truncateTitle("AI Workflows | N8N Automation Packs"),
    description: truncateDescription(
      "Downloadable N8N workflow packs and prompt systems for support triage, content ops, and back-office automation.",
    ),
    slug: "/shop/ai-workflows",
  },
  {
    page: "AIReadinessGuide",
    title: truncateTitle(
      "AI Readiness Guide | Prepare Your Team for AI Agents",
    ),
    description: truncateDescription(
      "A practical checklist for preparing your processes, data, and team before automating with AI agents.",
    ),
    slug: "/resources/ai-readiness-guide",
  },
  {
    page: "Contact",
    title: truncateTitle("Contact | AI Engineering & Automation Consulting"),
    description: truncateDescription(
      "Hire Matt Pantaleone for AI engineering, automation strategy, and LLM integration projects.",
    ),
    slug: "/contact",
  },
  {
    page: "Privacy",
    title: truncateTitle("Privacy Policy | Pantaleone Digital Services"),
    description: truncateDescription(
      "Privacy practices and data protection policies for pantaleone.net and its products.",
    ),
    slug: "/privacy",
  },
  // {
  //   page: "Terms",
  //   title: truncateTitle("Terms of Use | Pantaleone Digital Services"),
  //   description: truncateDescription(
  //     "Terms of use for pantaleone.net products and consulting.",
  //   ),
  //   slug: "/terms",
  // },
  {
    page: "Changelog",
    title: truncateTitle("Changelog | Platform Updates & Development"),
    description: truncateDescription(
      "Development history and technical updates for the Pantaleone Digital ecosystem.",
    ),
    slug: "/changelog",
  },
];

export default HEAD;
