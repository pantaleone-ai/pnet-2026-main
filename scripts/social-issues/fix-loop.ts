// Social fix loop: detect + repair failed social-queue issues.
// Run: npx tsx scripts/social-issues/fix-loop.ts --scan [--dry-run] [--limit N]
//      npx tsx scripts/social-issues/fix-loop.ts --fix --issue <n> [--dry-run]
// --scan labels at most --limit (default 3) oldest-first issues with
// fix:requested + fix:<reason>. Skips published/proof-carrying issues,
// needs-human escalations, and soft-park channels (x/linkedin/reddit/
// youtube-shorts) which have no credentialed publisher yet and never fail.
// --fix applies deterministic scripted repairs only (no LLM, no publishing).
// Exit codes for --fix: 0 repaired/requeued (normal pipeline retries),
// 1 needs agent (opencode step), 2 needs human.
import { execFileSync } from "node:child_process";
import { gh, ghJson, hasLabel } from "../content-issues/gh";

const MAX_PER_RUN = 3;
const STALE_IN_PROGRESS_DAYS = 7;
const KILLED_RUN_HOURS = 6;

const ENFORCED_CHANNELS = [
  "platform:instagram",
  "platform:facebook",
  "platform:pinterest",
] as const;
const SOFT_PARK_PLATFORMS = [
  "platform:x",
  "platform:linkedin",
  "platform:reddit",
  "platform:youtube-shorts",
] as const;

type Reason =
  | "packet-build"
  | "visuals"
  | "pr-stall"
  | "slot-missing"
  | "publish-creds"
  | "stale-claim";

