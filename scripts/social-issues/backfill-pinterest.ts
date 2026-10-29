// Pinterest library backfill: one pin issue per catalog artwork that has no
// pin coverage yet (gallery-sync only covers uncataloged art; this covers
// the rest of the library). Idempotent: skips IDs referenced by any
// platform:pinterest issue. Pillar rotates portfolio/discovery/use-case so
// pins distribute across the Generative/Decor/Moodboards boards via the
// pillar fallback in publish/pinterest-boards.ts.
// Copy is deterministic from catalog descriptors and audit-gated
// (fail => skipped, never published).
// Run: npx tsx scripts/social-issues/backfill-pinterest.ts [--apply] [--limit 7]
import { gh, ghJson } from "../content-issues/gh";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
import { auditSocialCopy } from "@/lib/social-growth/social-audit";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

interface IssueRef {
  number: number;
  body: string;
  labels: Array<{ name: string }>;
}

function cap(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const PILLARS = ["portfolio", "discovery", "use-case"] as const;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const limit = Number(flag("--limit") || "7");
  console.log(
    `backfill-pinterest policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} limit=${limit}`,
  );
  if (apply && !AUTOMATION_POLICY.social.nightly.enabled) {
    console.log(
      "nightly automation disabled by policy (social.nightly.enabled=false); dry-run only.",
    );
    return;
  }
  const issues = ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,body,labels",
  ]);
  const pinReferenced = new Set<string>();
  for (const i of issues) {
    if (!(i.labels ?? []).some((l) => l.name === "platform:pinterest"))
      continue;
    for (const m of i.body.matchAll(/20\d\d-\d\d-\d\d-[a-z0-9-]+/g))
      pinReferenced.add(m[0]);
  }
  const gaps = SYN_CATALOG.filter((a) => !pinReferenced.has(a.id));
  console.log(
    `catalog=${SYN_CATALOG.length} pin-covered=${SYN_CATALOG.length - gaps.length} gaps=${gaps.length}`,
  );
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  let created = 0;
  let skipped = 0;
  let n = 0;
  for (const art of gaps) {
    if (created + skipped >= limit) break;
    n += 1;
    const words = art.descriptor.split(/\s+/).filter(Boolean);
    const concept = ((words[0] ?? "art").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "ART");
    const pillar = PILLARS[n % PILLARS.length] as string;
    const hook = `${cap(words.slice(0, 4).join(" "))}.`;
    const body = `A ${words.slice(0, 3).join(" ")} study from the gallery floor.`;
    const campaign = `SYN_PIN_DISCOVERY_ARTBUYERS_US_${yyyymm}`;
    const creative = `SYN_${concept}_PIN_V1`;
    const url = `https://www.synthetic.pics?utm_source=pinterest&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${creative}`;
    const audit = await auditSocialCopy({
      hook,
      body,
      cta: "Explore the gallery",
      platform: "facebook",
      pillar,
      hashtags: [],
      sourceAsset: `Gallery artwork: ${art.id}`,
      destinationUrl: url,
    });
    if (audit.verdict === "fail") {
      console.log(`skip ${art.id}: audit fail: ${audit.reasons.join(" | ")}`);
      skipped += 1;
      continue;
    }
    const contentId = `syn-pin-${art.id}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    const title = `[Social] ${contentId} — ${hook.length > 60 ? `${hook.slice(0, 60).trimEnd()}…` : hook}`;
    const issueBody = [
      `**App:** \`synthetic-pics\``,
      `**Platform:** \`pinterest\``,
      `**Social pillar:** \`${pillar}\``,
      `**Content type:** \`pin\``,
      `**Content ID:** \`${contentId}\``,
      `**Hook:** \`${hook}\``,
      `**Body:** \`${body}\``,
      `**CTA:** \`Explore the gallery\``,
      `**Destination:** \`${url}\``,
      `**Media:** \`Single 1000x1500 pin card from gallery artwork (portrait JPEG, native pin)\``,
      `**Campaign:** \`${campaign}\``,
      `**Creative:** \`${creative}\``,
      `**Priority:** \`p3\``,
      `**Audience:** \`Art browsers\``,
      `**Source asset:** \`Gallery artwork: ${art.id}\``,
      ``,
      `Pinterest library backfill (policy ${AUTOMATION_POLICY.version}): catalog art first seen ${art.firstSeen}.` +
        (audit.verdict === "warn"
          ? ` Copy audit: warn (${audit.reasons.join(";")}).`
          : ""),
    ].join("\n");
    if (!apply) {
      console.log(`would-create - ${title} [pin/${pillar}]`);
      continue;
    }
    const out = gh([
      "issue",
      "create",
      "--title",
      title,
      "--body",
      issueBody,
      "--label",
      "social",
      "--label",
      "site:synthetic-pics",
      "--label",
      "platform:pinterest",
      "--label",
      "status:queued",
      "--label",
      "spri:p3",
      "--label",
      `spillar:${pillar}`,
    ]);
    console.log(`created - ${out.trim()} : ${contentId} [${pillar}]`);
    created += 1;
    pinReferenced.add(art.id);
  }
  console.log(
    `done: created=${created} skipped=${skipped} (dry-run: no writes)`,
  );
}

const isMain = (process.argv[1] ?? "").endsWith("backfill-pinterest.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
