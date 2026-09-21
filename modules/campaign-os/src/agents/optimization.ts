// Optimization + Opportunity agents — evidence-based, auditable.
import { CampaignStore } from "../store";
import { Brand, Learning } from "../types";

export interface Pattern {
  pattern: string;
  evidence: Array<Record<string, unknown>>;
  delta: number;
}

export function analyzePerformance(
  store: CampaignStore,
  brand: Brand,
): { patterns: Pattern[]; learnings: Learning[] } {
  const metrics = store.data.metrics;
  const pubs = store.data.publications;
  const byChannel = new Map<
    string,
    { clicks: number; impressions: number; pubs: number }
  >();
  for (const m of metrics) {
    const pub = pubs.find((p) => p.id === m.publication_id);
    if (!pub) continue;
    const asset = store.data.assets.find((a) => a.id === pub.asset_id);
    const brandMatch = asset
      ? store.data.campaigns.find((c) => c.id === asset.campaign_id)
          ?.brand_id === brand.id
      : false;
    if (!brandMatch) continue;
    const row = byChannel.get(pub.channel) ?? {
      clicks: 0,
      impressions: 0,
      pubs: 0,
    };
    if (m.metric_type === "clicks") row.clicks += m.metric_value;
    if (m.metric_type === "impressions") row.impressions += m.metric_value;
    byChannel.set(pub.channel, row);
  }
  for (const p of pubs) {
    const asset = store.data.assets.find((a) => a.id === p.asset_id);
    if (
      asset &&
      store.data.campaigns.find((c) => c.id === asset.campaign_id)?.brand_id ===
        brand.id
    ) {
      const row = byChannel.get(p.channel) ?? {
        clicks: 0,
        impressions: 0,
        pubs: 0,
      };
      row.pubs += 1;
      byChannel.set(p.channel, row);
    }
  }
  const patterns: Pattern[] = [];
  const learnings: Learning[] = [];
  for (const [channel, row] of byChannel) {
    const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
    patterns.push({
      pattern: `${channel}: ctr=${ctr.toFixed(4)} over ${row.pubs} pubs`,
      evidence: [{ channel, ...row }],
      delta: ctr,
    });
    if (row.pubs >= 2 && ctr > 0.01) {
      learnings.push(
        store.createLearning({
          brand_id: brand.id,
          type: "content_pattern",
          observation: `${channel} content is converting above baseline (CTR ${(ctr * 100).toFixed(2)}%).`,
          evidence: [{ channel, ctr, pubs: row.pubs }],
          confidence: Math.min(0.9, 0.5 + ctr * 10),
          recommended_action: `Increase ${channel} allocation within autonomy bounds; test hook variants.`,
          status: "active",
          expires_at: null,
        }),
      );
    }
  }
  store.audit("optimization-agent", "analyze", "brand", brand.id, {
    patterns: patterns.length,
    learnings: learnings.length,
  });
  return { patterns, learnings };
}

export function detectOpportunities(
  store: CampaignStore,
  brandId: string,
): ReturnType<CampaignStore["createOpportunity"]>[] {
  const out: ReturnType<CampaignStore["createOpportunity"]>[] = [];
  const contents = store.listSourceContent(brandId);
  const campaigned = new Set(
    store.data.assets
      .map((a) => a.source_content_id)
      .filter(Boolean) as string[],
  );
  for (const s of contents) {
    if (!campaigned.has(s.id)) {
      out.push(
        store.createOpportunity({
          brand_id: brandId,
          opportunity_type: "under_promoted_content",
          source: s.source_url,
          reason: `"${s.title}" has no campaign yet.`,
          potential_value: "New campaign from existing content",
          recommended_action: "Create campaign via Promote This",
          status: "open",
        }),
      );
    }
  }
  // Content decay: campaigns active > 30 days with no recent metrics.
  const old = store.data.campaigns.filter(
    (c) =>
      c.brand_id === brandId &&
      c.status === "active" &&
      Date.now() - new Date(c.created_at).getTime() > 30 * 864e5,
  );
  for (const c of old) {
    out.push(
      store.createOpportunity({
        brand_id: brandId,
        opportunity_type: "campaign_gap",
        source: c.id,
        reason: `Campaign "${c.name}" active over 30 days without refresh.`,
        potential_value: "Refresh or close",
        recommended_action:
          "Run optimization review; propose experiment or archive",
        status: "open",
      }),
    );
  }
  if (out.length)
    store.emit("opportunity.detected", brandId, { count: out.length });
  return out;
}
