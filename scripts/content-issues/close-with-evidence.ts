// Close a content issue with an evidence bundle after its PR merges.
// Triggered by the content-orchestrator workflow on merged content/* PRs.
// Run: npx tsx scripts/content-issues/close-with-evidence.ts
//        --issue <number> --pr <pr_number> --sha <commit_sha> [--dry-run]
// Closes only when the PR body carries validation evidence; otherwise posts
// the gap list and adds `needs-evidence`, leaving the issue open.
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { gh, ghJson } from "./gh";

const GATES = [
  { key: "editorial", label: "`npm run editorial`" },
  { key: "content:validate", label: "`npm run content:validate`" },
  { key: "check-types", label: "`npm run check-types`" },
] as const;

interface PrView {
  number: number;
  title: string;
  headRefName: string;
  body: string;
  url: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

/** Gate counts as evidenced when named near a pass marker or checked box. */
function gateEvidenced(body: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nearPass = new RegExp(
    `${escaped}[\\s\\S]{0,120}(pass|✅|:white_check_mark:|clean|\\bok\\b)`,
    "i",
  );
  const checkedBox = new RegExp(
    `- \\[x\\][^\\n]{0,120}${escaped}`,
    "i",
  );
  return nearPass.test(body) || checkedBox.test(body);
}

function extractSlug(pr: PrView): string {
  const fromBranch = pr.headRefName.replace(/^content\/\d+-/, "").trim();
  if (fromBranch && fromBranch !== pr.headRefName) return fromBranch;
  const fromBody = pr.body.match(/(?:target slug|^slug):\s*`?([a-z0-9][a-z0-9-]*)/im);
  return fromBody?.[1] ?? "see-pr";
}

function internalLinksMentioned(body: string): boolean {
  return /related|continue-reading|content-graph|internal link/i.test(body);
}

function previewMentioned(body: string): boolean {
  return /preview|vercel\.app|deployed/i.test(body);
}

function main(): void {
  const issueArg = arg("--issue");
  const prArg = arg("--pr");
  const sha = arg("--sha") ?? "unknown";
  const dryRun = process.argv.includes("--dry-run");
  if (!issueArg || !prArg) {
    console.error(
      "Usage: close-with-evidence.ts --issue <number> --pr <pr_number> --sha <commit_sha> [--dry-run]",
    );
    process.exit(1);
  }
  const pr = ghJson<PrView>([
    "pr",
    "view",
    prArg,
    "--json",
    "number,title,headRefName,body,url",
  ]);
  const body = pr.body ?? "";
  const missing: string[] = [];
  for (const gate of GATES) {
    if (!gateEvidenced(body, gate.key)) missing.push(`${gate.label} pass evidence`);
  }
  if (!previewMentioned(body)) missing.push("preview deployment verification");
  if (!internalLinksMentioned(body)) missing.push("internal links note");

  const slug = extractSlug(pr);

  if (missing.length > 0) {
    const comment = [
      `Evidence incomplete for PR #${pr.number} (${sha}).`,
      ``,
      `Missing:`,
      ...missing.map((m) => `- ${m}`),
      ``,
      `Add the missing evidence to the PR body and re-run, or comment here. Issue stays open.`,
    ].join("\n");
    if (dryRun) {
      console.log(`would-flag-needs-evidence - #${issueArg}\n${comment}`);
      return;
    }
    gh(["issue", "comment", issueArg, "--body", comment]);
    gh(["issue", "edit", issueArg, "--add-label", "needs-evidence"]);
    console.log(`flagged needs-evidence - #${issueArg} (missing: ${missing.join("; ")})`);
    return;
  }

  const comment = [
    `## Content complete — evidence`,
    ``,
    `- PR: #${pr.number} (${pr.url})`,
    `- Merge SHA: \`${sha}\``,
    `- Article slug: \`${slug}\` → canonical \`/blog/${slug}\``,
    `- Gates: \`npm run editorial\` pass, \`npm run content:validate\` pass, \`npm run check-types\` pass (see PR body)`,
    `- Internal links + preview verified (see PR body)`,
  ].join("\n");
  if (dryRun) {
    console.log(`would-close-with-evidence - #${issueArg}\n${comment}`);
    return;
  }
  gh(["issue", "comment", issueArg, "--body", comment]);
  gh([
    "issue",
    "edit",
    issueArg,
    "--remove-label",
    "status:in-progress",
    "--remove-label",
    "status:in-review",
    "--remove-label",
    "needs-evidence",
    "--add-label",
    "status:done",
  ]);
  gh(["issue", "close", issueArg, "--reason", "completed"]);
  console.log(`closed with evidence - #${issueArg} via PR #${pr.number}`);
}

main();
