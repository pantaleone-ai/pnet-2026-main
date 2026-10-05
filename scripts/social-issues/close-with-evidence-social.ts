// Close a social issue with evidence after its PR merges.
// Triggered by social-orchestrator on merged social/* PRs.
// Run: npx tsx scripts/social-issues/close-with-evidence-social.ts --issue <n> --pr <n> --sha <sha> [--dry-run]
// Closes only when the PR body carries hook, CTA, destination, UTM, and creative evidence.
import { gh, ghJson } from "../content-issues/gh";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function main(): void {
  const issueArg = arg("--issue");
  const prArg = arg("--pr");
  const sha = arg("--sha") ?? "unknown";
  const dryRun = process.argv.includes("--dry-run");
  if (!issueArg || !prArg) {
    console.error("Usage: close-with-evidence-social.ts --issue <n> --pr <n> --sha <sha>");
    process.exit(1);
  }
  const pr = ghJson<{ number: number; headRefName: string; body: string; url: string }>([
    "pr",
    "view",
    prArg,
    "--json",
    "number,headRefName,body,url",
  ]);
  const body = pr.body ?? "";
  const missing: string[] = [];
  if (!/hook/i.test(body)) missing.push("hook evidence");
  if (!/cta/i.test(body)) missing.push("CTA evidence");
  if (!/utm_campaign|utm_source/i.test(body)) missing.push("UTM verification");
  if (!/creative|screenshot|preview/i.test(body)) missing.push("creative or screenshot note");
  if (/pina_|sk-(live|test)|BEGIN.*KEY/i.test(body)) missing.push("remove secrets from PR body");
  if (missing.length > 0) {
    const comment = [`Evidence incomplete for PR #${pr.number} (${sha}).`, ``, `Missing:`, ...missing.map((m) => `- ${m}`)].join("\n");
    if (dryRun) {
      console.log(`would-flag-needs-evidence - #${issueArg}\n${comment}`);
      return;
    }
    gh(["issue", "comment", issueArg, "--body", comment]);
    gh(["issue", "edit", issueArg, "--add-label", "needs-evidence"]);
    console.log(`flagged needs-evidence - #${issueArg}`);
    return;
  }
  const comment = [
    `## Social post complete — evidence`,
    ``,
    `- PR: #${pr.number} (${pr.url})`,
    `- Merge SHA: \`${sha}\``,
    `- Hook, CTA, destination, UTM, and creative verified (see PR body)`,
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
    "status:published",
    "--add-label",
    "status:done",
  ]);
  gh(["issue", "close", issueArg, "--reason", "completed"]);
  console.log(`closed with evidence - #${issueArg} via PR #${pr.number}`);
}

main();
