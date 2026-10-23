// Social copy audit CLI (report only by default; never rewrites copy).
// Run: npx tsx scripts/social-issues/social-audit.ts --issue <n> [--apply] [--repeat]
//      npx tsx scripts/social-issues/social-audit.ts --history <n> [--limit 30]
// --issue audits one issue's hook/body/CTA/caption. --apply marks needs_review
// on fail (and removes publish:approved so auto-approval cannot bypass it).
// --history audits recently published copy for calibration; never mutates.
import { gh, ghJson } from "../content-issues/gh";
import { buildCaption, suggestHashtags } from "@/lib/social-growth/caption";
import {
  auditSocialCopy,
  type AuditVerdict,
} from "@/lib/social-growth/social-audit";

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
  body: string;
  comments: Array<{ body: string }>;
  updatedAt?: string;
}

function field(body: string, name: string): string {
  const m = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*` + "`([^`]+)`"));
  return m?.[1]?.trim() ?? "";
}

function platformOf(i: IssueView): "instagram" | "facebook" | null {
  const names = i.labels.map((l) => l.name);
  if (names.includes("platform:instagram")) return "instagram";
  if (names.includes("platform:facebook")) return "facebook";
  return null;
}

function issueTags(body: string): string[] {
  return field(body, "Hashtags")
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, ""))
    .filter(Boolean);
}

async function recentTexts(exclude: number, limit = 30): Promise<string[]> {
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    String(limit),
    "--json",
    "number,title,body",
  ]);
  return issues
    .filter((i) => i.number !== exclude)
    .map((i) => `${field(i.body, "Hook")} ${field(i.body, "Body")}`)
    .filter((t) => t.trim().length > 0);
}

async function auditIssue(
  n: string,
  apply: boolean,
  withRepeat: boolean,
): Promise<AuditVerdict> {
  const i = ghJson<IssueView>([
    "issue",
    "view",
    n,
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  const platform = platformOf(i);
  if (!platform) {
    console.log(`skip - #${n}: not an instagram/facebook issue`);
    return "pass";
  }
  const pillar = field(i.body, "Social pillar");
  const tags =
    platform === "instagram"
      ? suggestHashtags(pillar || undefined, issueTags(i.body))
      : [];
  const composed = buildCaption({
    hook: field(i.body, "Hook"),
    body: field(i.body, "Body"),
    cta: field(i.body, "CTA") || "Learn more",
    destinationUrl: field(i.body, "Destination"),
    platform,
    pillar: pillar || undefined,
  });
  const result = await auditSocialCopy({
    hook: field(i.body, "Hook"),
    body: field(i.body, "Body"),
    cta: field(i.body, "CTA"),
    platform,
    pillar: pillar || undefined,
    hashtags: tags,
    sourceAsset: field(i.body, "Source asset") || undefined,
    destinationUrl: field(i.body, "Destination") || undefined,
    recentTexts: withRepeat ? await recentTexts(i.number) : undefined,
  });
  console.log(
    `#${i.number} ${platform} -> ${result.verdict} (engine: ${result.engineUsed ? "on" : "off"})`,
  );
  for (const r of result.reasons) console.log(`  ${r}`);
  void composed;
  if (result.verdict !== "fail" || !apply) {
    if (!apply) console.log("dry-run: no labels changed.");
    return result.verdict;
  }
  const names = i.labels.map((l) => l.name);
  gh([
    "issue",
    "comment",
    String(i.number),
    "--body",
    [
      `## Copy audit failed — needs_review`,
      ``,
      `Policy: social copy budgets + voice + source fidelity + anti-slop (scan only, no rewrites).`,
      ...result.reasons.map((r) => `- ${r}`),
      ``,
      `Fix the hook/body/CTA and re-run the audit. Publication and auto-approval are blocked until this passes.`,
    ].join("\n"),
  ]);
  if (!names.includes("needs_review"))
    gh(["issue", "edit", String(i.number), "--add-label", "needs_review"]);
  if (names.includes("publish:approved"))
    gh([
      "issue",
      "edit",
      String(i.number),
      "--remove-label",
      "publish:approved",
    ]);
  console.log(
    `blocked - #${i.number} labeled needs_review, publish:approved removed (if present).`,
  );
  return result.verdict;
}

async function history(limit: number): Promise<void> {
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "closed",
    "--limit",
    String(limit),
    "--json",
    "number,title,labels,body,comments",
  ]);
  let pass = 0;
  let warn = 0;
  let fail = 0;
  for (const i of issues) {
    const platform = platformOf(i);
    if (!platform) continue;
    if (!i.comments.some((c) => c.body.includes("Platform publish proof")))
      continue;
    const pillar = field(i.body, "Social pillar");
    const tags =
      platform === "instagram"
        ? suggestHashtags(pillar || undefined, issueTags(i.body))
        : [];
    const result = await auditSocialCopy({
      hook: field(i.body, "Hook"),
      body: field(i.body, "Body"),
      cta: field(i.body, "CTA"),
      platform,
      pillar: pillar || undefined,
      hashtags: tags,
      sourceAsset: field(i.body, "Source asset") || undefined,
      destinationUrl: field(i.body, "Destination") || undefined,
    });
    if (result.verdict === "pass") pass += 1;
    else if (result.verdict === "warn") warn += 1;
    else fail += 1;
    console.log(
      `#${i.number} -> ${result.verdict}: ${result.reasons.slice(0, 2).join(" | ") || "clean"}`,
    );
  }
  console.log(
    `\nhistory: pass=${pass} warn=${warn} fail=${fail} (read-only calibration, nothing changed)`,
  );
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const withRepeat = process.argv.includes("--repeat");
  const historyN = flag("--history");
  if (historyN) {
    await history(Number(historyN) || 25);
    return;
  }
  const n = flag("--issue");
  if (!n) {
    console.error(
      "Usage: social-audit.ts --issue <n> [--apply] [--repeat] | --history <n>",
    );
    process.exit(1);
  }
  const verdict = await auditIssue(n, apply, withRepeat);
  if (verdict === "fail" && !apply) process.exit(2);
}

const isMain = (process.argv[1] ?? "").endsWith("social-audit.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
