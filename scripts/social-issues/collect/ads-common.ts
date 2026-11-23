// Shared helpers for paid-ads collectors (Meta Ads + Google Ads -> BigQuery hub).
// Mirrors scripts/social-issues/collect/meta-collect.ts conventions:
// - JSONL outputs match social_metric_observations + dim_campaigns staging schemas.
// - Nulls preserved, never zero-filled. confidence=unavailable:* explains gaps.
// - organic_or_paid is always "paid" here. entity_ids are namespaced
//   (meta-ads:<id>, google-ads:<id>) so paid rows never collide with organic
//   post IDs in the existing MERGE keys.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const MDV = "mdv1-2026-11";

export interface AdsObsRow {
  project_id: string;
  account_id: string;
  platform: string;
  entity_type: "account" | "campaign" | "adset" | "ad";
  entity_id: string;
  content_id: string | null;
  campaign_id: string | null;
  metric_name: string;
  source_metric_name: string;
  metric_value: number | null;
  metric_scope: string;
  metric_unit: string | null;
  period_start: string | null;
  period_end: string | null;
  snapshot_at: string;
  collected_at: string;
  organic_or_paid: "paid";
  api_version: string;
  metric_definition_version: string;
  confidence: string;
}

export interface AdsCampaignRow {
  campaign_id: string;
  project_id: string;
  name: string | null;
  objective: string | null;
  audience: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  autonomy_level: null;
  platform: string;
  account_id: string;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

export function todayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function defaultWindow(daysBack = 30): { since: string; until: string } {
  const until = todayStamp();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  return { since, until };
}

/** BigQuery TIMESTAMP wants +HH:MM; Meta/Google return +HHMM or bare dates. */
export function normTs(v: string | null): string | null {
  if (!v) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00Z`;
  const m = v.match(/([+-])(\d{2})(\d{2})$/);
  if (m) return `${v.slice(0, -5)}${m[1]}${m[2]}:${m[3]}`;
  return v;
}

export function makeObs(
  base: Omit<AdsObsRow, "snapshot_at" | "collected_at" | "metric_definition_version" | "organic_or_paid">,
  now: string,
): AdsObsRow {
  return {
    ...base,
    period_start: normTs(base.period_start),
    period_end: normTs(base.period_end),
    snapshot_at: now,
    collected_at: now,
    organic_or_paid: "paid",
    metric_definition_version: MDV,
  };
}

export function writeJsonl(path: string, rows: unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

export function parseAccountList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
