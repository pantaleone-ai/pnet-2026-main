// Content Intelligence Agent — structured JSON output, validated.
import { createAIProvider } from "../ai-provider";
import { loadPrompt } from "../prompts";
import { CampaignStore } from "../store";
import { Brand, SourceContent } from "../types";

export interface ContentAnalysis {
  key_ideas: string[];
  audience: string[];
  topics: string[];
  entities: string[];
  claims: string[];
  ctas: string[];
  commercial_relevance: string;
  campaign_angles: string[];
  classification: string;
  semantic_metadata: Record<string, unknown>;
}

export async function analyzeContent(
  store: CampaignStore,
  brand: Brand,
  source: SourceContent,
): Promise<{
  analysis: ContentAnalysis;
  promptVersion: string;
  model: string;
}> {
  const started = Date.now();
  const ai = createAIProvider();
  const prompt = loadPrompt("campaign-content-intelligence");
  const sys = `${prompt.body}\nBrand: ${brand.name}. ${brand.description}\nVoice tone: ${brand.voice_config.tone}. Avoid: ${(brand.voice_config.prohibited_terminology ?? []).join(", ")}.`;
  const user = `Title: ${source.title}\nURL: ${source.source_url}\nContent:\n${source.content.slice(0, 4000)}`;
  try {
    const analysis = await ai.generateStructured<ContentAnalysis>({
      prompt: user,
      system: sys,
      maxTokens: 900,
      latencyTier: "fast",
    });
    validate(analysis);
    store.recordAgentExecution({
      agent: "content-intelligence",
      task: "analyze",
      input_ref: source.id,
      output: analysis,
      model: ai.name,
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return { analysis, promptVersion: prompt.version, model: ai.name };
  } catch {
    // Deterministic fallback: keyword extraction (never fails the pipeline).
    const words = source.content
      .toLowerCase()
      .split(/[^a-z0-9\s-]/g)
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    const topics = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
    const analysis: ContentAnalysis = {
      key_ideas: [source.title],
      audience: brand.strategy_config.audiences ?? [],
      topics,
      entities: [],
      claims: [],
      ctas: [],
      commercial_relevance: "derived from source content",
      campaign_angles: topics
        .slice(0, 3)
        .map(
          (t) =>
            `What ${t} means for ${brand.strategy_config.audiences?.[0] ?? "customers"}`,
        ),
      classification: source.source_type,
      semantic_metadata: { fallback: true },
    };
    store.recordAgentExecution({
      agent: "content-intelligence",
      task: "analyze",
      input_ref: source.id,
      output: analysis,
      model: "deterministic-local",
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return {
      analysis,
      promptVersion: prompt.version,
      model: "deterministic-local",
    };
  }
}

function validate(a: ContentAnalysis): void {
  if (!a || !Array.isArray(a.key_ideas) || !Array.isArray(a.topics))
    throw new Error("invalid analysis");
}
