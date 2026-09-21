// Modular prompt definitions with versioning. Prompts live in
// data/prompts/campaign/ as file-first config (per AGENTS.md taxonomy);
// built-in defaults below serve as L3 fallback + Langfuse sync source.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface PromptDef {
  name: string;
  version: string;
  body: string;
  source: "file" | "builtin";
}

const BUILTINS: Record<string, { version: string; body: string }> = {
  "campaign-content-intelligence": {
    version: "1.0.0",
    body: "Analyze source content. Extract key ideas, audience, topics, entities, claims, CTAs, commercial relevance, campaign angles, classification, semantic metadata. Return structured JSON only.",
  },
  "campaign-strategist": {
    version: "1.0.0",
    body: "Given source content, brand memory, audience, historical performance, current campaigns, experiments, channel availability, objectives: decide objective, audience, positioning, messages, CTA, channels, duration, cadence, formats, sequencing, priority, experiments. Structured JSON only. Never vague prose.",
  },
  "campaign-content-factory": {
    version: "1.0.0",
    body: "Generate channel-native assets from campaign strategy. Each asset must be created for its destination channel — never copy the same text to every channel. Clarity + specificity + brevity. Respect brand voice; avoid generic AI phrasing.",
  },
  "campaign-channel-adapter": {
    version: "1.0.0",
    body: "Adapt a core message to native channel behavior: LinkedIn professional/insight-driven; X concise/conversational; Email subject+preview+body+CTA; Website SEO-aware/structured/durable.",
  },
  "campaign-qa": {
    version: "1.0.0",
    body: "Validate asset: factual consistency, source alignment, brand voice, prohibited/unsupported claims, duplication, AI-style language, hooks, CTA quality, channel fit, length, links, UTM, SEO, disclosures. Return {status,score,issues,suggested_changes} with explicit criteria.",
  },
  "campaign-optimization": {
    version: "1.0.0",
    body: "Analyze historical performance. Identify patterns (topics, formats, hooks, CTAs, channels, timing, fatigue, conversion). Generate evidence-based recommendations and controlled experiments. Never silently rewrite strategy.",
  },
  "campaign-opportunity": {
    version: "1.0.0",
    body: "Inspect new content, historical performance, current campaigns, external signals. Output {opportunity_type,source,reason,potential_value,recommended_action}.",
  },
};

export function loadPrompt(name: string): PromptDef {
  const roots = [
    join(process.cwd(), "data", "prompts", "campaign", `${name}.md`),
    join(
      process.cwd(),
      "..",
      "..",
      "data",
      "prompts",
      "campaign",
      `${name}.md`,
    ),
  ];
  for (const p of roots) {
    try {
      if (existsSync(p)) {
        const body = readFileSync(p, "utf8");
        const m = body.match(/version:\s*([0-9.]+)/);
        return { name, version: m?.[1] ?? "1.0.0", body, source: "file" };
      }
    } catch {
      /* fall through to builtin */
    }
  }
  const b = BUILTINS[name];
  if (!b) throw new Error(`unknown prompt: ${name}`);
  return { name, version: b.version, body: b.body, source: "builtin" };
}

export const PROMPT_NAMES = Object.keys(BUILTINS);
