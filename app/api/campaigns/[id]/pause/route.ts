import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  const { id } = await ctx.params;
  const store = getCampaignStore();
  try {
    const campaign = store.transitionCampaign(id, "paused");
    persistCampaignStore();
    return json({ campaign });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
