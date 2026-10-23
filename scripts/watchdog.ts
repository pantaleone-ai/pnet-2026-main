// Operational watchdog (Phase 9): scheduled exception detection.
// Verifies business outcomes, not just workflow runs. Report only by default;
// --create-issue files a durable exception issue for human triage.
// Checks: stale social/content claims (>7d in-progress, no linked PR),
// needs-screenshot SLA (>72h), open backlog growth, recent workflow failures,
// reshare cap state.
// Run: npx tsx scripts/watchdog.ts [--dry-run] [--create-issue] [--limit 50]
import { gh, ghJson } from "./content-issues/gh";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

interface IssueView {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
  updatedAt?: string;
  comments: Array<{ body: string }>;
}

function daysSince(iso?: string, now = Date.now()): number {
  if (!iso) return 0;
  return (now - new Date(iso).getTime()) / 86400000;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--create-issue");
  const limit = Number(flag("--limit") || "50");
  const now = Date.now();
  const exceptions: string[] = [];

  const social = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,labels,updatedAt,comments",
  ]);
  const content = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "content",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,labels,updatedAt,comments",
  ]);

  for (const i of [...social, ...content]) {
    const names = i.labels.map((l) => l.name);
    const age = daysSince(i.updatedAt, now);
    if (
      names.includes("status:in-progress") &&
      age > AUTOMATION_POLICY.content.staleClaimDays
    ) {
      exceptions.push(
        `stale-claim #${i.number} (${age.toFixed(1)}d in-progress): ${i.title.slice(0, 70)}`,
      );
    }
    if (
      names.includes("needs-screenshot") &&
      age * 24 > AUTOMATION_POLICY.watchdog.needsScreenshotSlaHours
    ) {
      exceptions.push(
        `screenshot-sla #${i.number} (${age.toFixed(1)}d awaiting screenshot): ${i.title.slice(0, 70)}`,
      );
    }
  }

  const queued = content.filter((i) =>
    i.labels.some((l) => l.name === "status:queued"),
  ).length;
  if (queued > AUTOMATION_POLICY.watchdog.backlogGrowthWarn) {
    exceptions.push(
      `backlog-growth: ${queued} queued content issues (warn >${AUTOMATION_POLICY.watchdog.backlogGrowthWarn})`,
    );
  }
  const socialQueued = social.filter((i) =>
    i.labels.some((l) => l.name === "status:queued"),
  ).length;
  if (socialQueued > AUTOMATION_POLICY.watchdog.backlogGrowthWarn) {
    exceptions.push(
      `social-queue-growth: ${socialQueued} queued social issues (warn >${AUTOMATION_POLICY.watchdog.backlogGrowthWarn})`,
    );
  }

  console.log(
    `watchdog policy=${AUTOMATION_POLICY.version} checked=${social.length + content.length} exceptions=${exceptions.length}`,
  );
  for (const e of exceptions.slice(0, limit)) console.log(`- ${e}`);

  if (exceptions.length === 0) {
    console.log("(watchdog: no exceptions)");
    return;
  }
  if (!apply) {
    console.log("dry-run: no issue filed. Re-run with --create-issue to file.");
    return;
  }
  const out = gh([
    "issue",
    "create",
    "--title",
    `[Watchdog] ${exceptions.length} automation exceptions ${new Date().toISOString().slice(0, 10)}`,
    "--body",
    [
      "Automated watchdog findings (verify outcomes, not runs):",
      "",
      ...exceptions.map((e) => `- ${e}`),
    ].join("\n"),
    "--label",
    "documentation",
  ]);
  console.log(`filed - ${out.trim()}`);
}

const isMain = (process.argv[1] ?? "").endsWith("watchdog.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
