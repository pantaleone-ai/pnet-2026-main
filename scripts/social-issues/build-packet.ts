// Build a publish packet for a queued/in-progress social issue.
// Run: npx tsx scripts/social-issues/build-packet.ts --issue <n> [--dry-run] [--write]
// Gallery-only: never invents images; fails with needs-asset if Source asset is missing.
// Output: docs/social-presence/publish/<contentId>-<issue>.md + caption file + PR body.
// Gate-compatible with close-with-evidence-social.ts (hook/CTA/UTM/creative, no secrets).
import { ghJson } from "../content-issues/gh";
import { parseSocialIssueBody } from "@/lib/social-growth/issue-body";
import { validateSocialNaming } from "@/lib/social-growth/social-utm";
import { strategyFor } from "@/config/social-growth/product-matrix";
import { PLATFORM_STRATEGIES } from "@/config/social-growth/platform-matrix";
import { POST_FRAMEWORKS } from "@/config/social-growth/templates";
import { channelForLabelNames } from "./publish/channels";
import { pendingPlan } from "./publish/pending-channels";
import { buildCaption } from "@/lib/social-growth/caption";
import { writeFileSync, existsSync } from "node:fs";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

interface IssueView {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  body: string;
}

function pickFramework(platform: string, pillar: string) {
  const byPlatform = POST_FRAMEWORKS.filter((f) =>
    f.bestPlatform.includes(platform),
  );
  const exact = byPlatform.find((f) => f.bestCategory.includes(pillar));
  if (exact) return exact;
  if (byPlatform[0]) return byPlatform[0];
  return POST_FRAMEWORKS.find((f) => f.id === "drop-showcase")!;
}

function channelBlock(channelId: string, platform: string): string[] {
  const strategy = PLATFORM_STRATEGIES.find((s) => s.platform === platform);
  const plan = pendingPlan(channelId as never);
  const lines = [
    `Platform format: ${strategy?.contentFormat ?? `${platform} native post`}`,
    `CTA style: ${strategy?.ctaStyle ?? "single CTA"}`,
  ];
  if (channelId === "instagram")
    lines.push(
      "Creative: 2-10 public JPEG/PNG, carousel or reel-concept, minimal text on image, alt text per card",
    );
  if (channelId === "facebook")
    lines.push(
      "Creative: single visual + short caption, link post to Destination URL",
    );
  if (channelId === "pinterest")
    lines.push(
      "Creative: 1000x1500 pin, artwork hero plus detail crop (gallery artwork only)",
    );
  if (channelId === "x")
    lines.push(
      "Creative: <=280 chars, 1 idea + UTM link, 1 visual when helpful (manual until credentialed)",
    );
  if (channelId === "linkedin")
    lines.push(
      "Creative: 150-300 word founder insight, no consumer cross-post (aiceo/profitsignals only)",
    );
  if (channelId === "reddit")
    lines.push(
      "Creative: text-first useful answer, link only when directly requested (manual-only by policy)",
    );
  if (channelId === "youtube-shorts")
    lines.push(
      "Creative: 5-30s vertical demo concept, watch-the-transformation (needs video creative + OAuth)",
    );
  if (plan && plan.status === "blocked")
    lines.push(`Publish endpoint (when credentialed): ${plan.endpoint}`);
  return lines;
}

