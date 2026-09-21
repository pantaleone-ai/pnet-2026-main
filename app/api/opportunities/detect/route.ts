import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { detectSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";
import { detectOpportunitiesDeduped } from "@/lib/campaign/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  try {
    const parsed = detectSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const store = getCampaignStore();
    const brandId = parsed.data.brand_id ?? store.data.brands[0]?.id ?? "";
    if (!brandId) return json({ error: "No brand." }, 400);
    detectOpportunitiesDeduped(store, brandId);
    const opportunities = store.data.opportunities.filter(
      (o) => o.brand_id === brandId && o.status === "open",
    );
    persistCampaignStore();
    return json({ opportunities });
  } catch (error) {
    logger.error("Opportunity detection failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Detection failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
