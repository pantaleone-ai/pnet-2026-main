// Growth analyzer (read-only analysis, write-only to recommendations).
// Run: npx tsx scripts/social-issues/analyze/growth-analyze.ts [--dry-run] [--out-prefix data/growth/2026-11-12-recs]
// Reads: social_reporting warehouse (organic + paid) + ads_raw_google transfer views.
// Writes (live only): stg_recommendations (--replace) -> MERGE into
// insight_recommendations (insert-only, approval_status='proposed') + ingest_runs.
// Methodology: skills/data-analysis (analyze -> validate-data). Deterministic
// rules only; no LLM calls. Nulls stay null, never zero. Partial periods
// (today, Ads lag ~1d) are excluded from trend claims.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { writeJsonl } from "../collect/ads-common";

const PROJECT = process.env.BQ_PROJECT ?? "pantaleone-cross-app";
const DATASET = process.env.BQ_DATASET ?? "social_reporting";
const ADS_DATASET = process.env.BQ_ADS_DATASET ?? "ads_raw_google";
const ADS_CUSTOMER = process.env.GOOGLE_ADS_CUSTOMER_IDS?.replace(/-/g, "").split(",")[0] ?? "8427718237";
const D = `${PROJECT}.${DATASET}`;
const T = `${PROJECT}:${DATASET}`;
const A = `${PROJECT}.${ADS_DATASET}`;
const STAMP = new Date().toISOString().slice(0, 10);

interface Rec {
  recommendation_id: string;
  project_id: string | null;
  campaign_id: string | null;
  content_id: string | null;
  observation: string | null;
  evidence: string | null;
  hypothesis: string | null;
  suggested_action: string | null;
  primary_kpi: string | null;
  guardrail_kpi: string | null;
  expected_impact: string | null;
  confidence: string | null;
  approval_status: string | null;
  test_start: string | null;
  test_end: string | null;
  actual_result: string | null;
  decision: string | null;
}

