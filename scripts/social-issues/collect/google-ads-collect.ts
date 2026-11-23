// Google Ads performance collector (read-only, paid).
// Run: npx tsx scripts/social-issues/collect/google-ads-collect.ts [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--out-prefix data/ads-metrics/2026-11-09-google-ads] [--dry-run]
// Writes: <out-prefix>.observations.jsonl (social_metric_observations rows, paid) + <out-prefix>.campaigns.jsonl (dim_campaigns rows).
// Auth: GOOGLE_ADS_ACCESS_TOKEN (OAuth Bearer) + GOOGLE_ADS_DEVELOPER_TOKEN in .env.local / Actions secrets.
// Accounts: GOOGLE_ADS_CUSTOMER_IDS="1234567890,0987654321" (dashes stripped). Optional GOOGLE_ADS_LOGIN_CUSTOMER_ID for MCC.
// Reads only: POST /v26/customers/{id}/googleAds:search with GAQL campaign-segmented daily metrics.
// Anything unavailable is null with confidence=unavailable:<reason>, never zero.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import type { AdsCampaignRow, AdsObsRow } from "./ads-common";
import { GOOGLE_ADS_CUSTOMERS } from "./ads-accounts";
import {
  arg,
  defaultWindow,
  makeObs,
  parseAccountList,
  todayStamp,
  writeJsonl,
} from "./ads-common";

const API_VERSION = "google-ads-v26";
const PLATFORM = "google_ads";
const PROJECT_ID = "paid-search";

function required(name: string): string {
  const v = process.env[name] ?? "";
  if (!v) throw new Error(`${name} absent`);
  return v;
}

function resolveAccounts(): string[] {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_IDS ?? "";
  const list = raw.trim() ? parseAccountList(raw) : [...GOOGLE_ADS_CUSTOMERS];
  return list.map((s) => s.replace(/-/g, ""));
}

function gaqlSearch(customerId: string, query: string): { results?: GaqlRow[]; nextPageToken?: string } {
  const token = required("GOOGLE_ADS_ACCESS_TOKEN");
  const devToken = required("GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/-/g, "");
  const args = [
    "-sS",
    "-m",
    "60",
    "-X",
    "POST",
    `https://googleads.googleapis.com/v26/customers/${customerId}/googleAds:search`,
    "-H",
    `Authorization: Bearer ${token}`,
    "-H",
    `developer-token: ${devToken}`,
    "-H",
    "Content-Type: application/json",
  ];
  if (loginId) args.push("-H", `login-customer-id: ${loginId}`);
  args.push("--data", JSON.stringify({ query }));
  const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out) as { results?: GaqlRow[]; nextPageToken?: string };
}

interface GaqlRow {
  campaign?: { id?: string; name?: string; status?: string };
  segments?: { date?: string };
  metrics?: { cost_micros?: string | number; impressions?: string | number; clicks?: string | number; conversions?: string | number };
}

const COST_DIVISOR = 1_000_000;

function toNum(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function collectCustomer(
  customerId: string,
  since: string,
  until: string,
  now: string,
): { observations: AdsObsRow[]; campaigns: AdsCampaignRow[]; errors: string[] } {
  const observations: AdsObsRow[] = [];
  const campaigns: AdsCampaignRow[] = [];
  const errors: string[] = [];
  const accountId = `google-ads-${customerId}`;
  const query = [
    "SELECT campaign.id, campaign.name, campaign.status, segments.date,",
    "metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions",
    "FROM campaign",
    `WHERE segments.date BETWEEN '${since}' AND '${until}'`,
    "ORDER BY segments.date",
    "LIMIT 10000",
  ].join(" ");
  let res: { results?: GaqlRow[] };
  try {
    res = gaqlSearch(customerId, query);
  } catch (e) {
    errors.push(`google-ads-search:${customerId}:${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    return { observations, campaigns, errors };
  }
  for (const row of res.results ?? []) {
    const cid = row.campaign?.id;
    if (!cid) {
      errors.push(`google-ads-row:${customerId}:missing campaign id, skipped`);
      continue;
    }
    const campaignId = `google-ads:${cid}`;
    const day = row.segments?.date ?? null;
    if (!campaigns.some((c) => c.campaign_id === campaignId)) {
      campaigns.push({
        campaign_id: campaignId,
        project_id: PROJECT_ID,
        name: row.campaign?.name ?? cid,
        objective: null,
        audience: null,
        status: row.campaign?.status ?? null,
        start_at: null,
        end_at: null,
        autonomy_level: null,
        platform: PLATFORM,
        account_id: accountId,
      });
    }
    const costMicros = toNum(row.metrics?.cost_micros);
    const cost = costMicros === null ? null : costMicros / COST_DIVISOR;
    const vals: Array<{ out: string; src: string; value: number | null; unit: string | null }> = [
      { out: "spend", src: "cost_micros", value: cost, unit: "currency" },
      { out: "impressions", src: "impressions", value: toNum(row.metrics?.impressions), unit: "count" },
      { out: "clicks", src: "clicks", value: toNum(row.metrics?.clicks), unit: "count" },
      { out: "conversions", src: "conversions", value: toNum(row.metrics?.conversions), unit: "count" },
    ];
    for (const m of vals) {
      observations.push(
        makeObs(
          {
            project_id: PROJECT_ID,
            account_id: accountId,
            platform: PLATFORM,
            entity_type: "campaign",
            entity_id: campaignId,
            content_id: null,
            campaign_id: campaignId,
            metric_name: m.out,
            source_metric_name: m.src,
            metric_value: m.value,
            metric_scope: "daily",
            metric_unit: m.unit,
            period_start: day ? `${day}T00:00:00Z` : null,
            period_end: day ? `${day}T23:59:59Z` : null,
            api_version: API_VERSION,
            confidence: m.value === null ? "unavailable:google-ads-null" : "ok",
          },
          now,
        ),
      );
    }
  }
  return { observations, campaigns, errors };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const d = defaultWindow(30);
  const since = arg("--since") ?? d.since;
  const until = arg("--until") ?? todayStamp();
  const outPrefix = arg("--out-prefix") ?? `data/ads-metrics/${todayStamp()}-google-ads`;
  const accounts = resolveAccounts();
  if (dryRun) {
    console.log(
      `dry-run: would collect Google Ads window ${since}..${until} customers=[${accounts.join(",") || "<GOOGLE_ADS_CUSTOMER_IDS empty>"}] -> ${outPrefix}.{observations,campaigns}.jsonl api=${API_VERSION}`,
    );
    return;
  }
  if (!accounts.length) throw new Error("GOOGLE_ADS_CUSTOMER_IDS empty — set to comma-separated customer IDs");
  required("GOOGLE_ADS_ACCESS_TOKEN");
  required("GOOGLE_ADS_DEVELOPER_TOKEN");
  const now = new Date().toISOString();
  const allObs: AdsObsRow[] = [];
  const allCamp: AdsCampaignRow[] = [];
  const allErrors: string[] = [];
  for (const cid of accounts) {
    try {
      const r = collectCustomer(cid, since, until, now);
      allObs.push(...r.observations);
      allCamp.push(...r.campaigns);
      allErrors.push(...r.errors);
      console.log(`customer=${cid} obs=${r.observations.length} campaigns=${r.campaigns.length} errors=${r.errors.length}`);
    } catch (e) {
      allErrors.push(`customer-fatal:${cid}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
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