interface IssueView {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
  body: string;
  comments: Array<{ body: string }>;
  createdAt: string;
  updatedAt: string;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

function dryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function sh(file: string, args: string[]): { ok: boolean; out: string } {
  try {
    const out = execFileSync(file, args, {
      encoding: "utf8",
      cwd: process.cwd(),
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
    return { ok: true, out };
  } catch (e) {
    const err = e as { stdout?: unknown; stderr?: unknown; message?: string };
    const out = [err.stdout, err.stderr]
      .filter(Boolean)
      .join("\n")
      .toString()
      .slice(0, 800);
    return { ok: false, out: out || err.message || "unknown error" };
  }
}

function platformOf(names: string[]): string {
  return names.find((l) => l.startsWith("platform:")) ?? "";
}

function hasProof(issue: IssueView): boolean {
  return issue.comments.some((c) => c.body.includes("Platform publish proof"));
}

function lastBotLine(issue: IssueView): string {
  const bots = issue.comments.filter((c) =>
    /Auto-packet|Packet ready|Slot publish failed|Publish blocked|Copy audit failed/i.test(
      c.body,
    ),
  );
  const last = bots.length > 0 ? (bots[bots.length - 1]?.body ?? "") : "";
  return last.split("\n")[0]?.slice(0, 200) ?? "see history";
}

function openPacketPr(branch: string): string {
  const r = sh("gh", [
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
  return r.ok ? r.out : "";
}

function contentIdOf(issue: IssueView): string {
  return (
    issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase() ??
    `content-${issue.number}`
  );
}

/** Classify an open social issue. Returns null when nothing needs fixing. */
function detect(issue: IssueView): Reason | null {
  const names = issue.labels.map((l) => l.name);
  if (issue.state !== "OPEN") return null;
  if (
    names.includes("status:published") ||
    names.includes("status:done") ||
    names.includes("needs-human") ||
    names.includes("needs-manual-post")
  )
    return null;
  if (hasProof(issue)) return null;
  const plat = platformOf(names);
  if ((SOFT_PARK_PLATFORMS as readonly string[]).includes(plat)) return null;
  if (plat !== "" && !(ENFORCED_CHANNELS as readonly string[]).includes(plat))
    return null;

  const bodies = issue.comments.map((c) => c.body).join("\n---\n");
  if (/Auto-packet stopped at packet build/.test(bodies)) return "packet-build";
  if (
    /Auto-packet stopped at visual build/.test(bodies) ||
    names.includes("needs-asset")
  )
    return "visuals";
  if (
    /Auto-packet stopped: PR/.test(bodies) ||
    /checks never stabilized/.test(bodies) ||
    /did not merge/.test(bodies) ||
    /cannot read PR status/.test(bodies)
  )
    return "pr-stall";
  if (/Slot publish failed/.test(bodies)) return "slot-missing";
  if (
    /Publish blocked/.test(bodies) &&
    /Missing credentials/.test(bodies) &&
    (ENFORCED_CHANNELS as readonly string[]).includes(plat)
  )
    return "publish-creds";
  if (/Copy audit failed/.test(bodies) || names.includes("needs_review"))
    return "packet-build";

  const ageMs = Date.now() - new Date(issue.updatedAt).getTime();
  const branch = `social/${issue.number}-${contentIdOf(issue)}`;
  if (
    names.includes("status:in-progress") &&
    /Auto-packet started/.test(bodies) &&
    !/Auto-packet (complete|stopped)/.test(bodies) &&
    ageMs > KILLED_RUN_HOURS * 3600 * 1000 &&
    !openPacketPr(branch)
  )
    return "pr-stall";
  if (
    names.includes("status:in-progress") &&
    ageMs > STALE_IN_PROGRESS_DAYS * 86400 * 1000 &&
    !openPacketPr(branch)
  )
    return "stale-claim";
  return null;
}

function clearFixLabels(issue: number, reason: string): void {
  gh([
    "issue",
    "edit",
    String(issue),
    "--remove-label",
    "fix:requested",
    "--remove-label",
    `fix:${reason}`,
    "--remove-label",
    "fix:attempt-1",
    "--remove-label",
    "fix:attempt-2",
  ]);
}

function ensureQueued(issue: number): void {
  const view = ghJson<IssueView>([
    "issue",
    "view",
    String(issue),
    "--json",
    "labels",
  ]);
  const names = view.labels.map((l) => l.name);
  const args = ["issue", "edit", String(issue)];
  if (names.includes("status:in-progress"))
    args.push("--remove-label", "status:in-progress");
  if (!names.includes("status:queued"))
    args.push("--add-label", "status:queued");
  if (args.length > 3) gh(args);
}

function scan(): void {
  const limit = Number(flag("--limit") || String(MAX_PER_RUN));
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,state,labels,body,comments,createdAt,updatedAt",
  ]);
  const pri = (i: IssueView): number => {
    const n = i.labels.map((l) => l.name);
    if (n.includes("spri:p1")) return 0;
    if (n.includes("spri:p2")) return 1;
    return 2;
  };
  const hits: Array<{ issue: IssueView; reason: Reason }> = [];
  for (const issue of issues) {
    if (hasLabel(issue as never, "fix:requested")) continue;
    const reason = detect(issue);
    if (reason) hits.push({ issue, reason });
  }
  hits.sort(
    (a, b) =>
      pri(a.issue) - pri(b.issue) ||
      new Date(a.issue.createdAt).getTime() -
        new Date(b.issue.createdAt).getTime(),
  );
  const picked = hits.slice(0, Math.min(limit, MAX_PER_RUN));
  for (const { issue, reason } of picked) {
    if (dryRun()) {
      console.log(
        `would-flag - #${issue.number} fix:${reason} (${issue.title.slice(0, 70)})`,
      );
      continue;
    }
    gh([
      "issue",
      "comment",
      String(issue.number),
      "--body",
      [
        `## Fix loop queued — \`${reason}\``,
        ``,
        `Last failure: ${lastBotLine(issue)}`,
        ``,
        `Next: scripted pre-fix runs first; an agent repair follows only if that fails. Max 2 agent attempts, then \`needs-human\`.`,
      ].join("\n"),
    ]);
    gh([
      "issue",
      "edit",
      String(issue.number),
      "--add-label",
      "fix:requested",
      "--add-label",
      `fix:${reason}`,
    ]);
    console.log(`flagged - #${issue.number} fix:${reason}`);
  }
  console.log(
    `\nfix-loop scan: detected=${hits.length} flagged=${picked.length} mode=${dryRun() ? "dry-run" : "APPLY"}`,
  );
}

function failHuman(issue: number, reason: string, text: string): never {
  if (dryRun()) {
    console.log(
      `would-escalate - #${issue} needs-human: ${text.split("\n")[0]}`,
    );
    process.exit(2);
  }
  gh(["issue", "comment", String(issue), "--body", text]);
  gh([
    "issue",
    "edit",
    String(issue),
    "--remove-label",
    "fix:requested",
    "--remove-label",
    `fix:${reason}`,
    "--add-label",
    "needs-human",
  ]);
  console.error(`needs-human - #${issue}: ${text.split("\n")[0]}`);
  process.exit(2);
}

function failAgent(issue: number, reason: string, text: string): never {
  if (dryRun()) {
    console.log(
      `would-need-agent - #${issue} fix:${reason}: ${text.split("\n")[0]}`,
    );
    process.exit(1);
  }
  gh(["issue", "comment", String(issue), "--body", text]);
  console.error(`needs-agent - #${issue}: ${text.split("\n")[0]}`);
  process.exit(1);
}

function doneFix(issue: number, reason: string, text: string): never {
  if (dryRun()) {
    console.log(
      `would-resolve - #${issue} fix:${reason}: ${text.split("\n")[0]}`,
    );
    process.exit(0);
  }
  gh(["issue", "comment", String(issue), "--body", text]);
  clearFixLabels(issue, reason);
  ensureQueued(issue);
  console.log(
    `repaired - #${issue} fix:${reason} (requeued for nightly packet)`,
  );
  process.exit(0);
}

function fix(): void {
  const issueArg = flag("--issue");
  if (!issueArg) {
    console.error("Usage: fix-loop.ts --fix --issue <n> [--dry-run]");
    process.exit(2);
  }
  const issue = ghJson<IssueView>([
    "issue",
    "view",
    issueArg,
    "--json",
    "number,title,state,labels,body,comments,createdAt,updatedAt",
  ]);
  const names = issue.labels.map((l) => l.name);
  if (!names.includes("fix:requested")) {
    console.log(`nothing-to-do - #${issue.number} (no fix:requested label)`);
    process.exit(0);
  }
  const reason = (names
    .find((l) => l.startsWith("fix:") && l !== "fix:requested")
    ?.replace(/^fix:/, "") ??
    detect(issue) ??
    "packet-build") as Reason;
  if (/pina_|sk-(live|test)|BEGIN.*KEY/i.test(issue.body)) {
    failHuman(
      issue.number,
      reason,
      `## Fix loop stopped — secrets in issue body\n\nRemove the secret from #${issue.number} manually. No automated fix runs on secret-bearing issues.`,
    );
  }

  if (reason === "stale-claim") {
    doneFix(
      issue.number,
      reason,
      `## Fix loop — stale claim requeued\n\nNo open packet PR and no activity for 7d+. Returned to \`status:queued\`; the nightly packet loop will reclaim it.`,
    );
  }

  if (reason === "visuals") {
    const r = sh("npx", [
      "tsx",
      "scripts/social-issues/build-visuals.ts",
      "--issue",
      String(issue.number),
      ...(dryRun() ? [] : ["--write"]),
    ]);
    if (r.ok) {
      doneFix(
        issue.number,
        reason,
        `## Fix loop — visuals rebuilt\n\nCard render + **Images:** stamp verified. Requeued for nightly packet.\n\n\`${(r.out.split("\n")[0] ?? "").slice(0, 200)}\``,
      );
    }
    if (
      /needs-asset|not in catalog|no named artworks|not a public URL/i.test(r.out)
    ) {
      failHuman(
        issue.number,
        reason,
        `## Fix loop stopped — missing source asset\n\nThe card pipeline cannot invent imagery:\n\n\`${r.out.split("\n").slice(0, 4).join("\n")}\`\n\nName a real gallery/product/recipe asset (or hero image URL) on the issue and re-add \`fix:requested\`.`,
      );
    }
    failAgent(
      issue.number,
      reason,
      `## Fix loop — visuals need agent repair\n\nScripted card rebuild failed:\n\n\`${r.out.split("\n").slice(0, 4).join("\n")}\``,
    );
  }

  if (reason === "packet-build") {
    const r = sh("npx", [
      "tsx",
      "scripts/social-issues/build-packet.ts",
      "--issue",
      String(issue.number),
      ...(dryRun() ? ["--dry-run"] : ["--write"]),
    ]);
    if (r.ok && /gate:\s*PASS/i.test(r.out)) {
      doneFix(
        issue.number,
        reason,
        `## Fix loop — packet gate passes\n\nPacket rebuild verified (hook/CTA/UTM/creative). Requeued for nightly packet+merge.`,
      );
    }
    failAgent(
      issue.number,
      reason,
      `## Fix loop — packet needs agent repair\n\nPacket gate still failing:\n\n\`${r.out.split("\n").slice(-6).join("\n").slice(0, 600)}\``,
    );
  }

  if (reason === "pr-stall") {
    const branch = `social/${issue.number}-${contentIdOf(issue)}`;
    const pr = openPacketPr(branch);
    if (!pr) {
      doneFix(
        issue.number,
        reason,
        `## Fix loop — stalled packet requeued\n\nNo open packet PR for \`${branch}\`; prior attempt left nothing to resume. Returned to \`status:queued\`.`,
      );
    }
    failAgent(
      issue.number,
      reason,
      `## Fix loop — packet PR needs agent review\n\nOpen PR: ${pr}\n\nInspect checks/mergeability; merge if CLEAN or rebase and re-run packet. Do not open a second PR for \`${branch}\`.`,
    );
  }

  if (reason === "slot-missing") {
    const slot = issue.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1];
    if (slot) {
      doneFix(
        issue.number,
        reason,
        `## Fix loop — slot present, requeued\n\n**Publish at:** \`${slot}\` is stamped; the next slot run retries publishing.`,
      );
    }
    const r = sh("npx", [
      "tsx",
      "scripts/social-issues/schedule-queue.ts",
      ...(dryRun() ? [] : ["--write"]),
    ]);
    if (r.ok) {
      doneFix(
        issue.number,
        reason,
        `## Fix loop — slots restamped\n\nRan schedule-queue; the next slot/FB/Pinterest step picks this up.`,
      );
    }
    failAgent(
      issue.number,
      reason,
      `## Fix loop — scheduling needs agent review\n\nschedule-queue failed:\n\n\`${r.out.slice(0, 400)}\``,
    );
  }

  if (reason === "publish-creds") {
    const plat = platformOf(names);
    const reqEnvs =
      plat === "platform:pinterest"
        ? ["PINTEREST_ACCESS_TOKEN"]
        : ["META_CAPI_ACCESS_TOKEN"];
    const missing = reqEnvs.filter((k) => !process.env[k]);
    if (missing.length === 0) {
      const r = sh("npx", [
        "tsx",
        "scripts/social-issues/publish/publish-due.ts",
        "--issue",
        String(issue.number),
        "--dry-run",
      ]);
      if (r.ok && /would-publish/i.test(r.out)) {
        doneFix(
          issue.number,
          reason,
          `## Fix loop — credentials present, block is stale\n\nDry-run publish resolves (${(r.out.split("\n")[0] ?? "").slice(0, 160)}). Left packet-ready for the next publish step.`,
        );
      }
      failAgent(
        issue.number,
        reason,
        `## Fix loop — publish still blocked with creds present\n\n\`${r.out.slice(0, 400)}\``,
      );
    }
    failHuman(
      issue.number,
      reason,
      `## Fix loop stopped — channel credential missing\n\n\`${missing.join(", ")}\` is not set where publishing runs. Mint it per docs/SOCIAL_PUBLISHING.md, add it to the Actions secrets, and re-add \`fix:requested\`. The agent never invents credentials.`,
    );
  }

  failAgent(
    issue.number,
    reason,
    `## Fix loop — unhandled reason \`${reason}\`, needs agent review.`,
  );
}

function main(): void {
  if (process.argv.includes("--scan")) {
    scan();
    return;
  }
  if (process.argv.includes("--fix")) {
    fix();
    return;
  }
  console.error(
    "Usage: fix-loop.ts --scan [--dry-run] [--limit N] | --fix --issue <n> [--dry-run]",
  );
  process.exit(2);
}

main();
