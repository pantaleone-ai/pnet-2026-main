import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { promoteSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";
import { promoteContent } from "@/modules/campaign-os/src/engine";

// Transactional campaign API: per-request origin work, never CDN-shared.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  const store = getCampaignStore();
  const campaigns = store.data.campaigns.map((c) => {
    const assets = store.listAssets(c.id);
    const assetIds = new Set(assets.map((a) => a.id));
    return {
      ...c,
      assets: assets.length,
      publications: store.data.publications.filter((p) =>
        assetIds.has(p.asset_id),
      ).length,
      metrics: store.metricsForCampaign(c.id).length,
    };
  });
  return json({ campaigns });
}

export async function POST(request: Request) {
  const limited = await checkRate(request, 20, "write");
  if (limited) return limited;
  try {
    const parsed = promoteSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        {
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        400,
      );
    }
    const body = parsed.data;
    const store = getCampaignStore();
    const brand =
      store.data.brands.find((b) => b.id === body.brand_id) ??
      store.data.brands[0];
    if (!brand) {
      return json(
        { error: "No brand. POST /api/campaigns/ingest first." },
        400,
      );
    }
    const source =
      store.data.sourceContent.find((s) => s.id === body.source_content_id) ??
      store.data.sourceContent[0];
    if (!source) {
      return json(
        { error: "No source content. POST /api/campaigns/ingest first." },
        400,
      );
    }
    const { campaign, assets } = await promoteContent(store, brand, source, {
      objective: body.objective,
      audienceIds: body.audience_ids,
      channels: body.channels,
      durationDays: body.duration_days,
      autonomyLevel: body.autonomy_level,
    });
    persistCampaignStore();
    return json({ campaign, assets }, 201);
  } catch (error) {
    logger.error("Campaign promote failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Failed to create campaign." }, 500);
  }
}

export async function PUT() {
  return methodNotAllowed("GET, POST");
}

export async function DELETE() {
  return methodNotAllowed("GET, POST");
}
