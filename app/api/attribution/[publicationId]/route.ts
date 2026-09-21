import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore } from "@/lib/campaign/store";
import { attributionChain } from "@/modules/campaign-os/src/lib/engine-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ publicationId: string }> },
) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  const { publicationId } = await ctx.params;
  return json(attributionChain(getCampaignStore(), publicationId));
}

export async function POST() {
  return methodNotAllowed("GET");
}
