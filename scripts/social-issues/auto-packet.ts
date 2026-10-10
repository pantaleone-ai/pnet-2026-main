// Full auto-packet: approval on ANY social issue drives packet -> visuals,
// merge -> packet-ready -> re-approval for publish. Triggered by
// social-auto-packet.yml on the publish:approved label.
// Run: npx tsx scripts/social-issues/auto-packet.ts --issue <n> [--dry-run]
// Every failure removes the trigger label and comments (no retry loops).
// Nothing publishes here — publish-due owns the live step.
import { execFileSync } from "node:child_process";
import { gh, ghJson } from "../content-issues/gh";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

interface IssueView {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
  body: string;
  comments: Array<{ body: string }>;
}

/** Run a command in the repo root with captured output (no login shell). */
function sh(file: string, args: string[], input?: string): string {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      input,
      cwd: process.cwd(),
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch (e) {
    const err = e as { stdout?: unknown; stderr?: unknown; message?: string };
    const out = [err.stdout, err.stderr]
      .filter(Boolean)
      .join("\n")
      .toString()
      .slice(0, 600);
    throw new Error(
      `command failed: ${file} ${args.join(" ")}\n${out || err.message || ""}`,
    );
  }
}

function fail(issue: string, reason: string): never {
  if (process.argv.includes("--dry-run")) {
    console.error(
      `would-stop - #${issue}: ${reason.split("\n")[0]} (dry-run: nothing written)`,
    );
    process.exit(1);
  }
  gh(["issue", "comment", issue, "--body", reason]);
  gh(["issue", "edit", issue, "--remove-label", "publish:approved"]);
  console.error(`auto-packet stopped - #${issue}: ${reason.split("\n")[0]}`);
  process.exit(1);
}

