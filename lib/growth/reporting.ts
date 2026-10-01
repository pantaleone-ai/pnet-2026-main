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
