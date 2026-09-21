import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { logger } from "@/lib/logger";
import { analyzePerformance } from "@/modules/campaign-os/src/agents/optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  try {
    const { id } = await ctx.params;
    const store = getCampaignStore();
    const campaign = store.getCampaign(id);
    if (!campaign) return json({ error: "Not found." }, 404);
    const brand = store.getBrand(campaign.brand_id);
    if (!brand) return json({ error: "Brand not found." }, 400);
    const { patterns, learnings } = analyzePerformance(store, brand);
    store.emit("learning.created", campaign.id, { count: learnings.length });
    persistCampaignStore();
    return json({ patterns, learnings });
  } catch (error) {
    logger.error("Campaign optimize failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Failed to optimize campaign." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
