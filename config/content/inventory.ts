/**
 * Content inventory — audit of the 30 existing posts (Sept 2026).
 * Three agency/comparison posts removed 2026-09-18:
 * ai-agency-client-acquisition, ai-agency-pricing-models-2026,
 * ai-agent-vs-traditional-automation.
 *
 * How to use:
 * - `pillar` is the primary knowledge pillar (advisory, not routing).
 * - `class` is the audit verdict. Do not delete without human sign-off.
 * - `intent` is the single primary search intent.
 * - `action` is the next editorial move. Most posts: keep + link.
 *
 * llms.txt flag: the llms.txt post overstates llms.txt as required SEO.
 * Direction: retitle/reframe as evidence-based
 * ("Does llms.txt Actually Help AI Search?"), cite Google docs as primary
 * reference for Google AI Search claims. Update in place, do not fork URL.
 */

import type { ContentClass, PillarId, SearchIntent } from "./pillars";

export type InventoryEntry = {
  slug: string;
  pillar: PillarId;
  class: ContentClass;
  intent: SearchIntent;
  cluster: string;
  action: "keep" | "refresh-title-meta" | "update-claims" | "merge-candidate" | "review";
  note?: string;
};

export const CONTENT_INVENTORY: InventoryEntry[] = [
  { slug: "agentdna-enterprise-ai-agent-infrastructure", pillar: "ai-agents", class: "core-authority", intent: "strategic", cluster: "production-agents", action: "keep" },
  { slug: "ai-agent-workflows", pillar: "ai-agents", class: "supporting", intent: "technical", cluster: "orchestration", action: "keep" },
  { slug: "building-ai-agent-workflows-n8n-langchain", pillar: "ai-automation", class: "supporting", intent: "technical", cluster: "n8n-agents", action: "keep" },
  { slug: "mcp-ai-server-for-highquality-ai", pillar: "mcp", class: "supporting", intent: "technical", cluster: "mcp-build", action: "refresh-title-meta" },
  { slug: "ai-readiness-assessment-checklist", pillar: "enterprise-ai", class: "core-authority", intent: "strategic", cluster: "ai-strategy", action: "keep" },
  { slug: "measuring-ai-agent-roi", pillar: "enterprise-ai", class: "core-authority", intent: "strategic", cluster: "ai-roi", action: "keep" },
  { slug: "leaders-are-builders-time-to-lead", pillar: "enterprise-ai", class: "opinion", intent: "strategic", cluster: "ai-strategy", action: "keep" },
  { slug: "ai-companies", pillar: "enterprise-ai", class: "opinion", intent: "strategic", cluster: "ai-strategy", action: "keep" },
  { slug: "llms-txt-for-ai-agent-discovery-and-optimization", pillar: "ai-engineering", class: "outdated", intent: "informational", cluster: "ai-discovery", action: "update-claims", note: "Reframe as evidence-based: does llms.txt help AI search? Cite Google Search docs." },
  { slug: "private-ai-stack-setup-in-minutes", pillar: "ai-engineering", class: "supporting", intent: "technical", cluster: "ai-infrastructure", action: "keep" },
  { slug: "best-practices-for-local-redis-use-with-local-N8N", pillar: "ai-automation", class: "technology", intent: "technical", cluster: "n8n-infra", action: "keep" },
  { slug: "free-authentication-nextjs-ai-agent-saas-app-quickstart", pillar: "ai-engineering", class: "technology", intent: "technical", cluster: "saas-stack", action: "keep" },
  { slug: "modern-saas-boilerplate-easy-setup-instructions", pillar: "ai-engineering", class: "duplicate", intent: "technical", cluster: "saas-stack", action: "merge-candidate", note: "Overlap with auth quickstart post. Merge candidate." },
  { slug: "aisystem-prompts-hidden-blueprint", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-code-leak-agent-architecture", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-opus-4-7-system-prompt-analysis", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-opus-4-5-system-prompt-analysis-prompt-tips-tricks", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-opus-4-6-system-prompt-analysis-tuning-insights-template", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-sonnet-4-5-system-prompt-analysis", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "claude-sonnet4-5-improve-quality", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "review", note: "Near-duplicate of Sonnet 4.5 analysis. Review for merge." },
  { slug: "gpt5-system-prompt-leak", pillar: "lab", class: "field-note", intent: "news", cluster: "prompt-teardowns", action: "keep" },
  { slug: "grok-4-systep-prompt-analysis-tips-prompting-tricks", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "v0-system-ai-prompt-analysis", pillar: "lab", class: "field-note", intent: "experimental", cluster: "prompt-teardowns", action: "keep" },
  { slug: "100k-ai-prompts-claude-gpt-gemini-expert-system", pillar: "ai-automation", class: "supporting", intent: "commercial", cluster: "prompt-libraries", action: "keep" },
  { slug: "nano-banana-pro-prompt-collection", pillar: "ai-automation", class: "supporting", intent: "commercial", cluster: "prompt-libraries", action: "keep" },
  { slug: "veo3-prompt-playbook-json-prompts-for-brand-alignment", pillar: "ai-automation", class: "supporting", intent: "technical", cluster: "prompt-libraries", action: "keep" },
  { slug: "code-prompt-bytes", pillar: "lab", class: "supporting", intent: "technical", cluster: "snippets", action: "keep" },
  { slug: "activate-top-oauth-providers-inapp", pillar: "ai-engineering", class: "technology", intent: "technical", cluster: "saas-stack", action: "keep" },
  { slug: "best-open-source-ways-to-create-synthetic-audiences", pillar: "ai-automation", class: "supporting", intent: "technical", cluster: "ai-research", action: "keep" },
  { slug: "creative-coding", pillar: "ai-engineering", class: "low-value", intent: "informational", cluster: "misc", action: "review", note: "Off-pillar (p5.js). Keep but exclude from hubs." },
];

/** Cluster → pillar hub mapping. Each cluster names its hub page (future). */
export const CLUSTERS: Record<string, { pillar: PillarId; label: string; hubPath: string }> = {
  "agents-fundamentals": { pillar: "ai-agents", label: "Agent Fundamentals", hubPath: "/blog" },
  "production-agents": { pillar: "ai-agents", label: "Production Agents", hubPath: "/blog" },
  orchestration: { pillar: "ai-agents", label: "Orchestration", hubPath: "/blog" },
  "n8n-agents": { pillar: "ai-automation", label: "n8n Agents", hubPath: "/blog" },
  "n8n-infra": { pillar: "ai-automation", label: "n8n Infrastructure", hubPath: "/blog" },
  "mcp-build": { pillar: "mcp", label: "Building MCP", hubPath: "/blog" },
  "ai-strategy": { pillar: "enterprise-ai", label: "AI Strategy", hubPath: "/blog" },
  "ai-roi": { pillar: "enterprise-ai", label: "AI ROI", hubPath: "/blog" },
  "ai-services": { pillar: "enterprise-ai", label: "AI Services", hubPath: "/blog" },
  "ai-discovery": { pillar: "ai-engineering", label: "AI Discovery", hubPath: "/blog" },
  "ai-infrastructure": { pillar: "ai-engineering", label: "AI Infrastructure", hubPath: "/blog" },
  "saas-stack": { pillar: "ai-engineering", label: "SaaS Stack", hubPath: "/blog" },
  "prompt-teardowns": { pillar: "lab", label: "Prompt Teardowns", hubPath: "/blog" },
  "prompt-libraries": { pillar: "ai-automation", label: "Prompt Libraries", hubPath: "/blog" },
  snippets: { pillar: "lab", label: "Snippets", hubPath: "/blog" },
  "ai-research": { pillar: "ai-automation", label: "AI Research", hubPath: "/blog" },
  misc: { pillar: "ai-engineering", label: "Misc", hubPath: "/blog" },
};

export function getInventory(slug: string): InventoryEntry | undefined {
  return CONTENT_INVENTORY.find((e) => e.slug === slug);
}
