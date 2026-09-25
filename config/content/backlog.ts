/**
 * @deprecated FROZEN AS OF 2026-09-25.
 * Do not append new topics here. All content backlog items have been migrated
 * to GitHub Issues labeled `content` (see docs/CONTENT_ENGINE.md section 9).
 * This file remains as a read-only reference for the one-time seed script
 * (`npm run content:seed`). New topics go to Issues.
 *
 * Future editorial backlog. Titles only — DO NOT write these articles now.
 * Score = demand + commercial + expertise + authority + competition +
 *         freshness + original-insight (see docs/CONTENT_ENGINE.md).
 * P0 = critical authority pages. P3 = low priority.
 */

export type BacklogItem = {
  title: string;
  pillar: string;
  priority: "P0" | "P1" | "P2" | "P3";
  intent: string;
  angle: string;
};

export const CONTENT_BACKLOG: BacklogItem[] = [
  // AI Agents — P0 core
  { title: "What Is an AI Agent?", pillar: "ai-agents", priority: "P0", intent: "informational", angle: "Definition + what disqualifies (chatbot vs agent vs workflow)." },
  { title: "How AI Agents Work", pillar: "ai-agents", priority: "P0", intent: "informational", angle: "Loop: perceive, plan, act, observe. One diagram." },
  { title: "AI Agent Architecture", pillar: "ai-agents", priority: "P0", intent: "technical", angle: "How production agents actually work: model, tools, memory, evals." },
  { title: "Production AI Agents", pillar: "ai-agents", priority: "P0", intent: "technical", angle: "Reliability, guardrails, cost, observability from real builds." },
  { title: "AI Agents vs Chatbots", pillar: "ai-agents", priority: "P1", intent: "comparison", angle: "Decision rule for when agency pays off." },
  { title: "AI Agents vs Automation", pillar: "ai-agents", priority: "P1", intent: "comparison", angle: "Prior automation post removed 2026-09-18; write fresh, do not resurrect old URL." },
  { title: "AI Agent Memory", pillar: "ai-agents", priority: "P1", intent: "technical", angle: "Short-term, long-term, external memory." },
  { title: "AI Agent Tools", pillar: "ai-agents", priority: "P1", intent: "technical", angle: "Tool design, calling, failure modes." },
  { title: "AI Agent Orchestration", pillar: "ai-agents", priority: "P1", intent: "technical", angle: "Single vs multi-agent routing patterns." },
  { title: "Multi-Agent Systems", pillar: "ai-agents", priority: "P2", intent: "technical", angle: "When coordination beats one big agent." },
  { title: "AI Agent Evaluation", pillar: "ai-agents", priority: "P1", intent: "technical", angle: "Task success, traces, regression sets." },
  { title: "AI Agent Observability", pillar: "ai-agents", priority: "P2", intent: "technical", angle: "Traces, costs, latencies worth logging." },
  { title: "AI Agent Security", pillar: "ai-agents", priority: "P1", intent: "technical", angle: "Prompt injection, tool permissions, least privilege." },
  { title: "AI Agent Governance", pillar: "ai-agents", priority: "P2", intent: "strategic", angle: "Approvals, audit trails, ownership." },
  // MCP — P0 core
  { title: "What Is MCP?", pillar: "mcp", priority: "P0", intent: "informational", angle: "Standard way for AI to discover and invoke tools." },
  { title: "How MCP Works", pillar: "mcp", priority: "P0", intent: "technical", angle: "Servers, clients, tools, resources, prompts." },
  { title: "MCP vs APIs", pillar: "mcp", priority: "P0", intent: "comparison", angle: "What changes when agents need tools." },
  { title: "MCP Servers", pillar: "mcp", priority: "P1", intent: "technical", angle: "Build/buy/operate decision + patterns." },
  { title: "MCP Security", pillar: "mcp", priority: "P1", intent: "technical", angle: "Auth, scopes, untrusted servers." },
  { title: "MCP for AI Agents", pillar: "mcp", priority: "P1", intent: "technical", angle: "Tool discovery at runtime." },
  { title: "Production MCP Architecture", pillar: "mcp", priority: "P2", intent: "technical", angle: "From existing MCP server post outward." },
  { title: "MCP Clients / Resources / Prompts", pillar: "mcp", priority: "P2", intent: "technical", angle: "Split only if each earns its page." },
  { title: "MCP for Enterprise", pillar: "mcp", priority: "P2", intent: "strategic", angle: "Governance + rollout." },
  // AI Engineering
  { title: "RAG", pillar: "ai-engineering", priority: "P1", intent: "technical", angle: "When retrieval beats bigger context." },
  { title: "RAG vs Fine-Tuning", pillar: "ai-engineering", priority: "P1", intent: "comparison", angle: "When each approach makes sense." },
  { title: "Context Engineering", pillar: "ai-engineering", priority: "P1", intent: "technical", angle: "What actually goes in the window." },
  { title: "Structured Outputs", pillar: "ai-engineering", priority: "P2", intent: "technical", angle: "Schemas as contracts." },
  { title: "Model Routing", pillar: "ai-engineering", priority: "P2", intent: "technical", angle: "Cost/latency/quality trade-offs." },
  { title: "AI Reliability", pillar: "ai-engineering", priority: "P2", intent: "technical", angle: "Retries, idempotency, fallbacks." },
  // AI Automation
  { title: "AI Workflow Automation", pillar: "ai-automation", priority: "P1", intent: "commercial", angle: "n8n-first, ops outcomes." },
  { title: "Autonomous Workflows", pillar: "ai-automation", priority: "P2", intent: "technical", angle: "Human-in-the-loop boundaries." },
  { title: "AI Sales / Marketing / Research Automation", pillar: "ai-automation", priority: "P3", intent: "commercial", angle: "One page each only with proof." },
  // Enterprise AI
  { title: "Enterprise AI Strategy", pillar: "enterprise-ai", priority: "P1", intent: "strategic", angle: "Operating model + sequencing." },
  { title: "AI Transformation", pillar: "enterprise-ai", priority: "P2", intent: "strategic", angle: "Adoption without theater." },
  { title: "AI Governance / Operating Models / ROI", pillar: "enterprise-ai", priority: "P2", intent: "strategic", angle: "Extend existing ROI + readiness posts." },
];

export const BACKLOG_COUNTS = {
  P0: CONTENT_BACKLOG.filter((b) => b.priority === "P0").length,
  P1: CONTENT_BACKLOG.filter((b) => b.priority === "P1").length,
  P2: CONTENT_BACKLOG.filter((b) => b.priority === "P2").length,
  P3: CONTENT_BACKLOG.filter((b) => b.priority === "P3").length,
};
