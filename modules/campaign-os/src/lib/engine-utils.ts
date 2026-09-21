// Experiments, attribution, metrics normalization, search, rate limits, queue.
import { CampaignStore } from "../store";
import { Experiment, ID } from "../types";

export function evaluateExperiment(
  store: CampaignStore,
  exp: Experiment,
  minSamples = 10,
): Experiment {
  const metrics = store.data.metrics.filter(
    (m) =>
      m.metadata.experiment_id === exp.id &&
      m.metric_type === exp.success_metric,
  );
  const control = metrics
    .filter((m) => m.metadata.arm === "control")
    .reduce((s, m) => s + m.metric_value, 0);
  const variant = metrics
    .filter((m) => m.metadata.arm === "variant")
    .reduce((s, m) => s + m.metric_value, 0);
  const n = metrics.length;
  if (n < minSamples)
    return store.updateExperiment(exp.id, {
      status: "running",
      result: "insufficient_data",
    });
  const result =
    variant > control
      ? "variant"
      : control > variant
        ? "control"
        : "inconclusive";
  return store.updateExperiment(exp.id, {
    status: "completed",
    result,
    end_at: new Date().toISOString(),
  });
}

export function attributionChain(
  store: CampaignStore,
  publicationId: ID,
): Record<string, unknown> {
  const pub = store.data.publications.find((p) => p.id === publicationId);
  if (!pub) return { error: "publication not found" };
  const asset = store.data.assets.find((a) => a.id === pub.asset_id);
  const campaign =
    asset && store.data.campaigns.find((c) => c.id === asset.campaign_id);
  const source =
    asset?.source_content_id &&
    store.data.sourceContent.find((s) => s.id === asset.source_content_id);
  const metrics = store.data.metrics.filter(
    (m) => m.publication_id === publicationId,
  );
  return {
    source,
    campaign,
    asset,
    publication: pub,
    metrics,
    note: "Correlation only — causal attribution is labeled where proven via experiments.",
  };
}

export function normalizeMetric(
  metricType: string,
  value: number,
  source: string,
): { metric_type: string; metric_value: number; source: string } {
  return { metric_type: metricType, metric_value: value, source };
}

export function globalSearch(
  store: CampaignStore,
  q: string,
): Record<string, Array<{ id: string; title: string }>> {
  const needle = q.toLowerCase();
  return {
    campaigns: store.data.campaigns
      .filter((c) => (c.name + c.objective).toLowerCase().includes(needle))
      .map((c) => ({ id: c.id, title: c.name })),
    content: store.data.sourceContent
      .filter((s) => (s.title + s.content).toLowerCase().includes(needle))
      .map((s) => ({ id: s.id, title: s.title })),
    assets: store.data.assets
      .filter((a) => (a.title + a.body).toLowerCase().includes(needle))
      .map((a) => ({ id: a.id, title: a.title })),
    learnings: store.data.learnings
      .filter((l) => l.observation.toLowerCase().includes(needle))
      .map((l) => ({ id: l.id, title: l.observation.slice(0, 80) })),
    experiments: store.data.experiments
      .filter((e) => (e.name + e.hypothesis).toLowerCase().includes(needle))
      .map((e) => ({ id: e.id, title: e.name })),
  };
}

// Channel-aware rate limiter (in-memory; n8n provides distributed backoff).
const buckets = new Map<string, { count: number; resetAt: number }>();
export function checkRateLimit(
  channel: string,
  limitPerMin = 10,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(channel);
  if (!b || now >= b.resetAt) {
    buckets.set(channel, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (b.count < limitPerMin) {
    b.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: b.resetAt - now };
}

export interface Job {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  runAt: number;
  attempts: number;
}
const queue: Job[] = [];
export function enqueue(
  kind: string,
  payload: Record<string, unknown>,
  delayMs = 0,
): Job {
  const job = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    kind,
    payload,
    runAt: Date.now() + delayMs,
    attempts: 0,
  };
  queue.push(job);
  return job;
}
export function dequeueReady(): Job[] {
  const now = Date.now();
  const ready = queue.filter((j) => j.runAt <= now);
  for (const j of ready) queue.splice(queue.indexOf(j), 1);
  return ready;
}
