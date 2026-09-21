import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { reviewerSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";
import { approveCampaign } from "@/modules/campaign-os/src/engine";

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
    const parsed = reviewerSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const updated = await approveCampaign(
      store,
      brand,
      id,
      parsed.data.reviewer ?? "ui",
    );
    persistCampaignStore();
    return json({ campaign: updated });
  } catch (error) {
    logger.error("Campaign approve failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Failed to approve campaign." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
