// Pick the next queued content topic and claim it. Invoked by the 12h CI
// cron, `workflow_dispatch`, or locally.
// Run: npx tsx scripts/content-issues/pick-next.ts [--dry-run]
// Steps: (1) revert stale in-progress locks (>7d, no open PR), (2) select
// highest-priority oldest queued issue, (3) claim it with a comment.
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { appendFileSync } from "node:fs";
import {
  gh,
  ghJson,
  hasLabel,
  isDryRun,
  priorityRank,
  targetBranch,
  type IssueRef,
} from "./gh";

const STALE_DAYS = 7;

interface OpenPr {
  number: number;
  headRefName: string;
  body: string;
}

function listOpenContentIssues(): IssueRef[] {
  return ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "content",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,labels,createdAt,updatedAt,body",
  ]);
}

function listOpenPrs(): OpenPr[] {
  try {
    return ghJson<OpenPr[]>([
      "pr",
      "list",
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number,headRefName,body",
    ]);
  } catch {
    return [];
  }
}

/** An in-progress issue is live when an open PR targets its branch or references it. */
function hasLivePr(issueNumber: number, prs: OpenPr[]): boolean {
  const branchPrefix = `content/${issueNumber}-`;
  const refPattern = new RegExp(`#${issueNumber}\\b`);
  return prs.some(
    (pr) =>
      pr.headRefName.startsWith(branchPrefix) || refPattern.test(pr.body),
  );
}

/** Revert stale locks. Returns the count reverted. */
function cleanupStaleLocks(issues: IssueRef[], prs: OpenPr[], dryRun: boolean): number {
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  let reverted = 0;
  for (const issue of issues) {
    if (!hasLabel(issue, "status:in-progress")) continue;
    if (new Date(issue.updatedAt).getTime() > cutoff) continue;
    if (hasLivePr(issue.number, prs)) continue;
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
    gh(
      ["issue", "comment", String(issue.number), "--body",
        `Lock expired after ${STALE_DAYS} days of inactivity with no linked PR. Reverted to queued state.`],
    );
    reverted += 1;
    console.log(`reverted stale lock - #${issue.number} ${issue.title}`);
  }
  return reverted;
}

function pickNext(issues: IssueRef[]): IssueRef | undefined {
  return issues
    .filter((i) => hasLabel(i, "status:queued"))
    .sort((a, b) => {
      const rank = priorityRank(a) - priorityRank(b);
      if (rank !== 0) return rank;
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    })[0];
}

function emitOutput(issue: IssueRef, branch: string): void {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  appendFileSync(out, `issue_number=${issue.number}\n`);
  appendFileSync(out, `issue_title=${issue.title}\n`);
  appendFileSync(out, `target_branch=${branch}\n`);
}

function main(): void {
  const dryRun = isDryRun();
  const issues = listOpenContentIssues();
  const prs = listOpenPrs();
  const reverted = cleanupStaleLocks(issues, prs, dryRun);
  const next = pickNext(issues);
  if (!next) {
    console.log(`\npick-next${dryRun ? " (dry-run)" : ""}: reverted=${reverted} picked=none (queue empty)`);
    return;
  }
  const branch = targetBranch(next);
  if (dryRun) {
    console.log(`would-claim - #${next.number} ${next.title} -> ${branch}`);
    console.log(`\npick-next (dry-run): reverted=${reverted} picked=#${next.number}`);
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
  const runUrl =
    process.env.GITHUB_RUN_URL ??
    (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : "local run");
  gh([
    "issue",
    "comment",
    String(next.number),
    "--body",
    `Claimed by Content Orchestrator at ${new Date().toISOString()}. Target branch: \`${branch}\`. Run: ${runUrl}`,
  ]);
  emitOutput(next, branch);
  console.log(`claimed - #${next.number} ${next.title} -> ${branch}`);
  console.log(`\npick-next: reverted=${reverted} picked=#${next.number}`);
}

main();
