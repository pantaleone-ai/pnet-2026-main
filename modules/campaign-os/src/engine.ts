// Campaign Engine — orchestrates the full autonomous loop:
// Promote This → strategy → assets → QA → approval → schedule → publish →
// metrics → learn → experiment. Agents reason; code enforces; n8n executes.
import { CampaignStore } from "./store";
import {
  Brand,
  SourceContent,
  ChannelType,
  Campaign,
  CampaignAsset,
} from "./types";
import { analyzeContent } from "./agents/content-intelligence";
import { buildStrategy } from "./agents/strategist";
import { assetPlanForStrategy, generateAsset } from "./agents/factory";
import { qaAsset } from "./agents/qa";
import { requiresApproval } from "./autonomy";
import { scheduleAssets, idempotencyKey } from "./lib/scheduling";
import { buildUtmUrl, slugify } from "./lib/utm";
import { adapterFor } from "./channels/index";
import { fatigueForTopic } from "./lib/fatigue";

export interface PromoteInput {
  objective: string;
  audienceIds?: string[];
  channels?: ChannelType[];
  durationDays?: number;
  autonomyLevel?: 1 | 2 | 3 | 4;
}

export async function promoteContent(
  store: CampaignStore,
  brand: Brand,
  source: SourceContent,
  input: PromoteInput,
): Promise<{ campaign: Campaign; assets: CampaignAsset[] }> {
  // Deduplication: semantic check against recent assets.
  const fatigue = await fatigueForTopic(store, source.title);
  const campaign = store.createCampaign({
    brand_id: brand.id,
    name: `${source.title} — campaign`,
    objective: input.objective,
    audience_id: input.audienceIds?.[0],
    autonomy_level: input.autonomyLevel ?? brand.autonomy_level ?? 2,
    start_at: new Date().toISOString(),
    end_at: new Date(
      Date.now() + (input.durationDays ?? 14) * 864e5,
    ).toISOString(),
    status: "planning",
  });
  store.emit("campaign.created", campaign.id, {
    source_content_id: source.id,
    fatigue: fatigue.level,
  });
  store.audit("engine", "promote", "campaign", campaign.id, {
    source: source.id,
    ...input,
  });

  const { analysis } = await analyzeContent(store, brand, source);
  store.emit("content.understood", source.id, { topics: analysis.topics });
  const history = store.data.learnings
    .filter((l) => l.brand_id === brand.id && l.status === "active")
    .map((l) => l.observation)
    .join(" | ")
    .slice(0, 800);
  const { strategy } = await buildStrategy(
    store,
    brand,
    source,
    analysis,
    {
      objective: input.objective,
      audienceIds: input.audienceIds,
      channels: input.channels,
      durationDays: input.durationDays,
    },
    history,
  );
  campaign.strategy = strategy;
  store.transitionCampaign(campaign.id, "generating");
  store.emit("campaign.ready", campaign.id, { strategy });

  const plan = assetPlanForStrategy(strategy);
  const assets: CampaignAsset[] = [];
  for (const item of plan) {
    const { draft } = await generateAsset(
      store,
      brand,
      campaign,
      strategy,
      item.channel,
      item.asset_type,
      source.title,
      source.content,
    );
    // UTM: append to CTA links where present; record in metadata.
    const slug = slugify(campaign.name);
    const tracked = draft.body.includes("http")
      ? draft.body
      : `${draft.body}\n\n${buildUtmUrl(source.source_url, item.channel, slug, "asset", brand.strategy_config.utm_strategy)}`;
    const asset = store.createAsset({
      campaign_id: campaign.id,
      channel: item.channel,
      asset_type: item.asset_type,
      title: draft.title,
      body: tracked,
      metadata: { ...draft.metadata, utm_campaign: slug },
      status: "qa",
      source_content_id: source.id,
    });
    store.emit("asset.generated", asset.id, { channel: item.channel });
    const qa = qaAsset(
      store,
      brand,
      campaign.id,
      asset.id,
      item.channel,
      asset.title,
      asset.body,
      strategy.cta,
    );
    if (qa.status === "block") {
      store.updateAsset(asset.id, {
        status: "needs_revision",
        metadata: { ...asset.metadata, qa },
      });
    } else if (qa.status === "revise") {
      store.updateAsset(asset.id, {
        status: "needs_revision",
        metadata: { ...asset.metadata, qa },
      });
    } else {
      store.updateAsset(asset.id, {
        status: "pending_approval",
        metadata: { ...asset.metadata, qa },
      });
      store.emit("asset.qa_passed", asset.id, { score: qa.score });
    }
    assets.push(store.getAsset(asset.id)!);
  }
  store.transitionCampaign(campaign.id, "review");

  if (!requiresApproval(brand, campaign)) {
    await approveCampaign(store, brand, campaign.id, "autonomy-policy");
  } else {
    for (const a of assets)
      store.createApproval({
        campaign_id: campaign.id,
        asset_id: a.id,
        status: "pending",
      });
    store.emit("approval.required", campaign.id, { assets: assets.length });
  }
  return { campaign, assets: assets.map((a) => store.getAsset(a.id)!) };
}

