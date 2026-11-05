// Pinterest performance collector (read-only).
// Run: npx tsx scripts/social-issues/collect/pinterest-collect.ts [--max-pins 250] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--out-prefix data/social-metrics/2026-11-05-pin] [--dry-run]
// Writes: <out-prefix>.posts.jsonl (social_posts rows) + <out-prefix>.observations.jsonl (social_metric_observations rows).
// Auth: PINTEREST_ACCESS_TOKEN in .env.local (local) or Actions secret (CI).
// Enumerates ALL pins (paginated, not top-50), per-pin analytics + account analytics.
// Organic only; promoted stays separate (Phase 4). Within 90d organic lookback:
// default window is last 30d. Unavailable metrics are null with confidence
// markers, never zero.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const API = "https://api.pinterest.com/v5";
const API_VERSION = "pinterest-v5";
const MDV = "mdv1-2026-11";
const PROJECT_ID = "synthetic-pics";
const ACCOUNT_ID = "pin-syntheticpics";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

function get<T>(token: string, path: string): T {
  const out = execFileSync("curl", ["-sS", "-m", "60", `${API}${path}`, "-H", `Authorization: Bearer ${token}`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out) as T;
}

interface PostRow {
  post_id: string;
  content_id: string | null;
  project_id: string;
  account_id: string;
  platform: string;
  published_at: string | null;
  permalink_url: string | null;
  proof_url: string | null;
}

interface ObsRow {
  project_id: string;
  account_id: string;
  platform: string;
  entity_type: "post" | "account";
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
  organic_or_paid: string;
  api_version: string;
  metric_definition_version: string;
  confidence: string;
}

const METRICS = ["IMPRESSION", "PIN_CLICK", "SAVE", "OUTBOUND_CLICK", "ENGAGEMENT"] as const;
const METRIC_MAP: Record<string, string> = {
  IMPRESSION: "impressions",
  PIN_CLICK: "pin_clicks",
  SAVE: "saves",
  OUTBOUND_CLICK: "outbound_clicks",
  ENGAGEMENT: "engagements",
};

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const token = process.env.PINTEREST_ACCESS_TOKEN ?? "";
  if (!token) throw new Error("PINTEREST_ACCESS_TOKEN absent");
  const maxPins = Number(arg("--max-pins") ?? "250");
  const today = new Date().toISOString().slice(0, 10);
  const until = arg("--until") ?? today;
  const since =
    arg("--since") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const outPrefix = arg("--out-prefix") ?? `data/social-metrics/${today}-pin`;
  const now = new Date().toISOString();
  if (dryRun) {
    console.log(`dry-run: would collect pins (max ${maxPins}) window ${since}..${until} -> ${outPrefix}.{posts,observations}.jsonl api=${API_VERSION} ${MDV}`);
    return;
  }
  const posts: PostRow[] = [];
  const observations: ObsRow[] = [];
  const errors: string[] = [];
  const obs = (r: Omit<ObsRow, "snapshot_at" | "collected_at" | "api_version" | "metric_definition_version">): ObsRow =>
    ({ ...r, snapshot_at: now, collected_at: now, api_version: API_VERSION, metric_definition_version: MDV });
  // Account check.
  try {
    const user = get<{ username?: string; account_type?: string }>(token, "/user_account");
    if (!user.username) errors.push("account:empty user_account response");
    else console.log(`account=${user.username} (${user.account_type})`);
  } catch (e) {
    errors.push(`account:${String(e).slice(0, 160)}`);
    console.log(errors.join("\n"));
    process.exit(1);
  }
  // Account analytics (daily).
  try {
    const a = get<{ all?: { summary_metrics?: Record<string, number>; daily_metrics?: Array<{ date?: string; data_status?: string; metrics?: Record<string, number> }> } }>(
      token,
      `/user_account/analytics?start_date=${since}&end_date=${until}&metric_types=${METRICS.join(",")}`,
    );
    for (const d of a.all?.daily_metrics ?? []) {
      if (!d.date || !d.metrics) continue;
      const lowConfidence = d.data_status && d.data_status !== "READY" ? `directional:${d.data_status}` : "ok";
      for (const m of METRICS) {
        const v = d.metrics[m];
        if (typeof v !== "number") continue;
        observations.push(obs({ project_id: PROJECT_ID, account_id: ACCOUNT_ID, platform: "pinterest", entity_type: "account", entity_id: ACCOUNT_ID, content_id: null, campaign_id: null, metric_name: METRIC_MAP[m] ?? m, source_metric_name: m, metric_value: v, metric_scope: "daily", metric_unit: "count", period_start: `${d.date}T00:00:00Z`, period_end: `${d.date}T23:59:59Z`, organic_or_paid: "organic", confidence: lowConfidence }));
      }
    }
  } catch (e) {
    errors.push(`account-analytics:${String(e).slice(0, 160)}`);
  }
  // Enumerate all pins (paginated).
  const pinIds: string[] = [];
  let bookmark: string | undefined;
  try {
    for (let page = 0; page < 20 && pinIds.length < maxPins; page += 1) {
      const q = `/pins?page_size=25${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ""}`;
      const res = get<{ items?: Array<{ id?: string }>; bookmark?: string }>(token, q);
      for (const it of res.items ?? []) if (it.id) pinIds.push(it.id);
      bookmark = res.bookmark;
      if (!bookmark || !(res.items ?? []).length) break;
    }
  } catch (e) {
    errors.push(`pins-list:${String(e).slice(0, 160)}`);
  }
  console.log(`pins=${pinIds.length}`);
  // Per-pin detail + analytics (bounded window summary).
  for (const pid of pinIds.slice(0, maxPins)) {
    try {
      const p = get<{ id?: string; title?: string; description?: string; link?: string; board_id?: string; created_at?: string }>(token, `/pins/${pid}`);
      posts.push({ post_id: pid, content_id: null, project_id: PROJECT_ID, account_id: ACCOUNT_ID, platform: "pinterest", published_at: p.created_at ?? null, permalink_url: `https://www.pinterest.com/pin/${pid}/`, proof_url: `https://www.pinterest.com/pin/${pid}/` });
    } catch (e) {
      errors.push(`pin-detail:${pid}:${String(e).slice(0, 120)}`);
      continue;
    }
    try {
      const pa = get<{ all?: { summary_metrics?: Record<string, number> } }>(
        token,
        `/pins/${pid}/analytics?start_date=${since}&end_date=${until}&metric_types=${METRICS.join(",")}`,
      );
      for (const m of METRICS) {
        const v = pa.all?.summary_metrics?.[m];
        observations.push(obs({ project_id: PROJECT_ID, account_id: ACCOUNT_ID, platform: "pinterest", entity_type: "post", entity_id: pid, content_id: null, campaign_id: null, metric_name: METRIC_MAP[m] ?? m, source_metric_name: m, metric_value: typeof v === "number" ? v : null, metric_scope: "period", metric_unit: "count", period_start: `${since}T00:00:00Z`, period_end: `${until}T23:59:59Z`, organic_or_paid: "organic", confidence: typeof v === "number" ? "ok" : "unavailable:pin-analytics-null" }));
      }
    } catch (e) {
      errors.push(`pin-analytics:${pid}:${String(e).slice(0, 120)}`);
    }
  }
  mkdirSync(dirname(outPrefix), { recursive: true });
  writeFileSync(`${outPrefix}.posts.jsonl`, posts.map((r) => JSON.stringify(r)).join("\n") + (posts.length ? "\n" : ""));
  writeFileSync(`${outPrefix}.observations.jsonl`, observations.map((r) => JSON.stringify(r)).join("\n") + (observations.length ? "\n" : ""));
  console.log(`wrote ${outPrefix}.posts.jsonl (${posts.length}) + ${outPrefix}.observations.jsonl (${observations.length}) errors=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 20).join("\n"));
  if (!posts.length && !observations.length) process.exit(1);
}

if (require.main === module) main();
