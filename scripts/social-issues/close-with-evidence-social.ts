// Close a social issue with evidence after its PR merges.
// Triggered by social-orchestrator on merged social/* PRs.
// Run: npx tsx scripts/social-issues/close-with-evidence-social.ts --issue <n> --pr <n> --sha <sha> [--dry-run]
// Two-stage gate (see #91/#101 postmortem):
//   1. Packet merge (hook + CTA + UTM + creative spec) -> status:packet-ready + needs-manual-post, issue STAYS OPEN.
//   2. Platform publish (Instagram/Meta post URL or media ID + screenshot, no pending language)
//      -> status:published + status:done, issue CLOSED.
// Placeholder/"pending" language never counts as platform proof. Idempotent: one evidence comment per PR+SHA.
import { gh, ghJson } from "../content-issues/gh";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

// Real Instagram/Meta platform proof: a live post permalink or a media/container/post ID.
// Matches instagram.com/p|reel|reels|share|stories links, facebook post/video/reel permalinks,
// fb.watch / fb.me short links, or an explicit ig_media_id / media_id / post_id / container_id value.
const POST_URL_RE =
  /(instagram\.com\/(p|reel|reels|share|stories)\/[A-Za-z0-9_.-]+|facebook\.com\/.+\/(posts|videos|reel)\/[A-Za-z0-9_.-]+|fb\.watch\/[A-Za-z0-9_.-]+|fb\.me\/[A-Za-z0-9_.-]+)/i;
const MEDIA_ID_RE =
  /(ig_?media_?id|instagram_?media_?id|media_?id|post_?id|container_?id)\s*[:=]\s*[0-9A-Za-z_-]{5,}/i;

// "Screenshot pending"-style language must never satisfy the screenshot gate.
const PLACEHOLDER_RE = /pending|placeholder|to be added|\bTBD\b|\bTODO\b|post-publish/i;

function hasPlatformPostProof(body: string): boolean {
  return POST_URL_RE.test(body) || MEDIA_ID_RE.test(body);
}

function hasScreenshotProof(body: string): boolean {
  if (!/screenshot/i.test(body)) return false;
  if (PLACEHOLDER_RE.test(body) && !hasPlatformPostProof(body)) return false;
  return true;
}

interface IssueComment {
  body: string;
}

function alreadyCommented(issue: string, marker: string, sha: string): boolean {
  try {
    const comments = ghJson<IssueComment[]>([
      "issue",
      "view",
      issue,
      "--json",
      "comments",
      "--jq",
      ".comments",
    ]);
    return comments.some((c) => c.body.includes(marker) && c.body.includes(sha));
  } catch {
    return false;
  }
}

function postCommentOnce(issue: string, marker: string, sha: string, comment: string, dryRun: boolean, dryLabel: string): boolean {
  if (alreadyCommented(issue, marker, sha)) {
    console.log(`already-commented - #${issue} marker present for ${marker} @ ${sha}; skipping duplicate comment`);
    return false;
  }
  if (dryRun) {
    console.log(`${dryLabel} - #${issue}\n${comment}`);
    return false;
  }
  gh(["issue", "comment", issue, "--body", comment]);
  return true;
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
  const marker = `PR: #${pr.number}`;

  const missingBase: string[] = [];
  if (!/hook/i.test(body)) missingBase.push("hook evidence");
  if (!/cta/i.test(body)) missingBase.push("CTA evidence");
  if (!/utm_campaign|utm_source/i.test(body)) missingBase.push("UTM verification");
  if (!/creative/i.test(body)) missingBase.push("creative spec");
  if (/pina_|sk-(live|test)|BEGIN.*KEY/i.test(body)) missingBase.push("remove secrets from PR body");

  if (missingBase.length > 0) {
    const comment = [
      `Evidence incomplete for PR #${pr.number} (${sha}).`,
      ``,
      `Missing:`,
      ...missingBase.map((m) => `- ${m}`),
      ``,
      `Add the missing evidence to the PR body and re-run. Issue stays open.`,
    ].join("\n");
    if (dryRun) {
      console.log(`would-flag-needs-evidence - #${issueArg}\n${comment}`);
      return;
    }
    postCommentOnce(issueArg, marker, sha, comment, false, "");
    gh(["issue", "edit", issueArg, "--add-label", "needs-evidence"]);
    console.log(`flagged needs-evidence - #${issueArg}`);
    return;
  }

  const platformProof = hasPlatformPostProof(body);
  const screenshotProof = hasScreenshotProof(body);
  const placeholderBlocked = PLACEHOLDER_RE.test(body) && !platformProof;

  if (!platformProof || !screenshotProof) {
    const missing: string[] = [];
    if (!platformProof)
      missing.push("Instagram/Meta post URL or media ID (instagram.com/p|reel|stories link, facebook permalink, or ig_media_id)");
    if (!screenshotProof)
      missing.push("published screenshot evidence (no pending/placeholder language)");
    if (placeholderBlocked)
      missing.push(`placeholder language detected ("pending"/"placeholder"/"to be added"/"post-publish") — post URL required first`);
    const comment = [
      `## Packet ready — platform post pending`,
      ``,
      `- PR: #${pr.number} (${pr.url})`,
      `- Merge SHA: \`${sha}\``,
      `- Packet verified: hook, CTA, destination, UTM, creative spec (see PR body)`,
      `- Still missing:`,
      ...missing.map((m) => `  - ${m}`),
      ``,
      `Next: post manually per the packet, then reply here with the Instagram/Meta post URL (+ media ID) and a screenshot. Only then does this move to \`status:published\` + \`status:done\`.`,
    ].join("\n");
    if (dryRun) {
      const dup = alreadyCommented(issueArg, marker, sha) ? " (duplicate comment would be skipped)" : "";
      console.log(`would-flag-packet-ready${dup} - #${issueArg}\n${comment}`);
      return;
    }
    postCommentOnce(issueArg, marker, sha, comment, false, "");
    gh([
      "issue",
      "edit",
      issueArg,
      "--remove-label",
      "status:in-progress",
      "--remove-label",
      "status:in-review",
      "--remove-label",
      "status:published",
      "--remove-label",
      "status:done",
      "--add-label",
      "status:packet-ready",
      "--add-label",
      "needs-manual-post",
    ]);
    gh(["issue", "reopen", issueArg]);
    console.log(`flagged packet-ready - #${issueArg} (platform post pending)`);
    return;
  }

  const comment = [
    `## Social post complete — evidence`,
    ``,
    `- PR: #${pr.number} (${pr.url})`,
    `- Merge SHA: \`${sha}\``,
    `- Hook, CTA, destination, UTM, and creative verified (see PR body)`,
    `- Platform proof: live Instagram/Meta post URL / media ID + screenshot (see PR body)`,
  ].join("\n");
  if (dryRun) {
    console.log(`would-close-with-evidence - #${issueArg}\n${comment}`);
    return;
  }
  postCommentOnce(issueArg, marker, sha, comment, false, "");
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
    "--remove-label",
    "status:packet-ready",
    "--remove-label",
    "needs-manual-post",
    "--add-label",
    "status:published",
    "--add-label",
    "status:done",
  ]);
  gh(["issue", "close", issueArg, "--reason", "completed"]);
  console.log(`closed with evidence - #${issueArg} via PR #${pr.number}`);
}

main();