async function urlLive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(20000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const issueArg = arg("--issue");
  const dryRun = process.argv.includes("--dry-run");
  if (!issueArg) {
    console.error("Usage: auto-packet.ts --issue <n> [--dry-run]");
    process.exit(1);
  }
  const issue = ghJson<IssueView>([
    "issue",
    "view",
    issueArg,
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  const names = issue.labels.map((l) => l.name);
  if (issue.state !== "OPEN")
    fail(issueArg, "Auto-packet ignored: issue is not open.");
  if (!names.includes("social"))
    fail(issueArg, "Auto-packet ignored: not a `social` issue.");
  if (issue.comments.some((c) => c.body.includes("Platform publish proof"))) {
    fail(issueArg, "Auto-packet ignored: already published (proof on file).");
  }
  if (names.includes("status:packet-ready")) {
    console.log(`already-ready - #${issueArg} (publish pipeline owns it)`);
    return;
  }
  const platform = names.includes("platform:instagram")
    ? "instagram"
    : names.includes("platform:facebook")
      ? "facebook"
      : "";
  if (!platform) {
    fail(
      issueArg,
      "Auto-packet can't build this yet: only instagram/facebook auto-packets exist. " +
        "Pinterest needs owner OAuth, X/LinkedIn need credentials, Reddit/Shorts are manual.",
    );
  }
  const contentId = (
    issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ??
    `content-${issue.number}`
  ).toLowerCase();
  const branch = `social/${issue.number}-${contentId}`;
  if (dryRun) {
    console.log(
      `would-auto-packet - #${issueArg} ${platform}/${contentId} -> ${branch} -> merge -> packet-ready -> re-approve`,
    );
    return;
  }

  gh([
    "issue",
    "comment",
    issueArg,
    "--body",
    `Auto-packet started. Building packet + visuals on \`${branch}\`. ` +
      `The \`publish:approved\` label will be re-added automatically once the issue is packet-ready.`,
  ]);
  if (!names.includes("status:in-progress")) {
    gh(["issue", "edit", issueArg, "--add-label", "status:in-progress"]);
  }
  if (names.includes("status:queued")) {
    gh(["issue", "edit", issueArg, "--remove-label", "status:queued"]);
  }

  try {
    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/social-issues/build-packet.ts",
        "--issue",
        issueArg,
        "--write",
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
  } catch {
    fail(
      issueArg,
      "Auto-packet stopped at packet build (see logs). Fix the issue body and re-add `publish:approved`.",
    );
  }
  try {
    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/social-issues/build-visuals.ts",
        "--issue",
        issueArg,
        "--write",
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
  } catch {
    fail(
      issueArg,
      "Auto-packet stopped at visual build (see run logs for the exact error — often the runner imaging toolchain or unnamed/missing catalog art). Fix and re-add `publish:approved`.",
    );
  }

  try {
    try {
      sh("git", ["checkout", "-b", branch]);
    } catch {
      sh("git", ["checkout", branch]);
    }
    sh("git", [
      "add",
      `public/ig/${contentId}-${issueArg}`,
      `public/fb/${contentId}-${issueArg}`,
      `docs/social-presence/publish/${contentId}-${issueArg}.md`,
      `docs/social-presence/publish/${contentId}-caption.txt`,
    ]);
    const staged = sh("git", ["diff", "--cached", "--name-only"]);
    if (!staged) {
      fail(
        issueArg,
        "Auto-packet stopped: packet build produced no files (nothing staged). Inspect the packet logs and re-add `publish:approved`.",
      );
    }
    sh("git", [
      "-c",
      "user.name=pantaleone-ai",
      "-c",
      "user.email=mdptrading@gmail.com",
      "commit",
      "-m",
      `feat(social): auto-packet ${contentId} for #${issueArg} (gallery-only)`,
    ]);
    sh("git", ["push", "-u", "origin", branch]);
  } catch (e) {
    fail(
      issueArg,
      `Auto-packet stopped at git/PR preparation: ${e instanceof Error ? e.message.split("\n").slice(0, 3).join(" ") : String(e)}. Re-add \`publish:approved\` to retry.`,
    );
  }
  const prUrl = sh("gh", [
    "pr",
    "create",
    "--title",
    `Auto-packet ${contentId} for #${issueArg} (gallery-only)`,
    "--body-file",
    `/tmp/packet-${issueArg}-pr-body.md`,
    "--head",
    branch,
    "--base",
    "main",
  ]);
  console.log(`pr - ${prUrl}`);
  sh("gh", ["pr", "merge", prUrl, "--squash", "--auto"]);
  const deadline = Date.now() + 12 * 60 * 1000;
  let mergedAt = "";
  for (;;) {
    const state = sh("gh", [
      "pr",
      "view",
      prUrl,
      "--json",
      "state,mergedAt",
      "--jq",
      '[.state,.mergedAt] | join(" ")',
    ]);
    if (state.startsWith("MERGED")) {
      mergedAt = state.split(" ")[1] ?? "";
      break;
    }
    if (Date.now() > deadline) {
      fail(
        issueArg,
        `Auto-packet stopped: PR ${prUrl} did not merge in 12 min (checks pending?). Merge it manually; the packet will flip on merge.`,
      );
    }
    await new Promise((r) => setTimeout(r, 30000));
  }
  console.log(`merged - ${prUrl} at ${mergedAt}`);
  const mergeSha = sh("gh", [
    "pr",
    "view",
    prUrl,
    "--json",
    "mergeCommit",
    "--jq",
    ".mergeCommit.oid",
  ]);
  try {
    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/social-issues/close-with-evidence-social.ts",
        "--issue",
        issueArg,
        "--pr",
        prUrl.split("/").pop() ?? "",
        "--sha",
        mergeSha,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    );
  } catch {
    fail(
      issueArg,
      `Auto-packet stopped: packet merge did not verify (PR ${prUrl}). Inspect the evidence comment and re-add \`publish:approved\`.`,
    );
  }

  // Images must be publicly reachable before the publish step runs.
  const body = gh([
    "issue",
    "view",
    issueArg,
    "--json",
    "body",
    "--jq",
    ".body",
  ]);
  const imgUrls = [
    ...body.matchAll(
      /https:\/\/www\.pantaleone\.net\/[a-z]+\/[a-z0-9-]+\/\d+\.jpg/gi,
    ),
  ].map((m) => m[0]);
  const imgDeadline = Date.now() + 10 * 60 * 1000;
  for (const url of [...new Set(imgUrls)]) {
    for (;;) {
      if (await urlLive(url)) break;
      if (Date.now() > imgDeadline) {
        fail(
          issueArg,
          `Auto-packet stopped: ${url} not reachable after deploy wait. Re-add \`publish:approved\` once live.`,
        );
      }
      await new Promise((r) => setTimeout(r, 30000));
    }
  }

  try {
    gh(["issue", "edit", issueArg, "--remove-label", "publish:approved"]);
    // Re-adding fires social-publish-on-approval, which now finds packet-ready.
    gh(["issue", "edit", issueArg, "--add-label", "publish:approved"]);
    gh([
      "issue",
      "comment",
      issueArg,
      "--body",
      "Auto-packet complete: packet merged, visuals live. Re-approved for publish.",
    ]);
  } catch (e) {
    fail(
      issueArg,
      `Auto-packet stopped at re-approval: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}. The packet is merged — re-add \`publish:approved\` manually to publish.`,
    );
  }
  console.log(`re-approved - #${issueArg}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
