// Content fatigue — structured metadata + semantic similarity, brand-configurable.
import { CampaignStore } from "../store";
import { FatigueLevel } from "../types";
import { cosineSimilarity, createAIProvider } from "../ai-provider";

export interface FatigueConfig {
  recentDays: number;
  similarityThreshold: number;
  maxPerTopicPerWeek: number;
}
export const DEFAULT_FATIGUE: FatigueConfig = {
  recentDays: 30,
  similarityThreshold: 0.82,
  maxPerTopicPerWeek: 3,
};

export async function fatigueForTopic(
  store: CampaignStore,
  topic: string,
  cfg: FatigueConfig = DEFAULT_FATIGUE,
): Promise<{ level: FatigueLevel; similar: number; recent: number }> {
  const ai = createAIProvider();
  const since = Date.now() - cfg.recentDays * 864e5;
  const recent = store.data.assets.filter(
    (a) => new Date(a.created_at).getTime() >= since,
  );
  const vec = await ai.embed(topic);
  let similar = 0;
  for (const a of recent) {
    const v = await ai.embed(`${a.title} ${a.body.slice(0, 300)}`);
    if (cosineSimilarity(vec, v) >= cfg.similarityThreshold) similar += 1;
  }
  const level: FatigueLevel =
    similar >= cfg.maxPerTopicPerWeek
      ? "HIGH"
      : similar >= 2
        ? "MEDIUM"
        : "LOW";
  return { level, similar, recent: recent.length };
}
