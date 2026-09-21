// Content Factory + Channel Adaptation agents.
import { createAIProvider } from "../ai-provider";
import { loadPrompt } from "../prompts";
import { CampaignStore } from "../store";
import {
  Brand,
  Campaign,
  CampaignStrategy,
  ChannelType,
  AssetType,
} from "../types";

export interface AssetDraft {
  channel: ChannelType;
  asset_type: AssetType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

const CHANNEL_GUIDE: Record<string, string> = {
  website:
    "SEO-aware, structured with headings, durable, authoritative. Include SEO title + description.",
  linkedin:
    "Professional, insight-driven, concise (under 150 words), discussion-oriented, no hashtags spam.",
  email:
    "Subject + preview text + body + single CTA. Respect unsubscribe state; never fake sends.",
  x: "Concise, conversational, strong opening. Thread support where appropriate.",
  instagram: "Visual-first caption, concise, CTA in bio pattern.",
  facebook: "Conversational, community-oriented, concise.",
  youtube: "Title + description + chapters outline.",
};

export function assetPlanForStrategy(
  strategy: CampaignStrategy,
): Array<{ channel: ChannelType; asset_type: AssetType }> {
  const plan: Array<{ channel: ChannelType; asset_type: AssetType }> = [];
  for (const ch of strategy.channels) {
    if (ch === "website")
      plan.push({ channel: ch, asset_type: "website_article" });
    else if (ch === "linkedin")
      plan.push({ channel: ch, asset_type: "linkedin_post" });
    else if (ch === "email") plan.push({ channel: ch, asset_type: "email" });
    else if (ch === "x") plan.push({ channel: ch, asset_type: "x_post" });
    else plan.push({ channel: ch, asset_type: "social_copy" });
  }
  return plan;
}

export async function generateAsset(
  store: CampaignStore,
  brand: Brand,
  campaign: Campaign,
  strategy: CampaignStrategy,
  channel: ChannelType,
  assetType: AssetType,
  sourceTitle: string,
  sourceExcerpt: string,
): Promise<{ draft: AssetDraft; promptVersion: string; model: string }> {
  const started = Date.now();
  const ai = createAIProvider();
  const prompt = loadPrompt("campaign-content-factory");
  const guide = CHANNEL_GUIDE[channel] ?? "Channel-native, concise.";
  const banned = [
    ...(brand.voice_config.prohibited_terminology ?? []),
    "unlock",
    "revolutionize",
    "game-changing",
    "seamlessly",
    "delve",
    "in today's rapidly changing world",
  ];
  const sys = `${prompt.body}\nChannel: ${channel}. ${guide}\nBrand voice tone: ${brand.voice_config.tone}. Preferred terms: ${(brand.voice_config.preferred_terminology ?? []).join(", ")}. NEVER use: ${banned.join(", ")}. Favor clarity + specificity + brevity.`;
  const user = `Campaign: ${campaign.name}\nObjective: ${strategy.objective}\nCore message: ${strategy.primary_message}\nSupport: ${strategy.supporting_messages.join(" | ")}\nCTA: ${strategy.cta}\nSource: ${sourceTitle}\nExcerpt: ${sourceExcerpt.slice(0, 1200)}\nProduce ${assetType} for ${channel}. Return JSON {title, body, metadata}.`;
  try {
    const out = await ai.generateStructured<{
      title: string;
      body: string;
      metadata: Record<string, unknown>;
    }>({
      prompt: user,
      system: sys,
      maxTokens: 1000,
      latencyTier: "reasoning",
    });
    const draft = {
      channel,
      asset_type: assetType,
      title: String(out.title ?? "").slice(0, 200),
      body: String(out.body ?? ""),
      metadata: out.metadata ?? {},
    };
    store.recordAgentExecution({
      agent: "content-factory",
      task: `generate:${channel}`,
      input_ref: campaign.id,
      output: draft,
      model: ai.name,
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return { draft, promptVersion: prompt.version, model: ai.name };
  } catch {
    const draft = localDraft(
      brand,
      campaign,
      strategy,
      channel,
      assetType,
      sourceTitle,
      sourceExcerpt,
    );
    store.recordAgentExecution({
      agent: "content-factory",
      task: `generate:${channel}`,
      input_ref: campaign.id,
      output: draft,
      model: "deterministic-local",
      prompt_version: prompt.version,
      duration_ms: Date.now() - started,
      status: "ok",
    });
    return {
      draft,
      promptVersion: prompt.version,
      model: "deterministic-local",
    };
  }
}

function localDraft(
  brand: Brand,
  _campaign: Campaign,
  s: CampaignStrategy,
  channel: ChannelType,
  assetType: AssetType,
  title: string,
  excerpt: string,
): AssetDraft {
  const first = excerpt.split(/(?<=[.!?])\s+/)[0] ?? excerpt.slice(0, 160);
  if (channel === "linkedin")
    return {
      channel,
      asset_type: assetType,
      title: title.slice(0, 120),
      body: `${s.primary_message}\n\n${first}\n\n${s.cta}`,
      metadata: { native: true },
    };
  if (channel === "email")
    return {
      channel,
      asset_type: assetType,
      title: `${s.primary_message} — ${brand.name}`,
      body: `Subject: ${s.primary_message}\nPreview: ${first}\n\n${first}\n\n${s.supporting_messages[0] ?? ""}\n\n${s.cta}`,
      metadata: {
        subject: s.primary_message,
        preview_text: first.slice(0, 100),
      },
    };
  if (channel === "x")
    return {
      channel,
      asset_type: assetType,
      title: title.slice(0, 80),
      body: `${s.primary_message}\n\n${s.cta}`.slice(0, 280),
      metadata: { thread: false },
    };
  return {
    channel,
    asset_type: assetType,
    title: `${title} | ${brand.name}`,
    body: `# ${title}\n\n${s.primary_message}\n\n${first}\n\n## Why it matters\n\n${s.supporting_messages.join("\n\n")}\n\n${s.cta}`,
    metadata: {
      seo_title: `${title} | ${brand.name}`,
      seo_description: first.slice(0, 155),
    },
  };
}
