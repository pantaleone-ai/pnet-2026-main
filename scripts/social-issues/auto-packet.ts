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
    // Silent: the publish pipeline owns this state (this often races a live
    // publish on re-approval). No comment, no label touch.
    console.log(
      `already-published - #${issueArg} (proof on file, staying quiet)`,
    );
    return;
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

  // PR operations need a token allowed to create PRs. GITHUB_TOKEN is blocked
  // when the repo/org disables "Allow GitHub Actions to create and approve
  // pull requests" — fall back to PROJECTS_TOKEN (classic PAT pattern already
  // used by social-to-projects.yml) when PR creation is denied.
  const pat = process.env.PROJECTS_TOKEN ?? "";
  function ghWrite(args: string[]): string {
    try {
      return execFileSync("gh", args, {
        encoding: "utf8",
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
      }).trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /not permitted to create|createPullRequest/i.test(msg);
      if (!denied || !pat) throw e instanceof Error ? e : new Error(msg);
      return execFileSync("gh", args, {
        encoding: "utf8",
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GH_TOKEN: pat, GITHUB_TOKEN: pat },
      }).trim();
    }
  }
  function gitPushWithFallback(): void {
    // Bot-owned single-writer branches (workflow concurrency is global and
    // serial) — lease-guarded force push rides over shallow-clone and
    // moved-main divergence without ever clobbering unknown work.
    const diag: string[] = [];
    try {
      sh("git", ["fetch", "origin", branch]);
      diag.push("fetch ok");
    } catch (e) {
      diag.push(
        `fetch failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`,
      );
    }
    const pushArgs = ["push", "--force-with-lease", "-u", "origin", branch];
    try {
      sh("git", pushArgs);
      return;
    } catch (e) {
      diag.push(
        `push failed: ${e instanceof Error ? e.message.split("\n").slice(0, 2).join(" ") : String(e)}`,
      );
      if (!pat) throw new Error(diag.join(" | "));
    }
    const url = sh("git", ["remote", "get-url", "origin"]);
    const authed = url.replace(/^https:\/\//, `https://x-access-token:${pat}@`);
    try {
      sh("git", [
        "push",
        "--force-with-lease",
        "--set-upstream",
        authed,
        `${branch}:${branch}`,
      ]);
    } catch (e) {
      throw new Error(
        `${diag.join(" | ")} || pat-push failed: ${e instanceof Error ? e.message.split("\n").slice(0, 2).join(" ") : String(e)}`,
      );
    }
  }
  try {
    try {
      sh("git", ["checkout", "-b", branch]);
    } catch {
      sh("git", ["checkout", branch]);
    }
    const { existsSync: exists } = await import("node:fs");
    const candidates = [
      `public/ig/${contentId}-${issueArg}`,
      `public/fb/${contentId}-${issueArg}`,
      `docs/social-presence/publish/${contentId}-${issueArg}.md`,
      `docs/social-presence/publish/${contentId}-caption.txt`,
    ].filter((p) => exists(p));
    if (candidates.length === 0) {
      fail(
        issueArg,
        "Auto-packet stopped: packet build produced no files on disk. Inspect the packet logs and re-add `publish:approved`.",
      );
    }
    sh("git", ["add", ...candidates]);
    const staged = sh("git", ["diff", "--cached", "--name-only"]);
    if (!staged) {
      // Resume path: a previous run already committed this content.
      let remoteHas = false;
      try {
        sh("git", ["ls-remote", "--exit-code", "--heads", "origin", branch]);
        remoteHas = true;
      } catch {
        remoteHas = false;
      }
      if (!remoteHas) {
        fail(
          issueArg,
          "Auto-packet stopped: packet build produced no files (nothing staged). Inspect the packet logs and re-add `publish:approved`.",
        );
      }
      console.log(`resume - ${branch} already on origin, continuing to PR`);
    } else {
      sh("git", [
        "-c",
        "user.name=pantaleone-ai",
        "-c",
        "user.email=mdptrading@gmail.com",
        "commit",
        "-m",
        `feat(social): auto-packet ${contentId} for #${issueArg} (gallery-only)`,
      ]);
      gitPushWithFallback();
    }
  } catch (e) {
    fail(
      issueArg,
      `Auto-packet stopped at git/PR preparation: ${e instanceof Error ? e.message.split("\n").slice(0, 3).join(" ") : String(e)}. Re-add \`publish:approved\` to retry.`,
    );
  }
  // Idempotent re-runs: reuse the open PR for this branch if one exists.
  let prUrl: string;
  try {
    const existing = sh("gh", [
      "pr",
      "list",
      "--head",
      branch,
      "--state",
      "open",
      "--json",
      "url",
      "--jq",
      ".[0].url // empty",
    ]);
    if (existing) {
      prUrl = existing;
      console.log(`reusing open pr - ${prUrl}`);
    } else {
      prUrl = ghWrite([
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
    }
  } catch (e) {
    fail(
      issueArg,
      `Auto-packet stopped: could not open or find packet PR (${e instanceof Error ? e.message.split("\n")[0] : String(e)}). Re-add \`publish:approved\` to retry.`,
    );
  }
  // Wait for checks to stabilize before merging: --auto fails while checks
  // are still pending (UNSTABLE). Poll mergeStateStatus, then merge directly.
  {
    const waitDeadline = Date.now() + 12 * 60 * 1000;
    for (;;) {
      let status = "";
      try {
        status = sh("gh", [
          "pr",
          "view",
          prUrl,
          "--json",
          "mergeStateStatus,mergeable",
          "--jq",
          '[.mergeStateStatus,.mergeable] | join(" ")',
        ]);
      } catch (e) {
        fail(
          issueArg,
          `Auto-packet stopped: cannot read PR status (${prUrl}). Merge it manually; the packet will flip on merge.`,
        );
      }
      if (status.startsWith("CLEAN")) break;
      if (
        status.includes("DIRTY") ||
        status.includes("CONFLICTING") ||
        status.includes("BLOCKED")
      ) {
        fail(
          issueArg,
          `Auto-packet stopped: PR ${prUrl} is ${status} — resolve manually, then re-add \`publish:approved\`.`,
        );
      }
      if (Date.now() > waitDeadline) {
        fail(
          issueArg,
          `Auto-packet stopped: PR ${prUrl} checks never stabilized (${status}). Merge it manually; the packet will flip on merge.`,
        );
      }
      await new Promise((r) => setTimeout(r, 45000));
    }
  }
  ghWrite(["pr", "merge", prUrl, "--squash"]);
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
