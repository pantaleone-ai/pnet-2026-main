// Rule 1 (gallery-live) + Rule 2 (synthetic-proof) + Rule 3 (advertising-pass) auto-approval.
// Adds the existing `publish:approved` label when eligibility passes —
// no parallel trigger, downstream workflows unchanged.
// Run: npx tsx scripts/social-issues/publish/auto-approve.ts [--rule gallery-live|synthetic-proof|advertising-pass|all] [--dry-run] [--apply] [--limit 10]
// Default is dry-run (prints decisions + reasons, changes nothing).
// --apply writes labels (+ creates Rule 2 drafts born packet-ready).
// Idempotent: skips issues already approved / already proven / already reshared.
import { readFileSync, writeFileSync } from "node:fs";
import { gh, ghJson } from "../../content-issues/gh";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { AUTOMATION_POLICY } from "@/config/automation/policy";
import { evaluatePolicy, socialChecks } from "@/lib/automation/policy";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
import { titleMatchesArtwork } from "@/lib/social-growth/media-registry";
import { buildReshareBody, reshareScore } from "./reshare";
import { imagesFromBody } from "./publish-due";
import { channelForLabelNames, missingEnvs } from "./channels";
import {
  PANTA_RESHARE_CAPS,
} from "@/config/social-growth/cadence";
import { strategyFor } from "@/config/social-growth/product-matrix";

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
  closedAt?: string;
  updatedAt?: string;
}

function field(body: string, name: string): string {
  const m = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*` + "`([^`]+)`"));
  return m?.[1]?.trim() ?? "";
}

function hasProof(comments: Array<{ body: string }>): string | undefined {
  const hit = comments.find((c) => c.body.includes("Platform publish proof"));
  return hit?.body.match(
    /https:\/\/(www\.)?(instagram\.com|facebook\.com)\/\S+/,
  )?.[0];
}

function siteOf(i: IssueView): string {
  return (
    i.labels
      .find((l) => l.name.startsWith("site:"))
      ?.name.replace("site:", "") ?? ""
  );
}

function platformOf(i: IssueView): string {
  return (
    i.labels
      .find((l) => l.name.startsWith("platform:"))
      ?.name.replace("platform:", "") ?? ""
  );
}

function approved(i: IssueView): boolean {
  return i.labels.some((l) => l.name === "publish:approved");
}

/** Rule 1: artwork referenced by the issue is live in the gallery catalog. */
function galleryLive(body: string): boolean {
  const asset = field(body, "Source asset");
  if (!asset) return false;
  if (SYN_CATALOG.some((a) => asset.includes(a.id))) return true;
  const hook = field(body, "Hook");
  if (!hook) return false;
  return titleMatchesArtwork(
    hook,
    SYN_CATALOG.map((a) => a.descriptor),
  );
}

type ApprovalLog = {
  issue: number;
  source?: number;
  platform?: string;
  rule: string;
  date: string;
  policy: string;
};

function readLog(): ApprovalLog[] {
  try {
    const raw = JSON.parse(
      readFileSync("config/social-growth/pnt-reshare.json", "utf8"),
    ) as unknown;
    if (Array.isArray(raw)) return [];
    if (
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { approvals?: unknown }).approvals)
    ) {
      return (raw as { approvals: ApprovalLog[] }).approvals;
    }
    return [];
  } catch {
    return [];
  }
}

function appendLog(entries: ApprovalLog[]): void {
  const log = readLog();
  writeFileSync(
    "config/social-growth/pnt-reshare.json",
    `${JSON.stringify({ approvals: [...log, ...entries] }, null, 2)}\n`,
  );
}

function capOpen(
  platform: "facebook" | "instagram",
  recentReshares: Array<{ platform: string }>,
): { open: boolean; weekCount: number; platformCount: number } {
  const weekCount = recentReshares.length;
  const platformCount = recentReshares.filter(
    (e) => e.platform === platform,
  ).length;
  return {
    open:
      weekCount < PANTA_RESHARE_CAPS.maxPerWeekCombined &&
      platformCount < PANTA_RESHARE_CAPS.maxPerPlatformPerWeek,
    weekCount,
    platformCount,
  };
}

/**
 * Durable cap accounting: pantaleone reshare issues updated in the last 7d
 * that carry a publish proof. GitHub state is the source of truth — the local
 * ledger file is runner-ephemeral and audit-only.
 */
