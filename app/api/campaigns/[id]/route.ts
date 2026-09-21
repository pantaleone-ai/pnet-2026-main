import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore } from "@/lib/campaign/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  const { id } = await ctx.params;
  const store = getCampaignStore();
  const campaign = store.getCampaign(id);
  if (!campaign) return json({ error: "Not found." }, 404);
  const assets = store.listAssets(id);
  const assetIds = new Set(assets.map((a) => a.id));
  return json({
    campaign,
    assets,
    publications: store.data.publications.filter((p) =>
      assetIds.has(p.asset_id),
    ),
    metrics: store.metricsForCampaign(id),
    experiments: store.data.experiments.filter((e) => e.campaign_id === id),
    approvals: store.data.approvals.filter((a) => a.campaign_id === id),
    activity: store.data.auditLogs.filter((l) => l.entity_id === id),
    events: store.data.events.filter((e) => e.entity_id === id),
  });
}

export async function POST() {
  return methodNotAllowed("GET");
}
