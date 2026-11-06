// Campaign lineage collector (read-only wrt platforms; writes JSONL only).
// Run: npx tsx scripts/social-issues/collect/campaign-lineage.ts [--out-prefix data/social-metrics/2026-11-05-lineage] [--limit 300] [--dry-run]
// Reads closed/open social issues (proofs, content IDs, UTM campaigns) and emits:
//   <out>.campaigns.jsonl  -> dim_campaigns rows
//   <out>.content.jsonl    -> dim_content rows
//   <out>.post_updates.jsonl -> stg_post_lineage rows (post_id -> content_id/campaign_id)
// Loading + MERGE happen in CI (social-collect.yml) or manual verify; this
// script never touches BigQuery. Nulls preserved, never fabricated.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ghJson } from "../../content-issues/gh";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

interface IssueRef {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  body: string;
  comments: Array<{ body: string }>;
}

interface ProofHit {
  url: string;
  mediaId: string;
}

function findProofs(issue: IssueRef): ProofHit[] {
  const hits: ProofHit[] = [];
  for (const c of issue.comments) {
    const m = c.body.match(
      /## Platform publish proof — (\w+)[\s\S]*?- Post: (\S+)[\s\S]*?(?:Media ID|Post ID): `([^`]+)`/,
    );
    if (!m || !m[2] || !m[3]) continue;
    hits.push({ url: m[2], mediaId: m[3] });
  }
  return hits;
}

/** First explicit content/creative identifier in the issue body, if any. */
function findContentId(body: string): string | null {
  const patterns = [
    /\*\*Content-?Id:\*\*\s*`([^`]+)`/i,
    /\*\*Reshare-Of:\*\*\s*`?#?\d*\s*`?([^`\s]+)`?/i,
    /\*\*Source asset:\*\*\s*`([^`]+)`/i,
    /\*\*Creative:\*\*\s*`([^`]+)`/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    const v = m?.[1]?.trim().replace(/^#\d+\//, "");
    if (v) return v;
  }
  return null;
}

/** First utm_campaign value in the issue body, if any. */
function findCampaign(body: string): string | null {
  const m = body.match(/utm_campaign=([^&\s`'")]+)/i);
  const v = m?.[1]?.trim();
  return v || null;
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const limit = Number(arg("--limit") ?? "300");
  const outPrefix =
    arg("--out-prefix") ?? `data/social-metrics/${new Date().toISOString().slice(0, 10)}-lineage`;
  const issues = ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    String(limit),
    "--json",
    "number,title,labels,body,comments",
  ]);
  const campaigns = new Map<string, { campaign_id: string; project_id: string }>();
  const contents = new Map<string, { content_id: string; project_id: string }>();
  const postUpdates = new Map<string, { post_id: string; content_id: string | null; campaign_id: string | null }>();
  for (const issue of issues) {
    const names = issue.labels.map((l) => l.name);
    const siteLabel = names.find((n) => n.startsWith("site:")) ?? "site:synthetic-pics";
    const project = siteLabel.replace("site:", "");
    const proofs = findProofs(issue);
    if (!proofs.length) continue;
    const contentId = findContentId(issue.body);
    const campaignId = findCampaign(issue.body);
    if (campaignId && !campaigns.has(campaignId))
      campaigns.set(campaignId, { campaign_id: campaignId, project_id: project });
    if (contentId && !contents.has(contentId))
      contents.set(contentId, { content_id: contentId, project_id: project });
    for (const p of proofs) {
      if (!postUpdates.has(p.mediaId))
        postUpdates.set(p.mediaId, { post_id: p.mediaId, content_id: contentId, campaign_id: campaignId });
    }
  }
  if (dryRun) {
    console.log(`dry-run: scanned ${issues.length} issues -> ${campaigns.size} campaigns, ${contents.size} content rows, ${postUpdates.size} post updates -> ${outPrefix}.{campaigns,content,post_updates}.jsonl`);
    return;
  }
  mkdirSync(dirname(outPrefix), { recursive: true });
  const campRows = [...campaigns.values()].map((c) => ({ ...c, name: c.campaign_id, objective: null, audience: null, status: null, start_at: null, end_at: null, autonomy_level: null }));
  const contentRows = [...contents.values()];
  const updateRows = [...postUpdates.values()];
  writeFileSync(`${outPrefix}.campaigns.jsonl`, campRows.map((r) => JSON.stringify(r)).join("\n") + (campRows.length ? "\n" : ""));
  writeFileSync(`${outPrefix}.content.jsonl`, contentRows.map((r) => JSON.stringify(r)).join("\n") + (contentRows.length ? "\n" : ""));
  writeFileSync(`${outPrefix}.post_updates.jsonl`, updateRows.map((r) => JSON.stringify(r)).join("\n") + (updateRows.length ? "\n" : ""));
  console.log(`wrote ${outPrefix}.campaigns.jsonl (${campRows.length}) + ${outPrefix}.content.jsonl (${contentRows.length}) + ${outPrefix}.post_updates.jsonl (${updateRows.length}) from ${issues.length} issues`);
  if (!campRows.length && !contentRows.length && !updateRows.length) process.exit(1);
}

if (require.main === module) main();