function recentPublishedReshares(now: number): Array<{ platform: string }> {
  const weekAgo = now - 7 * 86400000;
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--label",
    "site:pantaleone",
    "--state",
    "all",
    "--limit",
    "50",
    "--json",
    "number,title,labels,updatedAt",
  ]);
  const recent = issues
    .filter((i) => {
      if (!/reshare/i.test(i.title)) return false;
      if (!i.updatedAt) return false;
      return new Date(i.updatedAt).getTime() >= weekAgo;
    })
    .slice(0, 10);
  const out: Array<{ platform: string }> = [];
  for (const r of recent) {
    try {
      const full = ghJson<IssueView>([
        "issue",
        "view",
        String(r.number),
        "--json",
        "labels,comments,body",
      ]);
      if (!hasProof(full.comments)) continue;
      const p = platformOf({
        ...r,
        body: full.body,
        comments: full.comments,
        state: "",
      });
      if (p === "facebook" || p === "instagram") out.push({ platform: p });
    } catch {
      continue;
    }
  }
  return out;
}

async function rule1(apply: boolean, limit: number): Promise<void> {
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  let acted = 0;
  let shown = 0;
  for (const i of issues) {
    if (acted >= limit || shown >= limit) break;
    const names = i.labels.map((l) => l.name);
    if (siteOf(i) !== "synthetic-pics") continue;
    const platform = platformOf(i);
    if (platform !== "instagram" && platform !== "facebook") continue;
    if (!names.includes("status:packet-ready")) continue;
    if (approved(i)) continue;
    const proof = hasProof(i.comments);
    const channel = channelForLabelNames(names);
    const creds = channel ? missingEnvs(channel).length === 0 : false;
    const images = imagesFromBody(i.body);
    const live = galleryLive(i.body);
    const decision = evaluatePolicy({
      system: "social",
      channel: platform,
      rule: "gallery-live",
      autonomyLevel: 3,
      approvalPresent: true, // auto-label IS the approval; policy checks the rest
      checks: [
        ...socialChecks({
          open: i.state === "OPEN",
          packetReady: true,
          proofPresent: proof ? true : false,
          credsPresent: creds,
          imagesPresent: images.length > 0,
          mediaConflict: null, // publish-due enforces ledger at publish time
          capReached: null, // Rule 1 originals are throttled by the 12h claim cadence
          duplicateInProgress: null,
        }),
        { id: "gallery-live", ok: live, hard: true },
      ],
    });
    console.log(
      `#${i.number} gallery-live ${platform} live=${live} -> ${decision.decision} [${decision.reasonCodes.join(",")}]`,
    );
    shown += 1;
    if (decision.decision !== "allow") continue;
    // Copy audit: fail can never auto-approve (Rule 2 safeguard applies here too).
    const { auditSocialCopy } =
      await import("@/lib/social-growth/social-audit");
    const { suggestHashtags } = await import("@/lib/social-growth/caption");
    const tags = field(i.body, "Hashtags");
    const audit = await auditSocialCopy({
      hook: field(i.body, "Hook"),
      body: field(i.body, "Body"),
      cta: field(i.body, "CTA"),
      platform: platform as "instagram" | "facebook",
      pillar: field(i.body, "Social pillar") || undefined,
      hashtags:
        platform === "instagram"
          ? suggestHashtags(
              field(i.body, "Social pillar") || undefined,
              tags
                ? tags.split(/[\s,]+/).map((t) => t.replace(/^#/, ""))
                : undefined,
            )
          : [],
      sourceAsset: field(i.body, "Source asset") || undefined,
      destinationUrl: field(i.body, "Destination") || undefined,
    });
    if (audit.verdict === "fail") {
      console.log(
        `  audit-fail-skip - #${i.number}: ${audit.reasons.join(" | ")}`,
      );
      continue;
    }
    const auditNote =
      audit.verdict === "warn"
        ? ` Copy audit: warn (${audit.reasons.join("; ")}).`
        : "";
    if (!apply) {
      console.log(`  would-approve - #${i.number} (dry-run)${auditNote}`);
      continue;
    }
    gh([
      "issue",
      "comment",
      String(i.number),
      "--body",
      `Rule gallery-live auto-approval (policy ${decision.policy}): gallery artwork verified live, packet-ready with visuals, credentials present, no prior proof.${auditNote} Adding \`publish:approved\`. Reasons: ${decision.reasonCodes.join(", ") || "all checks pass"}.`,
    ]);
    gh(["issue", "edit", String(i.number), "--add-label", "publish:approved"]);
    console.log(`  approved - #${i.number}`);
    acted += 1;
  }
  if (acted === 0) console.log("(rule 1: nothing eligible)");
}

async function rule2(apply: boolean, limit: number): Promise<void> {
  const now = Date.now();
  const closed = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "closed",
    "--limit",
    "100",
    "--json",
    "number,title,state,labels,body,comments,closedAt",
  ]);
  const existing = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  const resharedSources = new Set(
    existing.flatMap((i) => {
      const m = i.body.match(/\*\*Reshare-Of:\*\*\s*`#(\d+)\//);
      return m?.[1] ? [m[1]] : [];
    }),
  );
  const candidates = closed
    .map((i) => {
      const srcSite = siteOf(i);
      if (!PANTA_RESHARE_CAPS.allowedSourceSites.includes(srcSite))
        return undefined;
      const srcPlatform = platformOf(i);
      if (srcPlatform !== "instagram" && srcPlatform !== "facebook")
        return undefined;
      const proof = hasProof(i.comments);
      if (!proof) return undefined;
      if (resharedSources.has(String(i.number))) return undefined;
      const ageH = i.closedAt
        ? (now - new Date(i.closedAt).getTime()) / 3600000
        : 999;
      if (ageH < PANTA_RESHARE_CAPS.minDelayHoursAfterSource) return undefined;
      const pri =
        i.labels
          .find((l) => /^spri:p[123]$/.test(l.name))
          ?.name.replace("spri:", "") ?? "p2";
      // p1-only: SOME means top priority sources, never p2/p3 auto-share.
      if (!PANTA_RESHARE_CAPS.autoPublishPriorities.includes(pri))
        return undefined;
      const images = imagesFromBody(i.body);
      if (images.length === 0) return undefined;
      // Best-fit target: same platform wins (native format preserved).
      const target = (
        srcPlatform === "instagram" || srcPlatform === "facebook"
          ? srcPlatform
          : "facebook"
      ) as "facebook" | "instagram";
      const contentId = (
        i.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ?? `issue-${i.number}`
      ).toLowerCase();
      return {
        issue: i,
        srcSite,
        srcPlatform,
        target,
        proof,
        images,
        contentId,
        score: reshareScore(srcSite, srcPlatform, pri, ageH / 24),
      };
    })
    .filter(Boolean) as Array<{
    issue: IssueView;
    srcSite: string;
    srcPlatform: string;
    target: "facebook" | "instagram";
    proof: string;
    images: string[];
    contentId: string;
    score: number;
  }>;
  candidates.sort((a, b) => b.score - a.score);
  const recentReshares = recentPublishedReshares(now);
  console.log(
    `cap state: ${recentReshares.length} published pantaleone reshares in last 7d (cap ${PANTA_RESHARE_CAPS.maxPerWeekCombined}/week, ${PANTA_RESHARE_CAPS.maxPerPlatformPerWeek}/platform)`,
  );
  let acted = 0;
  let shown = 0;
  const runReshares: Array<{ platform: string }> = [];
  for (const c of candidates) {
    if (acted >= limit || shown >= limit) break;
    shown += 1;
    const cap = capOpen(c.target, [...recentReshares, ...runReshares]);
    const channel = channelForLabelNames([`platform:${c.target}`]);
    const creds = channel ? missingEnvs(channel).length === 0 : false;
    const targetImages =
      c.target === "instagram" && c.images.length < 2
        ? [...c.images, ...c.images].slice(0, 2)
        : c.images;
    const decision = evaluatePolicy({
      system: "social",
      channel: c.target,
      rule: "synthetic-proof",
      autonomyLevel: 3,
      approvalPresent: true,
      checks: [
        ...socialChecks({
          open: true, // draft will be born open
          packetReady: true, // draft born packet-ready (visuals already live)
          proofPresent: false,
          credsPresent: creds,
          imagesPresent: targetImages.length > 0,
          mediaConflict: false, // reshareOf linkage permits cross-site reuse
          capReached: !cap.open,
          duplicateInProgress: resharedSources.has(String(c.issue.number)),
        }),
        {
          id: "synthetic-proof",
          ok: true,
          hard: true,
          detail: `source #${c.issue.number} proven`,
        },
      ],
    });
    console.log(
      `#${c.issue.number} synthetic-proof -> pantaleone/${c.target} score=${c.score} cap=${cap.weekCount}/${AUTOMATION_POLICY.social.caps.maxPerWeekCombined} -> ${decision.decision} [${decision.reasonCodes.join(",")}]`,
    );
    if (decision.decision !== "allow") continue;
    const srcApp = c.srcSite;
    // App page destination: source issue Destination, else the source app
    // domain from product-matrix (never pantaleone services).
    const dest =
      field(c.issue.body, "Destination") ||
      strategyFor(srcApp)?.domain ||
      "https://www.synthetic.pics";
    const appTag = `@${srcApp.replace(/-/g, "")}`;
    // Copy audit on the draft bridge copy: fail can never auto-approve.
    // Draft source fields mirror the future issue body 1:1 (see reshare.ts).
    const draftHook = field(c.issue.body, "Hook") || c.issue.title;
    const draftBodyText = field(c.issue.body, "Body") || "";
    const { auditSocialCopy: auditDraft } =
      await import("@/lib/social-growth/social-audit");
    const { suggestHashtags: suggestTags } =
      await import("@/lib/social-growth/caption");
    const draftAudit = await auditDraft({
      hook:
        draftHook.length > 100
          ? `${draftHook.slice(0, 99).trimEnd()}…`
          : draftHook,
      body: `${draftBodyText} Via ${appTag}.`,
      cta:
        field(c.issue.body, "CTA") ||
        strategyFor(srcApp)?.primaryCta ||
        "Explore the gallery",
      platform: c.target,
      pillar: "portfolio",
      hashtags: c.target === "instagram" ? suggestTags("portfolio", []) : [],
      sourceAsset: field(c.issue.body, "Source asset") || undefined,
      destinationUrl: dest,
    });
    if (draftAudit.verdict === "fail") {
      console.log(
        `  audit-fail-skip - #${c.issue.number}: ${draftAudit.reasons.join(" | ")}`,
      );
      continue;
    }
    const draftAuditNote =
      draftAudit.verdict === "warn"
        ? ` Copy audit: warn (${draftAudit.reasons.join("; ")}).`
        : "";
    const draft = buildReshareBody({
      sourceIssue: c.issue.number,
      sourceContentId: c.contentId,
      sourceApp: srcApp,
      sourcePlatform: c.srcPlatform,
      sourcePermalink: c.proof,
      hook: field(c.issue.body, "Hook") || c.issue.title,
      body: field(c.issue.body, "Body") || "",
      cta:
        field(c.issue.body, "CTA") ||
        strategyFor(srcApp)?.primaryCta ||
        "Explore the gallery",
      destinationBase: dest,
      images: targetImages,
      targetPlatform: c.target,
    });
    if (!apply) {
      console.log(
        `  would-create+approve - ${draft.title} (dry-run)${draftAuditNote}`,
      );
      continue;
    }
    const out = gh([
      "issue",
      "create",
      "--title",
      draft.title,
      "--body",
      `${draft.body}\n\nAuto-approved by synthetic-proof (policy ${decision.policy}): source #${c.issue.number} proven live, best-fit target pantaleone/${c.target}, cap ${cap.weekCount + 1}/${AUTOMATION_POLICY.social.caps.maxPerWeekCombined}.${draftAuditNote}`,
      "--label",
      "social",
      "--label",
      "site:pantaleone",
      "--label",
      `platform:${c.target}`,
      "--label",
      "status:packet-ready",
      "--label",
      "spri:p1",
      "--label",
      "spillar:portfolio",
      "--label",
      "needs-manual-post",
    ]);
    const created = Number((out.match(/\/issues\/(\d+)/) ?? [])[1] ?? 0);
    if (created) {
      gh(["issue", "edit", String(created), "--add-label", "publish:approved"]);
      resharedSources.add(String(c.issue.number));
      runReshares.push({ platform: c.target });
      appendLog([
        {
          issue: created,
          source: c.issue.number,
          platform: c.target,
          rule: "synthetic-proof",
          date: new Date().toISOString(),
          policy: decision.policy,
        },
      ]);
      console.log(`  created+approved - #${created} (from #${c.issue.number})`);
      acted += 1;
    }
  }
  if (acted === 0) console.log("(rule 2: nothing eligible)");
}