export async function approveCampaign(
  store: CampaignStore,
  brand: Brand,
  campaignId: string,
  reviewer: string,
): Promise<Campaign> {
  const campaign = store.getCampaign(campaignId)!;
  const assets = store.listAssets(campaignId);
  for (const a of assets) {
    if (a.status === "pending_approval" || a.status === "needs_revision") {
      store.updateAsset(a.id, { status: "approved" });
      store.emit("asset.approved", a.id, { reviewer });
    }
    for (const ap of store.data.approvals.filter(
      (x) => x.asset_id === a.id && x.status === "pending",
    ))
      store.updateApproval(ap.id, { status: "approved", reviewer });
  }
  try {
    store.transitionCampaign(campaignId, "approved");
  } catch {
    /* already approved */
  }
  // Schedule deterministically.
  const approved = store
    .listAssets(campaignId)
    .filter((a) => a.status === "approved");
  const scheduled = scheduleAssets(campaign, approved as CampaignAsset[], {
    frequencyLimits: brand.strategy_config.frequency_limits ?? {},
  });
  for (const s of scheduled) {
    store.updateAsset(s.id, {
      status: "scheduled",
      scheduled_at: s.scheduled_at,
    });
    const key = idempotencyKey(campaign.id, s.id, s.channel, s.version);
    store.createPublication({
      asset_id: s.id,
      channel: s.channel,
      status: "queued",
      scheduled_at: s.scheduled_at,
      idempotency_key: key,
    });
    store.emit("publication.scheduled", s.id, { at: s.scheduled_at });
  }
  try {
    store.transitionCampaign(campaignId, "scheduled");
  } catch {
    /* keep state */
  }
  store.audit(reviewer, "approve", "campaign", campaignId, {
    assets: approved.length,
  });
  return store.getCampaign(campaignId)!;
}

// Execute a queued publication via channel adapter (called by API or n8n).
// Idempotent: existing successful publication is reused; retries never duplicate.
export async function executePublication(
  store: CampaignStore,
  publicationId: string,
  dryRun = false,
): Promise<{ status: string; externalId?: string; error?: string }> {
  const pub = store.data.publications.find((p) => p.id === publicationId);
  if (!pub) throw new Error(`publication not found: ${publicationId}`);
  if (pub.status === "published")
    return { status: "published", externalId: pub.external_id };
  const asset = store.getAsset(pub.asset_id)!;
  const adapter = adapterFor(pub.channel);
  const validation = adapter.validate(asset);
  if (!validation.ok) {
    store.updatePublication(pub.id, {
      status: "failed",
      error: validation.errors.join("; "),
      attempt_count: pub.attempt_count + 1,
    });
    store.emit("publication.failed", pub.id, { errors: validation.errors });
    return { status: "failed", error: validation.errors.join("; ") };
  }
  store.updatePublication(pub.id, {
    status: "publishing",
    attempt_count: pub.attempt_count + 1,
  });
  store.emit("publication.started", pub.id, {});
  // Retry with exponential backoff: 3 attempts max.
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await adapter.publish({
        asset,
        idempotencyKey: pub.idempotency_key,
        dryRun,
      });
      if (res.ok) {
        store.updatePublication(pub.id, {
          status: "published",
          external_id: res.externalId,
          published_at: new Date().toISOString(),
        });
        store.updateAsset(asset.id, {
          status: "published",
          published_at: new Date().toISOString(),
        });
        store.emit("publication.succeeded", pub.id, {
          external_id: res.externalId,
        });
        return { status: "published", externalId: res.externalId };
      }
      lastError = res.error ?? "publish failed";
    } catch (e) {
      lastError = (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
  }
  store.updatePublication(pub.id, { status: "failed", error: lastError });
  store.emit("publication.failed", pub.id, { error: lastError });
  return { status: "failed", error: lastError };
}
