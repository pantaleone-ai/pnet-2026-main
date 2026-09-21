// Application ↔ n8n API contract. n8n interacts ONLY through these
// documented endpoints/events; business logic stays in the application.
// Auth: machine-to-machine via N8N_WEBHOOK_SECRET bearer (n8n) + app session (UI).
import { CampaignStore, globalStore } from "../store";
import {
  promoteContent,
  approveCampaign,
  executePublication,
} from "../engine";
import {
  attributionChain,
  evaluateExperiment,
  globalSearch,
} from "../lib/engine-utils";
import {
  detectOpportunities,
  analyzePerformance,
} from "../agents/optimization";
import { channelStatuses } from "../channels/index";

export type Handler = (req: {
  method: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  store?: CampaignStore;
}) => Promise<{ status: number; body: unknown }>;

function storeFrom(req: { store?: CampaignStore }): CampaignStore {
  return req.store ?? globalStore;
}
export function checkMachineAuth(headers?: Record<string, string>): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode without secret
  const h = headers?.authorization ?? headers?.["x-webhook-secret"] ?? "";
  return h === `Bearer ${secret}` || h === secret;
}

export const routes: Record<string, Handler> = {
  "POST /api/campaigns": async (req) => {
    const s = storeFrom(req);
    const b = req.body ?? {};
    const brand =
      s.data.brands.find((x) => x.id === b.brand_id) ?? s.data.brands[0];
    if (!brand) return { status: 400, body: { error: "no brand; seed first" } };
    const source =
      s.data.sourceContent.find((x) => x.id === b.source_content_id) ??
      s.data.sourceContent[0];
    if (!source) return { status: 400, body: { error: "no source content" } };
    const { campaign, assets } = await promoteContent(s, brand, source, {
      objective: String(b.objective ?? "Awareness"),
      audienceIds: b.audience_ids as string[] | undefined,
      channels: b.channels as never,
      durationDays: b.duration_days as number | undefined,
      autonomyLevel: b.autonomy_level as never,
    });
    return { status: 201, body: { campaign, assets } };
  },
  "GET /api/campaigns/:id": async (req) => {
    const s = storeFrom(req);
    const c = s.getCampaign(req.params!.id!);
    if (!c) return { status: 404, body: { error: "not found" } };
    return {
      status: 200,
      body: {
        campaign: c,
        assets: s.listAssets(c.id),
        metrics: s.metricsForCampaign(c.id),
      },
    };
  },
  "POST /api/campaigns/:id/approve": async (req) => {
    const s = storeFrom(req);
    const c = s.getCampaign(req.params!.id!);
    if (!c) return { status: 404, body: { error: "not found" } };
    const brand = s.getBrand(c.brand_id)!;
    const updated = await approveCampaign(
      s,
      brand,
      c.id,
      String(req.body?.reviewer ?? "ui"),
    );
    return { status: 200, body: { campaign: updated } };
  },
  "POST /api/campaigns/:id/pause": async (req) => {
    const s = storeFrom(req);
    try {
      const c = s.transitionCampaign(req.params!.id!, "paused");
      return { status: 200, body: { campaign: c } };
    } catch (e) {
      return { status: 400, body: { error: (e as Error).message } };
    }
  },
  "POST /api/campaigns/:id/resume": async (req) => {
    const s = storeFrom(req);
    try {
      const c = s.transitionCampaign(req.params!.id!, "active");
      return { status: 200, body: { campaign: c } };
    } catch (e) {
      return { status: 400, body: { error: (e as Error).message } };
    }
  },
  "POST /api/campaigns/:id/optimize": async (req) => {
    const s = storeFrom(req);
    const c = s.getCampaign(req.params!.id!);
    if (!c) return { status: 404, body: { error: "not found" } };
    const brand = s.getBrand(c.brand_id)!;
    const { patterns, learnings } = analyzePerformance(s, brand);
    s.emit("learning.created", c.id, { count: learnings.length });
    return { status: 200, body: { patterns, learnings } };
  },
  "POST /api/publications/:id/execute": async (req) => {
    if (!checkMachineAuth(req.headers))
      return { status: 401, body: { error: "unauthorized" } };
    const s = storeFrom(req);
    const out = await executePublication(
      s,
      req.params!.id!,
      Boolean(req.body?.dry_run),
    );
    return { status: out.status === "published" ? 200 : 502, body: out };
  },
  "POST /api/metrics": async (req) => {
    if (!checkMachineAuth(req.headers))
      return { status: 401, body: { error: "unauthorized" } };
    const s = storeFrom(req);
    const b = req.body ?? {};
    const m = s.addMetric({
      publication_id: String(b.publication_id),
      metric_type: String(b.metric_type),
      metric_value: Number(b.metric_value),
      metadata: (b.metadata as Record<string, unknown>) ?? {},
    });
    s.emit("metrics.updated", m.publication_id, { metric_type: m.metric_type });
    return { status: 201, body: { metric: m } };
  },
  "GET /api/opportunities": async (req) => {
    const s = storeFrom(req);
    return {
      status: 200,
      body: {
        opportunities: s.data.opportunities.filter((o) => o.status === "open"),
      },
    };
  },
  "POST /api/opportunities/detect": async (req) => {
    const s = storeFrom(req);
    const brandId = String(req.body?.brand_id ?? s.data.brands[0]?.id ?? "");
    if (!brandId) return { status: 400, body: { error: "no brand" } };
    return {
      status: 200,
      body: { opportunities: detectOpportunities(s, brandId) },
    };
  },
  "GET /api/channels": async (req) => {
    void storeFrom(req);
    return { status: 200, body: { channels: channelStatuses() } };
  },
  "GET /api/search": async (req) => {
    const s = storeFrom(req);
    return {
      status: 200,
      body: globalSearch(s, String(req.body?.q ?? req.params?.q ?? "")),
    };
  },
  "GET /api/attribution/:publicationId": async (req) => {
    const s = storeFrom(req);
    return {
      status: 200,
      body: attributionChain(s, req.params!.publicationId!),
    };
  },
  "POST /api/experiments/:id/evaluate": async (req) => {
    const s = storeFrom(req);
    const exp = s.data.experiments.find((e) => e.id === req.params!.id!);
    if (!exp) return { status: 404, body: { error: "not found" } };
    return { status: 200, body: { experiment: evaluateExperiment(s, exp) } };
  },
  "POST /api/n8n/events": async (req) => {
    if (!checkMachineAuth(req.headers))
      return { status: 401, body: { error: "unauthorized" } };
    const s = storeFrom(req);
    const b = req.body ?? {};
    const evt = s.emit(
      String(b.type ?? "n8n.event"),
      String(b.entity_id ?? "n8n"),
      (b.payload as Record<string, unknown>) ?? {},
    );
    return { status: 202, body: { event: evt } };
  },
};

export const OPENAPI = {
  openapi: "3.0.0",
  info: { title: "Campaign OS API", version: "1.0.0" },
  paths: Object.fromEntries(
    Object.keys(routes).map((k) => {
      const [method = "", path = ""] = k.split(" ");
      return [
        path.replace(/:(\w+)/g, "{$1}"),
        {
          [method.toLowerCase()]: {
            summary: k,
            security: [{ bearerAuth: [] }],
          },
        },
      ];
    }),
  ),
};
