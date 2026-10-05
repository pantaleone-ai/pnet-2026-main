// Claim the next queued social post. Invoked by the 12h social-orchestrator cron.
// Run: npx tsx scripts/social-issues/pick-next-social.ts [--dry-run]
// Selects spri:p1 first, then oldest queued. Reverts stale in-progress locks (>7d, no open PR).
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { gh, ghJson, hasLabel, isDryRun, type IssueRef } from "../content-issues/gh";

const STALE_DAYS = 7;

function listOpenSocialIssues(): IssueRef[] {
  return ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,labels,createdAt,updatedAt,body",
  ]);
}

function priorityRank(issue: IssueRef): number {
  const names = issue.labels.map((l) => l.name);
  if (names.includes("spri:p1")) return 0;
  if (names.includes("spri:p2")) return 1;
  return 2;
}

function pickNext(issues: IssueRef[]): IssueRef | undefined {
  return issues
    .filter((i) => hasLabel(i, "status:queued"))
    .sort((a, b) => {
      const rank = priorityRank(a) - priorityRank(b);
      if (rank !== 0) return rank;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];
}

function contentIdFromTitle(title: string): string {
  const match = title.match(/^\[Social\]\s*([a-z0-9-]+)/i);
  return match?.[1] ?? "untitled";
}

function main(): void {
  const dryRun = isDryRun();
  const issues = listOpenSocialIssues();
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  let reverted = 0;
  for (const issue of issues) {
    if (!hasLabel(issue, "status:in-progress")) continue;
    if (new Date(issue.updatedAt).getTime() > cutoff) continue;
    if (dryRun) {
      console.log(`would-revert stale lock - #${issue.number} ${issue.title}`);
      reverted += 1;
      continue;
    }
    gh([
      "issue",
      "edit",
      String(issue.number),
      "--remove-label",
      "status:in-progress",
      "--add-label",
      "status:queued",
    ]);
    reverted += 1;
  }
  const next = pickNext(issues);
  if (!next) {
    console.log(`\npick-next-social${dryRun ? " (dry-run)" : ""}: reverted=${reverted} picked=none`);
    return;
  }
  const branch = `social/${next.number}-${contentIdFromTitle(next.title)}`;
  if (dryRun) {
    console.log(`would-claim - #${next.number} ${next.title} -> ${branch}`);
    return;
  }
  gh([
    "issue",
    "edit",
    String(next.number),
    "--remove-label",
    "status:queued",
    "--add-label",
    "status:in-progress",
  ]);
  gh([
    "issue",
    "comment",
    String(next.number),
    "--body",
    `Claimed by Social Orchestrator at ${new Date().toISOString()}. Target branch: \`${branch}\`.`,
  ]);
  console.log(`claimed - #${next.number} ${next.title} -> ${branch}`);
}

main();
