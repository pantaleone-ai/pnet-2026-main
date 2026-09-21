import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { logger } from "@/lib/logger";
import { evaluateExperiment } from "@/modules/campaign-os/src/lib/engine-utils";

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
    const experiment = store.data.experiments.find((e) => e.id === id);
    if (!experiment) return json({ error: "Not found." }, 404);
    const result = evaluateExperiment(store, experiment);
    persistCampaignStore();
    return json({ experiment: result });
  } catch (error) {
    logger.error("Experiment evaluate failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Evaluation failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