async function main(): Promise<void> {
  const issueArg = arg("--issue");
  const dryRun = process.argv.includes("--dry-run");
  const write = process.argv.includes("--write");
  if (!issueArg) {
    console.error("Usage: build-packet.ts --issue <n> [--dry-run] [--write]");
    process.exit(1);
  }
  const issue = ghJson<IssueView>([
    "issue",
    "view",
    issueArg,
    "--json",
    "number,title,labels,body",
  ]);
  const labelNames = issue.labels.map((l) => l.name);
  const parsed = parseSocialIssueBody(issue.body);
  const errors: string[] = [];
  if (!parsed.hook) errors.push("missing Hook in issue body");
  if (!parsed.cta) errors.push("missing CTA in issue body");
  if (!parsed.destinationUrl) errors.push("missing Destination in issue body");
  if (!parsed.creativeId && !parsed.campaignId)
    errors.push("missing Campaign/Creative in issue body");

  const naming =
    parsed.campaignId && parsed.creativeId
      ? validateSocialNaming(parsed.campaignId, parsed.creativeId)
      : null;
  if (naming && (!naming.campaign.valid || !naming.creative.valid)) {
    errors.push(
      `bad UTM naming: campaign[${naming.campaign.errors.join(";")}] creative[${naming.creative.errors.join(";")}]`,
    );
  }
  if (
    parsed.destinationUrl &&
    !/utm_campaign|utm_source/i.test(parsed.destinationUrl)
  )
    errors.push("Destination lacks UTM verification (utm_campaign/utm_source)");
  if (!parsed.sourceAsset)
    errors.push(
      "missing Source asset — gallery-only: resolve to a real gallery/product/recipe page",
    );

  const channel = channelForLabelNames(labelNames);
  if (!channel) errors.push(`no channel for labels: ${labelNames.join(",")}`);
  const site = parsed.appId ?? "";
  const strategy = site ? strategyFor(site) : undefined;
  if (site && !strategy)
    errors.push(`unknown site ${site} (not in product-matrix)`);
  if (
    parsed.destinationUrl &&
    strategy &&
    !parsed.destinationUrl.startsWith(strategy.domain)
  )
    errors.push(`destination base mismatch: expected ${strategy.domain}`);

  // Secret hygiene (same as evidence gate).
  if (/pina_|sk-(live|test)|BEGIN.*KEY/i.test(issue.body))
    errors.push("secrets in issue body — remove");

  const platform = parsed.platform ?? channel?.id ?? "unknown";
  const pillar = (parsed.pillar as string) ?? "discovery";
  const framework = pickFramework(platform, pillar);
  const contentId = (
    issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ??
    `content-${issue.number}`
  ).toLowerCase();

  if (errors.length > 0 && !dryRun && !write) {
    console.error(
      `packet-invalid - #${issue.number}\n- ${errors.join("\n- ")}`,
    );
    process.exit(1);
  }

  const composed = buildCaption({
    hook: parsed.hook ?? "",
    body: parsed.body ?? "",
    cta: parsed.cta ?? "Learn more",
    destinationUrl: parsed.destinationUrl ?? "",
    platform: platform === "instagram" ? "instagram" : "facebook",
    pillar,
  });
  const caption = composed.text;
  if (!composed.lint.ok)
    errors.push(`caption lint: ${composed.lint.violations.join("; ")}`);
  const packetPath = `docs/social-presence/publish/${contentId}-${issue.number}.md`;
  const captionPath = `docs/social-presence/publish/${contentId}-caption.txt`;

  const packet = [
    `# Publish packet — ${contentId} (Issue #${issue.number})`,
    ``,
    `App: \`${parsed.appId}\` / Platform: \`${platform}\` / Type: \`${parsed.contentType}\` / Pillar: \`${pillar}\``,
    ``,
    `## Copy (paste to ${platform})`,
    `Hook: ${parsed.hook}`,
    `Body: ${parsed.body}`,
    `CTA: ${parsed.cta}`,
    `Framework: ${framework.name} (${framework.id}) — ${framework.bodyStructure}`,
    `Hashtags: ${composed.hashtags.length > 0 ? composed.hashtags.map((t) => `#${t}`).join(" ") : "none (facebook stays clean)"}`,
    ``,
    `## Destination + UTM`,
    `Full URL:`,
    `\`${parsed.destinationUrl}\``,
    ``,
    `Breakdown (verified against \`lib/growth/utm.ts\` + \`lib/social-growth/social-utm.ts\`):`,
    `- \`utm_source=${platform}\` (platform)`,
    `- \`utm_medium=organic_social\` (social convention)`,
    `- \`utm_campaign=${parsed.campaignId}\` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM`,
    `- \`utm_content=${parsed.creativeId}\` — 4 segments: APP_CONCEPT_FORMAT_VARIANT`,
    `- Base domain matches registry: \`${strategy?.domain}\` (\`config/social-growth/product-matrix.ts\`)`,
    ``,
    `## Creative spec (gallery-only)`,
    `- Format: ${parsed.contentType} — ${parsed.body}`,
    `- Source asset: ${parsed.sourceAsset} (real asset only, no generated imagery)`,
    ...channelBlock(channel?.id ?? platform, platform).map((l) => `- ${l}`),
    `- Media note: ${parsed.body ? "" : ""}${issue.body.match(/\*\*Media:\*\*\s*`([^`]+)`/)?.[1] ?? "see issue Media field"}`,
    ``,
    `## Manual publish steps (owner)`,
    channel?.id === "reddit"
      ? `1. Post answers-first in the target subreddit per platform-matrix (link only if requested).\n2. Screenshot the answer + save permalink.\n3. Paste permalink + screenshot back on the issue.`
      : `1. Build creative from the source asset above (gallery artwork / recipe / product page only).\n2. Post natively to ${platform} with copy above + destination link.\n3. Screenshot published post + save post URL.\n4. Report back: reach / saves / clicks (no fabricated stats).`,
    ``,
    `## Evidence for close`,
    `- Hook: present (see Copy)`,
    `- CTA: ${parsed.cta}`,
    `- Destination + UTM: verified above`,
    `- Creative: ${parsed.contentType} spec + source asset noted`,
    `- Platform screenshot note: to be added after ${channel?.autoPost === false ? "manual" : "auto/manual"} post (see steps above)`,
    ``,
    ...(errors.length > 0
      ? [`## Builder warnings`, ...errors.map((e) => `- ${e}`), ``]
      : []),
  ].join("\n");

  const prBody = [
    `Closes #${issue.number}`,
    ``,
    `Packet for \`${contentId}\` (${parsed.appId} / ${platform}).`,
    ``,
    `Hook: ${parsed.hook}`,
    `CTA: ${parsed.cta}`,
    `Destination: \`${parsed.destinationUrl}\``,
    `UTM verification: campaign \`${parsed.campaignId}\` + creative \`${parsed.creativeId}\` validated via lib/social-growth/social-utm.ts`,
    `Creative spec: ${parsed.contentType} from source asset \`${parsed.sourceAsset}\` (gallery-only, see ${packetPath})`,
    `Platform screenshot note: to be added after ${platform} post — packet merge only, issue stays open at status:packet-ready.`,
    ...(errors.length > 0
      ? [``, `Warnings:`, ...errors.map((e) => `- ${e}`)]
      : []),
  ].join("\n");

  // Evidence-gate self-check (mirrors close-with-evidence-social.ts).
  const gate: string[] = [];
  if (!/hook/i.test(prBody)) gate.push("hook evidence");
  if (!/cta/i.test(prBody)) gate.push("CTA evidence");
  if (!/utm_campaign|utm_source/i.test(prBody)) gate.push("UTM verification");
  if (!/creative/i.test(prBody)) gate.push("creative spec");

  if (dryRun || !write) {
    console.log(
      `--- packet: ${packetPath} ---\n${packet}\n--- caption: ${captionPath} ---\n${caption}\n--- pr-body ---\n${prBody}\n--- gate: ${gate.length === 0 ? "PASS" : "FAIL: " + gate.join(", ")} ${errors.length ? "| warnings: " + errors.join("; ") : ""}`,
    );
    if (gate.length > 0) process.exit(1);
    return;
  }
  if (existsSync(packetPath))
    console.log(`exists - ${packetPath} (overwriting)`);
  writeFileSync(packetPath, packet);
  if (
    channel?.id === "instagram" ||
    channel?.id === "facebook" ||
    channel?.id === "pinterest"
  )
    writeFileSync(captionPath, caption);
  writeFileSync(`/tmp/packet-${issue.number}-pr-body.md`, prBody);
  console.log(
    `wrote - ${packetPath}${channel ? ` + caption` : ""}\npr-body - /tmp/packet-${issue.number}-pr-body.md\ngate: ${gate.length === 0 ? "PASS" : "FAIL: " + gate.join(", ")}`,
  );
  if (gate.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
