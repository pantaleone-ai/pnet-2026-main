// Weekly performance report (dry-run by default, never fabricates).
// Run: npx tsx scripts/social-issues/report-weekly.ts [--week YYYY-WNN] [--dry-run] [--write]
// Pulls per-post Meta insights where the token permits; anything unavailable
// is recorded as null with a missingSource marker (never zero).
// Auth: META_CAPI_ACCESS_TOKEN in .env.local (local) or Actions secret (CI).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { ghJson } from "../content-issues/gh";
import { graphGet } from "./publish/graph";
import { writeFileSync } from "node:fs";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

function weekRange(week: string): { start: Date; end: Date } {
  const m = week.match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error(`bad week ${week}, want YYYY-WNN`);
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const monday = new Date(
    jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000,
  );
  const start = new Date(monday.getTime() + (Number(m[2]) - 1) * 7 * 86400000);
  return { start, end: new Date(start.getTime() + 7 * 86400000) };
}

interface IssueRef {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  body: string;
  comments: Array<{ body: string }>;
}

interface ProofHit {
  channel: string;
  url: string;
  mediaId: string;
  date: string;
}

function findProofs(issue: IssueRef): ProofHit[] {
  const hits: ProofHit[] = [];
  for (const c of issue.comments) {
    const m = c.body.match(
      /## Platform publish proof — (\w+)[\s\S]*?- Post: (\S+)[\s\S]*?(?:Media ID|Post ID): `([^`]+)`/,
    );
    if (!m || !m[1] || !m[2] || !m[3]) continue;
    hits.push({ channel: m[1], url: m[2], mediaId: m[3], date: "" });
  }
  return hits;
}

function safeInsights(
  path: string,
  params: Record<string, string>,
): { data: unknown; missing: string | null } {
  const token = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  if (!token) return { data: null, missing: "meta-token-absent" };
  try {
    const res = graphGet<unknown>(token, path, params);
    return { data: res, missing: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|scope|authorized|OAuth/i.test(msg))
      return { data: null, missing: "meta-insights-scope" };
    return { data: null, missing: `meta-fetch-failed: ${msg.slice(0, 120)}` };
  }
}

function main(): void {
  const now = new Date();
  const dayOfYear =
    (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000;
  const jan1Weekday = new Date(
    Date.UTC(now.getUTCFullYear(), 0, 1),
  ).getUTCDay();
  const isoWeek = `${now.getUTCFullYear()}-W${String(Math.ceil((dayOfYear + jan1Weekday + 1) / 7)).padStart(2, "0")}`;
  const week = arg("--week") ?? isoWeek;
  const dryRun = !process.argv.includes("--write");
  const { start, end } = weekRange(week);
  const issues = ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,title,labels,body,comments",
  ]);
  const rows: string[] = [];
  for (const issue of issues) {
    const labels = issue.labels.map((l) => l.name);
    if (!labels.includes("site:synthetic-pics")) continue;
    for (const proof of findProofs(issue)) {
      const platform =
        labels.find((l) => l.startsWith("platform:")) ??
        `platform:${proof.channel}`;
      const metricParams =
        proof.channel === "instagram"
          ? { metric: "reach,saved,shares,profile_activity" }
          : {
              metric:
                "post_impressions,post_clicks,post_reactions_by_type_total",
            };
      const { data, missing } = safeInsights(proof.mediaId, { fields: "id" });
      void data;
      const { data: insights, missing: insightsMissing } = safeInsights(
        `${proof.mediaId}/insights`,
        metricParams,
      );
      rows.push(
        [
          `| #${issue.number} | ${platform.replace("platform:", "")} | ${proof.url} |`,
          ` ${insightsMissing ?? "ok"} |`,
          ` ${missing ?? "ok"} |`,
          ` ${insights ? JSON.stringify(insights).slice(0, 200) : "null"} |`,
        ].join(""),
      );
    }
  }
  const doc = [
    `# synthetic.pics performance — ${week}`,
    ``,
    `Window: ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)} (UTC).`,
    `Unavailable metrics are null with a missingSource marker — never zero, never fabricated.`,
    ``,
    `| Issue | Platform | Post | Insights | Token | Data (truncated) |`,
    `|---|---|---|---|---|---|`,
    ...rows,
    rows.length === 0 ? `_No proofs found in scope this week._` : ``,
    ``,
    `## Decisions (fill in weekly review)`,
    ``,
    `- Repeat: `,
    `- Revise: `,
    `- Pause: `,
    `- Next-week cadence IG / FB: `,
  ].join("\n");
  if (dryRun) {
    console.log(doc);
    return;
  }
  const path = `docs/social-presence/synthetic-pics.performance-${week}.md`;
  writeFileSync(path, doc);
  console.log(`wrote - ${path} (${rows.length} proof rows)`);
}

main();
