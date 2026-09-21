import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import {
  checkMachineAuth,
  getCampaignStore,
  persistCampaignStore,
} from "@/lib/campaign/store";
import { metricSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await checkRate(request, 60, "write");
  if (limited) return limited;
  if (!checkMachineAuth(request)) {
    return json({ error: "Unauthorized." }, 401);
  }
  try {
    const parsed = metricSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const store = getCampaignStore();
    const body = parsed.data;
    if (!store.data.publications.some((p) => p.id === body.publication_id)) {
      return json({ error: "Unknown publication_id." }, 404);
    }
    const metric = store.addMetric({
      publication_id: body.publication_id,
      metric_type: body.metric_type,
      metric_value: body.metric_value,
      metadata: body.metadata ?? {},
    });
    store.emit("metrics.updated", metric.publication_id, {
      metric_type: metric.metric_type,
    });
    persistCampaignStore();
    return json({ metric }, 201);
  } catch (error) {
    logger.error("Metric ingest failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Failed to record metric." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
