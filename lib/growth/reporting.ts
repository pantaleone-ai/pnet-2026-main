/**
 * Growth reporting types (pure, extractable).
 *
 * One row per App × Platform × Campaign × Date × Geo. Unconfigured values
 * are `null` with a `missingSource` marker — never fabricated metrics.
 */

export type ReportScope = {
  app: string;
  platform: string;
  campaign: string;
  date: string;
  geo: string;
};

export type ReportMetrics = {
  spend: number | null;
  revenue: number | null;
  signups: number | null;
  activations: number | null;
  cac: number | null;
  ltv: number | null;
  roas: number | null;
  contribution: number | null;
};

export type ReportRow = ReportScope & {
  metrics: ReportMetrics;
  missingSource: string | null;
};

export function emptyRow(scope: ReportScope, missingSource: string): ReportRow {
  return {
    ...scope,
    metrics: {
      spend: null,
      revenue: null,
      signups: null,
      activations: null,
      cac: null,
      ltv: null,
      roas: null,
      contribution: null,
    },
    missingSource,
  };
}

export function deriveRoas(spend: number | null, revenue: number | null): number | null {
  if (spend === null || revenue === null || spend === 0) return null;
  return revenue / spend;
}

export function deriveCac(spend: number | null, activations: number | null): number | null {
  if (spend === null || activations === null || activations === 0) return null;
  return spend / activations;
}

// ── Taxonomy v1 canonical rollup (additive, pure) ─────────────────────
// Reads rows shaped like v_observations_canonical (platform_group,
// metric_family, scope_canonical, funnel_stage). Raw ReportRow shape above
// is unchanged; use this helper for cross-platform rollups.

export type CanonicalScope = "snapshot" | "daily" | "lifetime" | "period";

export interface CanonicalObs {
  platform_group: string;
  metric_family: string;
  scope_canonical: CanonicalScope | string;
  funnel_stage?: string | null;
  metric_value: number | null;
  snapshot_at: string;
}

export function rollupCanonical(rows: CanonicalObs[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (r.metric_value === null || Number.isNaN(r.metric_value)) continue;
    // Lifetime/snapshot restate the same total — take max per group, never sum.
    // Daily sums across days; period rows stay out of daily rollups.
    const key = `${r.platform_group}|${r.metric_family}|${r.scope_canonical}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(r.metric_value);
    groups.set(key, bucket);
  }
  for (const [key, vals] of groups) {
    const scope = key.split("|")[2];
    if (scope === "daily" || scope === "period") {
      out[key] = vals.reduce((a, b) => a + b, 0);
    } else {
      out[key] = Math.max(...vals);
    }
  }
  return out;
}
