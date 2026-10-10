import { truncateDescription, truncateTitle } from "@/lib/seo";
import type { HeadType } from "@/types";

/**
 * Page-level metadata registry — one entry per important public route.
 * Titles are FULL absolute titles (already include the brand suffix) and
 * routes render them via `title: { absolute: page.title }` so the root
 * template (`%s | Pantaleone`) never double-appends the brand.
 * Descriptions are written for humans and search snippets, not keywords.
 *
 * Key rule: `page` is the canonical lookup key used by route files.
 * The AI Readiness Guide key is "AI Readiness Guide" (with spaces) —
 * do not rename it to "AIReadinessGuide": the route looks it up by the
 * spaced name and a mismatch silently renders fallback metadata.
 */
const HEAD: HeadType[] = [
  {
    page: "Home",
    title: truncateTitle("AI Automation & Custom Software | Pantaleone"),
    description: truncateDescription(
      "We build AI agents, automate high-value workflows, and develop custom software that reduces manual work for businesses.",
    ),
    slug: "/",
  },
  {
    page: "Services",
    title: truncateTitle("AI Automation Services & Consulting | Pantaleone"),
    description: truncateDescription(
      "Get help identifying, building, and deploying AI workflows, agent systems, and custom software, with clear scope and handoff.",
    ),
    slug: "/services",
  },
  {
    page: "B2B",
    title: truncateTitle("AI Solutions for Business Teams | Pantaleone"),
    description: truncateDescription(
      "Build practical AI workflows, agent systems, and LLM integrations for your team, with implementation, testing, and handoff.",
    ),
    slug: "/b2b",
  },
  {
    page: "About",
    title: truncateTitle("About Matt Pantaleone | Pantaleone"),
    description: truncateDescription(
      "Learn about Matt Pantaleone's work in AI engineering, autonomous agents, LLM integration, and production automation systems.",
    ),
    slug: "/about",
  },
  {
    page: "Experience",
    title: truncateTitle("Professional Experience | Matt Pantaleone"),
    description: truncateDescription(
      "Explore Matt Pantaleone's professional background in technology, AI systems, software development, and automation.",
    ),
    slug: "/experience",
  },
  {
    page: "Education",
    title: truncateTitle("Education & AI Engineering Background | Pantaleone"),
    description: truncateDescription(
      "Explore the computer science education and technical foundations behind Matt Pantaleone's AI engineering work.",
    ),
    slug: "/education",
  },
  {
    page: "Blog",
    title: truncateTitle("AI Engineering & Automation Blog | Pantaleone"),
    description: truncateDescription(
      "Practical notes on AI engineering, LLM implementation, agentic workflows, and building reliable production systems.",
    ),
    slug: "/blog",
  },
  {
    page: "Projects",
    title: truncateTitle("AI Automation & Business Solutions | Pantaleone"),
    description: truncateDescription(
      "Explore practical AI automation, agent, marketing workflow, and custom software solutions Pantaleone can build for your business.",
    ),
    slug: "/projects",
  },
  {
    page: "Apps",
    title: truncateTitle("AI Apps & Software Products | Pantaleone"),
    description: truncateDescription(
      "Explore software built by Pantaleone, including generative art, cocktail discovery, baseball swing analysis, image tools, and AI applications.",
    ),
    slug: "/apps",
  },
  {
    page: "Shop",
    title: truncateTitle("AI Workflows & Digital Products | Pantaleone"),
    description: truncateDescription(
      "Explore available AI workflows, digital products, and services from Pantaleone.",
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
    page: "AI Readiness Guide",
    title: truncateTitle("AI Readiness Guide for Business | Pantaleone"),
    description: truncateDescription(
      "Use an eight-point checklist to assess one workflow's inputs, time cost, and automation potential. Get the guide by email.",
    ),
    slug: "/resources/ai-readiness-guide",
  },
  {
    page: "Contact",
    title: truncateTitle("Contact for AI Engineering | Pantaleone"),
    description: truncateDescription(
      "Discuss AI automation, agent development, integrations, or custom software for your business.",
    ),
    slug: "/contact",
  },
  {
    page: "Privacy",
    title: truncateTitle("Privacy Policy | Pantaleone"),
    description: truncateDescription(
      "Review the privacy practices and data handling policies applicable to Pantaleone.net and its covered services.",
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
    title: truncateTitle("Product & Platform Changelog | Pantaleone"),
    description: truncateDescription(
      "Read product releases, platform updates, and development changes across the Pantaleone ecosystem.",
    ),
    slug: "/changelog",
  },
];

export default HEAD;
