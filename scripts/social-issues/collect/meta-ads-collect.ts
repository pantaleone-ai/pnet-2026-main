// Meta Ads performance collector (read-only, paid).
// Run: npx tsx scripts/social-issues/collect/meta-ads-collect.ts [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--level ad|adset|campaign] [--out-prefix data/ads-metrics/2026-11-09-meta-ads] [--dry-run]
// Writes: <out-prefix>.observations.jsonl (social_metric_observations rows, paid) + <out-prefix>.campaigns.jsonl (dim_campaigns rows).
// Auth: META_ADS_ACCESS_TOKEN (preferred, needs ads_read) or fallback META_CAPI_ACCESS_TOKEN in .env.local / Actions secret.
// Accounts: META_ADS_ACCOUNT_IDS="act_123,act_456" (act_ prefix optional).
// Reads only: GET /{act}/insights level={level} time_increment=1 (campaign-day grain).
// Anything unavailable is null with confidence=unavailable:<reason>, never zero.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { graphGet, GRAPH_VERSION } from "../publish/graph";
import { META_ADS_ACCOUNTS } from "./ads-accounts";
import type { AdsCampaignRow, AdsObsRow } from "./ads-common";
import {
  arg,
  defaultWindow,
  makeObs,
  MDV,
  parseAccountList,
  todayStamp,
  writeJsonl,
} from "./ads-common";

const API_VERSION = `graph-${GRAPH_VERSION}`;
const PLATFORM = "meta_ads";
const PROJECT_ID = "paid-social";

function resolveToken(): { token: string; source: string } {
  const dedicated = process.env.META_ADS_ACCESS_TOKEN ?? "";
  if (dedicated) return { token: dedicated, source: "META_ADS_ACCESS_TOKEN" };
  const fallback = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  if (fallback) return { token: fallback, source: "META_CAPI_ACCESS_TOKEN(fallback)" };
  throw new Error("META_ADS_ACCESS_TOKEN absent (fallback META_CAPI_ACCESS_TOKEN also absent)");
}

function resolveAccounts(): string[] {
  const raw = process.env.META_ADS_ACCOUNT_IDS ?? "";
  const list = raw.trim() ? parseAccountList(raw) : [...META_ADS_ACCOUNTS];
  return list.map((a) => (a.startsWith("act_") ? a : `act_${a}`));
}

interface InsightsRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  conversions?: string;
  date_start?: string;
  date_stop?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
}

const METRIC_MAP: Array<{ out: string; src: string; unit: string | null }> = [
  { out: "spend", src: "spend", unit: "currency" },
  { out: "impressions", src: "impressions", unit: "count" },
  { out: "clicks", src: "clicks", unit: "count" },
  { out: "conversions", src: "conversions", unit: "count" },
];

