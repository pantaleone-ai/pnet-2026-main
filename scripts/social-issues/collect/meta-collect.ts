// Meta performance collector (read-only).
// Run: npx tsx scripts/social-issues/collect/meta-collect.ts [--site <site>] [--limit-posts 50] [--out-prefix data/social-metrics/2026-11-05] [--dry-run]
// Writes: <out-prefix>.posts.jsonl (social_posts rows) + <out-prefix>.observations.jsonl (social_metric_observations rows).
// Auth: META_CAPI_ACCESS_TOKEN in .env.local (local) or Actions secret (CI).
// Reads only: System token -> Page token exchange (facebook.ts pattern) ->
// Page posts + page basics + page_post_engagements; IG media + media insights.
// Post-level FB insights are deprecated by Meta (June 2026) and intentionally
// NOT collected; the limitation is recorded per post instead of zero-filled.
// Anything unavailable is marked confidence=unavailable:<reason>, never zero.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { graphGet, GRAPH_VERSION } from "../publish/graph";
import { SITE_ACCOUNTS } from "../publish/accounts";

const MDV = "mdv1-2026-11";
const API_VERSION = `graph-${GRAPH_VERSION}`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

interface PostRow {
  post_id: string;
  content_id: string | null;
  project_id: string;
  account_id: string;
  platform: "facebook" | "instagram";
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

function obs(
  base: Omit<ObsRow, "snapshot_at" | "collected_at" | "api_version" | "metric_definition_version">,
  now: string,
): ObsRow {
  return { ...base, period_start: normTs(base.period_start), period_end: normTs(base.period_end), snapshot_at: now, collected_at: now, api_version: API_VERSION, metric_definition_version: MDV };
}

// BigQuery TIMESTAMP requires +HH:MM; Meta returns +HHMM.
function normTs(v: string | null): string | null {
  if (!v) return v;
  const m = v.match(/([+-])(\d{2})(\d{2})$/);
  if (m) return `${v.slice(0, -5)}${m[1]}${m[2]}:${m[3]}`;
  return v;
}

function pageToken(sysToken: string, pageId: string): string {
  const res = graphGet<{ access_token?: string }>(sysToken, pageId, { fields: "access_token" });
  if (!res.access_token) throw new Error(`page token exchange failed for ${pageId}`);
  return res.access_token;
}

export function collectSite(
  sysToken: string,
  site: string,
  limitPosts: number,
  now: string,
): { posts: PostRow[]; observations: ObsRow[]; errors: string[] } {
  const posts: PostRow[] = [];
  const observations: ObsRow[] = [];
  const errors: string[] = [];
  const acct = SITE_ACCOUNTS.find((a) => a.site === site);
  if (!acct) throw new Error(`unknown site ${site}`);
  const fbAccountId = `fb-${acct.pageId}`;
  let pageTok = "";
  try {
    pageTok = pageToken(sysToken, acct.pageId);
  } catch (e) {
    errors.push(`page-token:${site}:${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
    return { posts, observations, errors };
  }
  // FB page basics (snapshot).
  try {
    const basics = graphGet<{ fan_count?: number; followers_count?: number }>(pageTok, acct.pageId, {
      fields: "fan_count,followers_count",
    });
    if (typeof basics.fan_count === "number")
      observations.push(
        obs({ project_id: site, account_id: fbAccountId, platform: "facebook", entity_type: "account", entity_id: acct.pageId, content_id: null, campaign_id: null, metric_name: "page_fans", source_metric_name: "fan_count", metric_value: basics.fan_count, metric_scope: "snapshot", metric_unit: "count", period_start: null, period_end: null, organic_or_paid: "organic", confidence: "ok" }, now),
      );
    if (typeof basics.followers_count === "number")
      observations.push(
        obs({ project_id: site, account_id: fbAccountId, platform: "facebook", entity_type: "account", entity_id: acct.pageId, content_id: null, campaign_id: null, metric_name: "page_followers", source_metric_name: "followers_count", metric_value: basics.followers_count, metric_scope: "snapshot", metric_unit: "count", period_start: null, period_end: null, organic_or_paid: "organic", confidence: "ok" }, now),
      );
  } catch (e) {
    errors.push(`page-basics:${site}:${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
  }
  // FB posts inventory (no per-post insights: deprecated by Meta).
  try {
    const feed = graphGet<{ data?: Array<{ id?: string; message?: string; created_time?: string; permalink_url?: string }> }>(
      pageTok,
      `${acct.pageId}/posts`,
      { fields: "id,message,created_time,permalink_url", limit: String(limitPosts) },
    );
    for (const p of feed.data ?? []) {
      if (!p.id) continue;
      posts.push({ post_id: p.id, content_id: null, project_id: site, account_id: fbAccountId, platform: "facebook", published_at: normTs(p.created_time ?? null), permalink_url: p.permalink_url ?? null, proof_url: p.permalink_url ?? null });
      observations.push(
        obs({ project_id: site, account_id: fbAccountId, platform: "facebook", entity_type: "post", entity_id: p.id, content_id: null, campaign_id: null, metric_name: "post_insights", source_metric_name: "insights", metric_value: null, metric_scope: "lifetime", metric_unit: null, period_start: null, period_end: null, organic_or_paid: "organic", confidence: "unavailable:post_insights_deprecated_2026" }, now),
      );
    }
  } catch (e) {
    errors.push(`fb-posts:${site}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
  // FB page-level engagements (valid allowlisted metric).
  try {
    const ins = graphGet<{ data?: Array<{ name?: string; period?: string; values?: Array<{ value?: number; end_time?: string }> }> }>(
      pageTok,
      `${acct.pageId}/insights`,
      { metric: "page_post_engagements", period: "day", date_preset: "last_14d" },
    );
    for (const series of ins.data ?? []) {
      for (const v of series.values ?? []) {
        if (typeof v.value !== "number" || !v.end_time) continue;
        const day = v.end_time.slice(0, 10);
        observations.push(
          obs({ project_id: site, account_id: fbAccountId, platform: "facebook", entity_type: "account", entity_id: acct.pageId, content_id: null, campaign_id: null, metric_name: "page_post_engagements", source_metric_name: "page_post_engagements", metric_value: v.value, metric_scope: "daily", metric_unit: "count", period_start: `${day}T00:00:00Z`, period_end: v.end_time, organic_or_paid: "organic", confidence: "ok" }, now),
        );
      }
    }
  } catch (e) {
    errors.push(`fb-page-insights:${site}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
  // IG media + insights (system token works directly).
  if (acct.igUserId) {
    const igAccountId = `ig-${acct.igUserId}`;
    try {
      const media = graphGet<{ data?: Array<{ id?: string; caption?: string; timestamp?: string; like_count?: number; comments_count?: number }> }>(
        sysToken,
        `${acct.igUserId}/media`,
        { fields: "id,caption,timestamp,like_count,comments_count", limit: String(limitPosts) },
      );
      for (const m of media.data ?? []) {
        if (!m.id) continue;
        posts.push({ post_id: m.id, content_id: null, project_id: site, account_id: igAccountId, platform: "instagram", published_at: normTs(m.timestamp ?? null), permalink_url: null, proof_url: null });
        if (typeof m.like_count === "number")
          observations.push(obs({ project_id: site, account_id: igAccountId, platform: "instagram", entity_type: "post", entity_id: m.id, content_id: null, campaign_id: null, metric_name: "likes", source_metric_name: "like_count", metric_value: m.like_count, metric_scope: "snapshot", metric_unit: "count", period_start: null, period_end: null, organic_or_paid: "organic", confidence: "ok" }, now));
        if (typeof m.comments_count === "number")
          observations.push(obs({ project_id: site, account_id: igAccountId, platform: "instagram", entity_type: "post", entity_id: m.id, content_id: null, campaign_id: null, metric_name: "comments", source_metric_name: "comments_count", metric_value: m.comments_count, metric_scope: "snapshot", metric_unit: "count", period_start: null, period_end: null, organic_or_paid: "organic", confidence: "ok" }, now));
        try {
          const mi = graphGet<{ data?: Array<{ name?: string; values?: Array<{ value?: number }> }> }>(
            sysToken,
            `${m.id}/insights`,
            { metric: "likes,comments,reach,saved,shares" },
          );
          for (const s of mi.data ?? []) {
            const val = s.values?.[0]?.value;
            if (typeof val !== "number" || !s.name) continue;
            if (s.name === "likes" || s.name === "comments") continue; // already captured as snapshot
            observations.push(obs({ project_id: site, account_id: igAccountId, platform: "instagram", entity_type: "post", entity_id: m.id, content_id: null, campaign_id: null, metric_name: s.name, source_metric_name: s.name, metric_value: val, metric_scope: "lifetime", metric_unit: "count", period_start: null, period_end: null, organic_or_paid: "organic", confidence: "ok" }, now));
          }
        } catch (e) {
          errors.push(`ig-media-insights:${m.id}:${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`ig-media:${site}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    }
  }
  return { posts, observations, errors };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const sysToken = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  if (!sysToken) throw new Error("META_CAPI_ACCESS_TOKEN absent");
  const onlySite = arg("--site");
  const limitPosts = Number(arg("--limit-posts") ?? "50");
  const outPrefix = arg("--out-prefix") ?? `data/social-metrics/${new Date().toISOString().slice(0, 10)}-meta`;
  const now = new Date().toISOString();
  const sites = SITE_ACCOUNTS.map((a) => a.site).filter((s) => !onlySite || s === onlySite);
  if (dryRun) {
    console.log(`dry-run: would collect ${sites.length} sites (${sites.join(",")}) limit=${limitPosts} -> ${outPrefix}.{posts,observations}.jsonl api=${API_VERSION} ${MDV}`);
    return;
  }
  const allPosts: PostRow[] = [];
  const allObs: ObsRow[] = [];
  const allErrors: string[] = [];
  for (const site of sites) {
    try {
      const r = collectSite(sysToken, site, limitPosts, now);
      allPosts.push(...r.posts);
      allObs.push(...r.observations);
      allErrors.push(...r.errors);
      console.log(`site=${site} posts=${r.posts.length} obs=${r.observations.length} errors=${r.errors.length}`);
    } catch (e) {
      allErrors.push(`site-fatal:${site}:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    }
  }
  mkdirSync(dirname(outPrefix), { recursive: true });
  writeFileSync(`${outPrefix}.posts.jsonl`, allPosts.map((r) => JSON.stringify(r)).join("\n") + (allPosts.length ? "\n" : ""));
  writeFileSync(`${outPrefix}.observations.jsonl`, allObs.map((r) => JSON.stringify(r)).join("\n") + (allObs.length ? "\n" : ""));
  console.log(`wrote ${outPrefix}.posts.jsonl (${allPosts.length}) + ${outPrefix}.observations.jsonl (${allObs.length}) errors=${allErrors.length}`);
  if (allErrors.length) console.log(allErrors.slice(0, 20).join("\n"));
  if (!allPosts.length && !allObs.length) process.exit(1);
}

if (require.main === module) main();