function bqJson<T>(sql: string): T[] {
  const out = execFileSync("bq", ["query", "--nouse_legacy_sql", "--project_id=" + PROJECT, "--format=json", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out) as T[];
}

function bqExec(sql: string): void {
  execFileSync("bq", ["query", "--nouse_legacy_sql", "--project_id=" + PROJECT, sql], { stdio: "inherit" });
}

const ENGAGEMENT_METRICS = ["saved", "saves", "shares", "comments", "outbound_clicks", "pin_clicks", "engagements"];

function checkFreshness(recs: Rec[]): void {
  const rows = bqJson<{ platform: string; latest: string }>(
    `SELECT platform, CAST(MAX(DATE(snapshot_at)) AS STRING) latest FROM \`${D}.social_metric_observations\` GROUP BY 1`,
  );
  const today = new Date(STAMP + "T00:00:00Z").getTime();
  rows.forEach((r, i) => {
    const age = Math.round((today - new Date(r.latest + "T00:00:00Z").getTime()) / 86400000);
    if (age > 2) {
      recs.push({
        recommendation_id: `rec-${STAMP}-freshness-${r.platform}-${i}`,
        project_id: "growth",
        campaign_id: null,
        content_id: null,
        observation: `Organic platform '${r.platform}' is stale: latest snapshot ${r.latest} (${age}d ago).`,
        evidence: `MAX(DATE(snapshot_at))=${r.latest} for platform=${r.platform} in ${D}.social_metric_observations as of ${STAMP}.`,
        hypothesis: "Collector or load step failing (see ingest_runs); downstream winner/paid reads are blind past freshness date.",
        suggested_action: `Investigate social-collect for ${r.platform}; rerun collect+load before trusting any organic-side recommendation.`,
        primary_kpi: "data_freshness_days",
        guardrail_kpi: "ingest_runs.status",
        expected_impact: "high (unblocks all organic analysis)",
        confidence: "ok",
        approval_status: "proposed",
        test_start: null,
        test_end: null,
        actual_result: null,
        decision: null,
      });
    }
  });
  console.log(`freshness: ${rows.length} platforms checked, recs=${recs.length}`);
}

function checkDedupe(recs: Rec[]): void {
  const rows = bqJson<{ entity_id: string; metric_name: string; d: string; c: string }>(
    `SELECT entity_id, metric_name, CAST(DATE(snapshot_at) AS STRING) d, CAST(COUNT(*) AS STRING) c ` +
      `FROM \`${D}.social_metric_observations\` WHERE DATE(snapshot_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) ` +
      `GROUP BY 1,2,3 HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 5`,
  );
  if (!rows.length) {
    console.log("dedupe: no violations in last 14d");
    return;
  }
  const worst = rows[0];
  if (!worst) return;
  recs.push({
    recommendation_id: `rec-${STAMP}-dedupe-grain-0`,
    project_id: "growth",
    campaign_id: null,
    content_id: null,
    observation: `${rows.length} dedupe-key groups have >1 row in last 14d (worst: ${worst.entity_id}/${worst.metric_name}/${worst.d} x${worst.c}). Merge grain is wrong.`,
    evidence: `GROUP BY entity_id,metric_name,DATE(snapshot_at) HAVING COUNT(*)>1 on ${D}.social_metric_observations; worst=${JSON.stringify(worst)}.`,
    hypothesis: "Source breakdown rows inserted 1:1 instead of SUMmed to campaign-day grain (known paid-merge pattern).",
    suggested_action: "Delete duplicate-grain rows and re-merge aggregated (one row per campaign/day/metric); add grain check to load path.",
    primary_kpi: "dedupe_violations",
    guardrail_kpi: "spend_total_delta_vs_source",
    expected_impact: "high (prevents wrong spend reads)",
    confidence: "ok",
    approval_status: "proposed",
    test_start: null,
    test_end: null,
    actual_result: null,
    decision: null,
  });
  console.log(`dedupe: ${rows.length} violating groups, rec=1`);
}

function checkWinners(recs: Rec[]): void {
  const list = ENGAGEMENT_METRICS.map((m) => `'${m}'`).join(",");
  const rows = bqJson<{ entity_id: string; platform: string; campaign_id: string | null; v: string }>(
    `SELECT entity_id, platform, campaign_id, CAST(SUM(metric_value) AS STRING) v ` +
      `FROM \`${D}.social_metric_observations\` ` +
      `WHERE organic_or_paid='organic' AND metric_name IN (${list}) AND DATE(snapshot_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) ` +
      `GROUP BY 1,2,3 HAVING SUM(metric_value) > 0 ORDER BY SUM(metric_value) DESC LIMIT 3`,
  );
  rows.forEach((r, i) => {
    recs.push({
      recommendation_id: `rec-${STAMP}-winner-${i}`,
      project_id: "growth",
      campaign_id: r.campaign_id,
      content_id: null,
      observation: `Organic winner (7d): ${r.entity_id} (${r.platform}) with ${r.v} total engagement signals.`,
      evidence: `SUM(${ENGAGEMENT_METRICS.join("+")})=${r.v} over last 7d in ${D}.social_metric_observations; playbook rule: only promote organic winners.`,
      hypothesis: "Creative/audience fit proven organically; small paid test measures incremental reach at controlled cost.",
      suggested_action: `Human review: if creative still on-brand, approve a capped paid test (utm_medium=paid_social). Paid never auto-approves.`,
      primary_kpi: "cost_per_engagement",
      guardrail_kpi: "spend_cap_usd",
      expected_impact: "medium",
      confidence: Number(r.v) >= 10 ? "ok" : "low-evidence:thin-7d-base",
      approval_status: "proposed",
      test_start: null,
      test_end: null,
      actual_result: null,
      decision: null,
    });
  });
  console.log(`winners: ${rows.length} candidates`);
}

function checkPaid(recs: Rec[]): void {
  const camp = `ads_CampaignStats_${ADS_CUSTOMER}`;
  let rows: Array<{ campaign_id: string; spend: string; clicks: string; conv: string }> = [];
  try {
    rows = bqJson(
      `SELECT CAST(campaign_id AS STRING) campaign_id, CAST(SUM(metrics_cost_micros)/1e6 AS STRING) spend, ` +
        `CAST(SUM(metrics_clicks) AS STRING) clicks, CAST(SUM(metrics_conversions) AS STRING) conv ` +
        `FROM \`${A}.${camp}\` WHERE segments_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) ` +
        `GROUP BY 1 ORDER BY SUM(metrics_cost_micros) DESC LIMIT 10`,
    );
  } catch (e) {
    console.log(`paid: skipped (${(e as Error).message.slice(0, 120)})`);
    return;
  }
  rows.forEach((r, i) => {
    const spend = Number(r.spend);
    const conv = Number(r.conv);
    if (conv === 0 && spend >= 10) {
      recs.push({
        recommendation_id: `rec-${STAMP}-paid-zero-conv-${i}`,
        project_id: "paid-search",
        campaign_id: `google-ads:${r.campaign_id}`,
        content_id: null,
        observation: `Paid campaign google-ads:${r.campaign_id} spent $${spend.toFixed(2)} (7d, ${r.clicks} clicks) with 0 conversions.`,
        evidence: `SUM over segments_date last 7d in ${A}.${camp}: spend=${r.spend}, clicks=${r.clicks}, conversions=${r.conv}.`,
        hypothesis: "Targeting/keyword intent or landing-page mismatch; spend buys clicks that do not convert.",
        suggested_action: "Human review: pause or cap daily budget, check search-term report and landing page; re-enable only with conversion tracking verified.",
        primary_kpi: "conversions",
        guardrail_kpi: "spend_cap_usd",
        expected_impact: "high (stops waste)",
        confidence: "low-evidence:short-paid-history",
        approval_status: "proposed",
        test_start: null,
        test_end: null,
        actual_result: null,
        decision: null,
      });
    }
  });
  console.log(`paid: ${rows.length} campaigns checked, recs so far=${recs.length}`);
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const arg = (k: string): string | undefined => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const outPrefix = arg("--out-prefix") ?? `data/growth/${STAMP}-recs`;
  const recs: Rec[] = [];
  checkFreshness(recs);
  checkDedupe(recs);
  checkWinners(recs);
  checkPaid(recs);
  console.log(`total recs=${recs.length}`);
  if (dryRun) {
    for (const r of recs) console.log(`- [${r.recommendation_id}] ${r.observation} (confidence=${r.confidence})`);
    return;
  }
  writeJsonl(`${outPrefix}.jsonl`, recs);
  execFileSync(
    "bq",
    [
      "--location=us-central1",
      "--project_id=" + PROJECT,
      "load",
      "--replace",
      "--source_format=NEWLINE_DELIMITED_JSON",
      `${T}.stg_recommendations`,
      `${outPrefix}.jsonl`,
    ],
    { stdio: "inherit" },
  );
  bqExec(
    `MERGE \`${D}.insight_recommendations\` T USING \`${D}.stg_recommendations\` S ` +
      `ON T.recommendation_id = S.recommendation_id WHEN NOT MATCHED THEN INSERT ROW;`,
  );
  bqExec(
    `INSERT \`${D}.ingest_runs\` (run_id, started_at, source, rows_loaded, status, notes) ` +
      `VALUES ('growth-analyze-${STAMP}-${Date.now()}', CURRENT_TIMESTAMP(), 'growth-analyze', ${recs.length}, 'ok', 'analyzer proposed recs');`,
  );
  console.log(`merged ${recs.length} recs`);
}

if (require.main === module) main();