async function rule3(apply: boolean, limit: number): Promise<void> {
  if (!AUTOMATION_POLICY.social.advertising.autoAllowOnPass) {
    console.log("(rule 3: disabled by policy advertising.autoAllowOnPass=false)");
    return;
  }
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  let acted = 0;
  let shown = 0;
  for (const i of issues) {
    if (acted >= limit || shown >= limit) break;
    const names = i.labels.map((l) => l.name);
    if (!names.includes("status:packet-ready")) continue;
    if (approved(i)) continue;
    // Skip Rule 1/2 territory (synthetic-pics originals + reshares own those paths).
    if (siteOf(i) === "synthetic-pics") continue;
    const platform = platformOf(i);
    if (
      platform !== "instagram" &&
      platform !== "facebook" &&
      platform !== "pinterest" &&
      platform !== "x" &&
      platform !== "linkedin"
    )
      continue;
    const proof = hasProof(i.comments);
    if (proof) continue;
    const channel = channelForLabelNames(names);
    const creds = channel ? missingEnvs(channel).length === 0 : false;
    const images = imagesFromBody(i.body);
    const decision = evaluatePolicy({
      system: "social",
      channel: platform,
      rule: "advertising-pass",
      autonomyLevel: 3,
      approvalPresent: true,
      checks: [
        ...socialChecks({
          open: i.state === "OPEN",
          packetReady: true,
          proofPresent: false,
          credsPresent: creds,
          imagesPresent: images.length > 0,
          mediaConflict: null,
          capReached: null,
          duplicateInProgress: null,
        }),
      ],
    });
    if (decision.decision !== "allow") {
      shown += 1;
      continue;
    }
    const { auditSocialCopy } = await import("@/lib/social-growth/social-audit");
    const { suggestHashtags } = await import("@/lib/social-growth/caption");
    const auditPlatform =
      platform === "instagram" || platform === "facebook" ? platform : "instagram";
    const audit = await auditSocialCopy({
      hook: field(i.body, "Hook"),
      body: field(i.body, "Body"),
      cta: field(i.body, "CTA"),
      platform: auditPlatform,
      pillar: field(i.body, "Social pillar") || undefined,
      hashtags:
        auditPlatform === "instagram"
          ? suggestHashtags(field(i.body, "Social pillar") || undefined, undefined)
          : [],
      sourceAsset: field(i.body, "Source asset") || undefined,
      destinationUrl: field(i.body, "Destination") || undefined,
    });
    // Auto-allow ONLY on clean pass. Warn proceeds only for SYN+MIX pilot sites
    // (all other apps require pass). Fail always blocks.
    const pilot = siteOf(i) === "synthetic-pics" || siteOf(i) === "mixphd";
    void pilot;
    if (audit.verdict === "fail") {
      console.log(`  audit-fail-skip - #${i.number}: ${audit.reasons.join(" | ")}`);
      shown += 1;
      continue;
    }
    if (audit.verdict !== "pass") {
      console.log(`  audit-warn-skip - #${i.number}: ${audit.reasons.join(" | ")}`);
      shown += 1;
      continue;
    }
    console.log(`#${i.number} advertising-pass ${platform} -> allow [audit:pass]`);
    shown += 1;
    if (!apply) {
      console.log(`  would-approve - #${i.number} (dry-run, audit pass)`);
      continue;
    }
    gh([
      "issue",
      "comment",
      String(i.number),
      "--body",
      `Rule advertising-pass auto-approval (policy ${decision.policy}): packet-ready, audit pass, credentials + visuals present. Adding \`publish:approved\`.`,
    ]);
    gh(["issue", "edit", String(i.number), "--add-label", "publish:approved"]);
    console.log(`  approved - #${i.number}`);
    acted += 1;
  }
  if (acted === 0) console.log("(rule 3: nothing eligible)");
}

async function main(): Promise<void> {
  const rule = flag("--rule") || "all";
  const apply = process.argv.includes("--apply");
  const limit = Number(flag("--limit") || "10");
  console.log(
    `auto-approve policy=${AUTOMATION_POLICY.version} rule=${rule} mode=${apply ? "APPLY" : "dry-run"} limit=${limit}`,
  );
  if (rule === "gallery-live" || rule === "all") await rule1(apply, limit);
  if (rule === "synthetic-proof" || rule === "all") await rule2(apply, limit);
  if (rule === "advertising-pass" || rule === "all") await rule3(apply, limit);
  if (!apply)
    console.log(
      "dry-run: no labels added, no issues created. Re-run with --apply to act.",
    );
}

const isAutoApproveMain = (process.argv[1] ?? "").endsWith("auto-approve.ts");
if (isAutoApproveMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