function num(v: string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function collectAccount(
  token: string,
  account: string,
  since: string,
  until: string,
  level: string,
  now: string,
): { observations: AdsObsRow[]; campaigns: AdsCampaignRow[]; errors: string[] } {
  const observations: AdsObsRow[] = [];
  const campaigns: AdsCampaignRow[] = [];
  const errors: string[] = [];
  const accountId = `meta-ads-${account.replace(/^act_/, "")}`;
  const fields = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "spend",
    "impressions",
    "clicks",
    "conversions",
    "actions",
  ].join(",");

  let after: string | undefined;
  let pages = 0;
  do {
    let res: { data?: InsightsRow[]; paging?: { cursors?: { after?: string }; next?: string } };
    try {
      const params: Record<string, string> = {
        fields,
        level,
        time_increment: "1",
        time_range: JSON.stringify({ since, until }),
        limit: "500",
      };
      if (after) params.after = after;
      res = graphGet(token, `${account}/insights`, params);
    } catch (e) {
      errors.push(`meta-ads-insights:${account}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
      break;
    }
    for (const row of res.data ?? []) {
      const day = row.date_start ?? null;
      const periodStart = day ? `${day}T00:00:00Z` : null;
      const periodEnd = row.date_stop ? `${row.date_stop}T23:59:59Z` : null;
      // Entity resolution: ad > adset > campaign, matching requested level.
      const entityId =
        level === "ad" && row.ad_id
          ? `meta-ads:${row.ad_id}`
          : level === "adset" && row.adset_id
            ? `meta-ads:${row.adset_id}`
            : row.campaign_id
              ? `meta-ads:${row.campaign_id}`
              : null;
      if (!entityId) {
        errors.push(`meta-ads-row:${account}:missing entity id, skipped`);
        continue;
      }
      const entityType = level === "ad" && row.ad_id ? "ad" : level === "adset" && row.adset_id ? "adset" : "campaign";
      const campaignId = row.campaign_id ? `meta-ads:${row.campaign_id}` : null;
      if (row.campaign_id && !campaigns.some((c) => c.campaign_id === `meta-ads:${row.campaign_id}`)) {
        campaigns.push({
          campaign_id: `meta-ads:${row.campaign_id}`,
          project_id: PROJECT_ID,
          name: row.campaign_name ?? row.campaign_id,
          objective: null,
          audience: null,
          status: null,
          start_at: null,
          end_at: null,
          autonomy_level: null,
          platform: PLATFORM,
          account_id: accountId,
        });
      }
      const vals: Record<string, number | null> = {
        spend: num(row.spend),
        impressions: num(row.impressions),
        clicks: num(row.clicks),
        conversions: num(row.conversions),
      };
      for (const m of METRIC_MAP) {
        const v = vals[m.src] ?? null;
        observations.push(
          makeObs(
            {
              project_id: PROJECT_ID,
              account_id: accountId,
              platform: PLATFORM,
              entity_type: entityType,
              entity_id: entityId,
              content_id: null,
              campaign_id: campaignId,
              metric_name: m.out,
              source_metric_name: m.src,
              metric_value: v,
              metric_scope: "daily",
              metric_unit: m.unit,
              period_start: periodStart,
              period_end: periodEnd,
              api_version: API_VERSION,
              confidence: v === null ? "unavailable:meta-ads-null" : "ok",
            },
            now,
          ),
        );
      }
    }
    after = res.paging?.cursors?.after;
    pages += 1;
    if (!res.paging?.next) break;
  } while (after && pages < 20);

  // Account-level daily rollup stays query-side; here we record
  // per-entity rows only (append-only, never fabricated).
  return { observations, campaigns, errors };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const { since, until } = (() => {
    const d = defaultWindow(30);
    return { since: arg("--since") ?? d.since, until: arg("--until") ?? todayStamp() };
  })();
  const level = arg("--level") ?? "campaign";
  if (!["campaign", "adset", "ad"].includes(level)) throw new Error(`bad --level ${level}`);
  const outPrefix = arg("--out-prefix") ?? `data/ads-metrics/${todayStamp()}-meta-ads`;
  const accounts = resolveAccounts();
  if (dryRun) {
    console.log(
      `dry-run: would collect Meta Ads level=${level} window ${since}..${until} accounts=[${accounts.join(",") || "<META_ADS_ACCOUNT_IDS empty>"}] -> ${outPrefix}.{observations,campaigns}.jsonl api=${API_VERSION} ${MDV}`,
    );
    return;
  }
  const { token, source } = resolveToken();
  if (!accounts.length) throw new Error("META_ADS_ACCOUNT_IDS empty — set to comma-separated act_ IDs");
  const now = new Date().toISOString();
  const allObs: AdsObsRow[] = [];
  const allCamp: AdsCampaignRow[] = [];
  const allErrors: string[] = [];
  for (const acct of accounts) {
    try {
      const r = collectAccount(token, acct, since, until, level, now);
      allObs.push(...r.observations);
      allCamp.push(...r.campaigns);
      allErrors.push(...r.errors);
      console.log(`account=${acct} obs=${r.observations.length} campaigns=${r.campaigns.length} errors=${r.errors.length} (token:${source})`);
    } catch (e) {
      allErrors.push(`account-fatal:${acct}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    }
  }
  const deduped = [...new Map(allCamp.map((c) => [c.campaign_id, c])).values()];
  writeJsonl(`${outPrefix}.observations.jsonl`, allObs);
  writeJsonl(`${outPrefix}.campaigns.jsonl`, deduped);
  console.log(`wrote ${outPrefix}.observations.jsonl (${allObs.length}) + ${outPrefix}.campaigns.jsonl (${deduped.length}) errors=${allErrors.length}`);
  if (allErrors.length) console.log(allErrors.slice(0, 20).join("\n"));
  if (!allObs.length && !deduped.length) process.exit(1);
}

if (require.main === module) main();
