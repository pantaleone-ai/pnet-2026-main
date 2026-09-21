/**
 * Content pillars — pantaleone.net knowledge architecture.
 *
 * Single source of truth for topical authority.
 * Fewer pillars, stronger authority. Do not add a pillar
 * without merging or retiring another.
 *
 * Routing note (do not force taxonomy):
 * - Pillars are CONCEPTUAL. Existing URLs under /blog/[slug] are preserved.
 * - Pillar landing pages are a future layer (e.g. /blog? pillar=ai-agents
 *   or dedicated hub routes). No URL migration in this phase.
 * - Frontmatter `pillar` is optional and advisory until hubs ship.
 */

export const PILLARS = [
  {
    id: "ai-agents",
    label: "AI Agents",
    description:
      "Agent architecture, memory, tools, orchestration, evaluation, production.",
    entryQueries: ["what is an AI agent", "AI agent architecture", "production AI agents"],
  },
  {
    id: "ai-engineering",
    label: "AI Engineering",
    description:
      "RAG, context engineering, structured outputs, routing, evals, reliability.",
    entryQueries: ["RAG vs fine-tuning", "context engineering", "LLM app architecture"],
  },
  {
    id: "mcp",
    label: "MCP",
    description:
      "Model Context Protocol: servers, clients, tools, security, enterprise use.",
    entryQueries: ["what is MCP", "MCP vs APIs", "MCP server security"],
  },
  {
    id: "ai-automation",
    label: "AI Automation",
    description: "n8n workflows, operations, autonomous business processes.",
    entryQueries: ["AI workflow automation", "n8n AI agents", "autonomous workflows"],
  },
  {
    id: "enterprise-ai",
    label: "Enterprise AI",
    description: "Strategy, operating models, governance, ROI, adoption.",
    entryQueries: ["enterprise AI strategy", "AI ROI", "AI governance"],
  },
  {
    id: "lab",
    label: "Lab",
    description:
      "Field notes: experiments, benchmarks, teardowns, production lessons. Evidence over opinion.",
    entryQueries: ["system prompt analysis", "agent benchmark", "implementation notes"],
  },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];

export const PILLAR_IDS = PILLARS.map((p) => p.id) as PillarId[];

/** Small deliberate taxonomy. Tags outside this list need justification. */
export const CONTROLLED_TAGS = [
  "AI Agents",
  "AI Engineering",
  "MCP",
  "AI Automation",
  "Enterprise AI",
  "Lab Notes",
  "n8n",
  "RAG",
  "System Prompts",
  "AI Strategy",
] as const;

/** Search-intent classification. One primary intent per post. */
export const SEARCH_INTENTS = [
  "informational",
  "technical",
  "comparison",
  "commercial",
  "strategic",
  "experimental",
  "news",
  "navigational",
] as const;

export type SearchIntent = (typeof SEARCH_INTENTS)[number];

/** Editorial lifecycle. Defaults to published for existing posts. */
export const CONTENT_STATUSES = [
  "draft",
  "published",
  "evergreen",
  "experimental",
  "needs-review",
  "needs-update",
  "archived",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Content value classification (audit outcome per post). */
export const CONTENT_CLASSES = [
  "core-authority",
  "supporting",
  "field-note",
  "technology",
  "opinion",
  "outdated",
  "duplicate",
  "low-value",
] as const;

export type ContentClass = (typeof CONTENT_CLASSES)[number];
