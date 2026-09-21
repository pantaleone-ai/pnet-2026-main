// Campaign Strategist Agent — structured strategy, never vague prose.
import { createAIProvider } from "../ai-provider";
import { loadPrompt } from "../prompts";
import { CampaignStore } from "../store";
import {
  Brand,
  SourceContent,
  CampaignStrategy,
  ChannelType,
} from "../types";
import { ContentAnalysis } from "./content-intelligence";

export interface StrategyInput {
  objective: string;
  audienceIds?: string[];
  channels?: ChannelType[];
  durationDays?: number;
  autonomyLevel?: 1 | 2 | 3 | 4;
}

export async function buildStrategy(
  store: CampaignStore,
  brand: Brand,
  source: SourceContent,
  analysis: ContentAnalysis,
  input: StrategyInput,
  historySummary: string = "",
): Promise<{
  strategy: CampaignStrategy;
  promptVersion: string;
  model: string;
}> {
  const started = Date.now();
  const ai = createAIProvider();
  const prompt = loadPrompt("campaign-strategist");
  const channels = input.channels ?? ["website", "linkedin", "email"];
  const fallback: CampaignStrategy = {
    objective: input.objective,
    audience: analysis.audience.length
      ? analysis.audience
      : (brand.strategy_config.audiences ?? ["customers"]),
    primary_message: analysis.key_ideas[0] ?? source.title,
    supporting_messages: analysis.key_ideas.slice(1, 4),
    cta: `Read more: ${source.source_url}`,
    channels,
    duration_days: input.durationDays ?? 14,
    cadence: defaultCadence(channels, input.durationDays ?? 14),
    experiments: [
      {
        variable: "hook",
        hypothesis:
          "A specific, evidence-led hook outperforms a generic summary",
        success_metric: "clicks",
      },
    ],
    version: 1,
  };
  const sys = `${prompt.body}\nBrand positioning: ${brand.strategy_config.positioning}\nPriorities: ${(brand.strategy_config.priorities ?? []).join("; ")}\nHistorical performance: ${historySummary || "no history yet"}`;
  const user = `Source: ${source.title}\nAnalysis: ${JSON.stringify(analysis).slice(0, 2000)}\nObjective: ${input.objective}\nChannels: ${channels.join(",")}\nDuration: ${input.durationDays ?? 14} days. Return JSON with keys: objective,audience,primary_message,supporting_messages,cta,channels,duration_days,cadence,experiments.`;
  try {
    const s = await ai.generateStructured<CampaignStrategy>({
      prompt: user,
      system: sys,
      maxTokens: 900,
      latencyTier: "reasoning",
    });
    if (!s.objective || !Array.isArray(s.channels))
      throw new Error("invalid strategy");
    s.version = 1;
    store.recordAgentExecution({
      agent: "campaign-strategist",
      task: "plan",
      input_ref: source.id,
      output: s,
      model: ai.name,
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return { strategy: s, promptVersion: prompt.version, model: ai.name };
  } catch {
    store.recordAgentExecution({
      agent: "campaign-strategist",
      task: "plan",
      input_ref: source.id,
      output: fallback,
      model: "deterministic-local",
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return {
      strategy: fallback,
      promptVersion: prompt.version,
      model: "deterministic-local",
    };
  }
}

function defaultCadence(
  channels: ChannelType[],
  days: number,
): Record<string, unknown> {
  const cadence: Record<string, unknown> = {};
  if (channels.includes("website")) cadence.website = { day: 1, count: 1 };
  if (channels.includes("linkedin"))
    cadence.linkedin = { days: [1, 4, 8].filter((d) => d <= days), count: 3 };
  if (channels.includes("email")) cadence.email = { day: 2, count: 1 };
  if (channels.includes("x"))
    cadence.x = { days: [1, 2, 5].filter((d) => d <= days) };
  return cadence;
}
