// Portfolio -> pantaleone.net reshare drafter.
// Run: npx tsx scripts/social-issues/publish/reshare.ts --from <issue> [--to-site pantaleone] [--dry-run] [--create-issue]
//      npx tsx scripts/social-issues/publish/reshare.ts --auto [--dry-run] [--limit 10]
// Sources: any app's published FB/IG post. Target: pantaleone FB Page + IG.
// Caps: config/social-growth/cadence.ts PANTA_RESHARE_CAPS (2/week combined, 48h delay).
import { gh, ghJson } from "../../content-issues/gh";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { PANTA_RESHARE_CAPS } from "@/config/social-growth/cadence";
import { strategyFor } from "@/config/social-growth/product-matrix";
import { tierFor } from "@/config/social-growth/tiers";
import { buildSocialUrl } from "@/lib/social-growth/social-utm";
import { readMediaLedger } from "@/lib/social-growth/media-registry";
import { imagesFromBody } from "./publish-due";

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

function field(body: string, name: string): string {
  const m = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*` + "`([^`]+)`"));
  return m?.[1]?.trim() ?? "";
}

function proofPermalink(comments: Array<{ body: string }>): string | undefined {
  const hit = comments.find((c) => c.body.includes("Platform publish proof"));
  return hit?.body.match(
    /https:\/\/(www\.)?(instagram\.com|facebook\.com)\/\S+/,
  )?.[0];
}

function priorityOf(labels: Array<{ name: string }>): string {
  return (
    labels
      .find((l) => /^spri:p[123]$/.test(l.name))
      ?.name.replace("spri:", "") ?? "p2"
  );
}

function appIdOf(labels: Array<{ name: string }>, body: string): string {
  const site =
    labels.find((l) => l.name.startsWith("site:"))?.name.replace("site:", "") ??
    "";
  if (site) return site;
  return field(body, "App") || "synthetic-pics";
}

function platformOf(labels: Array<{ name: string }>, body: string): string {
  const p =
    labels
      .find((l) => l.name.startsWith("platform:"))
      ?.name.replace("platform:", "") ?? "";
  if (p) return p;
  return (field(body, "Platform") || "instagram").toLowerCase();
}

export function reshareScore(
  appId: string,
  sourcePlatform: string,
  priority: string,
  ageDays: number,
): number {
  const tier = tierFor(appId);
  const tierW = tier === "tier1" ? 1.2 : tier === "tier2" ? 1.0 : 0.8;
  const fit: Record<string, number> = {
    primary: 1.2,
    secondary: 1.0,
    experimental: 0.8,
  };
  // FB/IG-native sources score highest; X/LinkedIn need reformat.
  const nativeW =
    sourcePlatform === "instagram" || sourcePlatform === "facebook" ? 1.2 : 0.7;
  void fit;
  const pW = priority === "p1" ? 1.0 : priority === "p2" ? 0.7 : 0.4;
  const freshW = ageDays <= 14 ? 1.0 : ageDays <= 30 ? 0.6 : 0.2;
  return Math.round(tierW * nativeW * pW * freshW * 100) / 100;
}

export function buildReshareBody(opts: {
  sourceIssue: number;
  sourceContentId: string;
  sourceApp: string;
  sourcePlatform: string;
  sourcePermalink: string;
  hook: string;
  body: string;
  cta: string;
  destinationBase: string;
  images: string[];
  targetPlatform: string;
}): {
  title: string;
  body: string;
  campaign: string;
  creative: string;
  url: string;
} {
  const short = opts.sourceContentId.replace(/^syn-/, "").slice(0, 40);
  const contentId =
    `pnt-${opts.targetPlatform === "instagram" ? "ig" : "fb"}-rs-${short}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  const campaign = `PNT_${opts.targetPlatform === "instagram" ? "IG" : "FB"}_DISCOVERY_PORTFOLIO_US_${yyyymm}`;
  const creative = `${opts.sourceContentId.toUpperCase().replace(/-/g, "_").slice(0, 24)}_RS_V1`;
  const url = buildSocialUrl(
    opts.destinationBase.split("?")[0] ?? opts.destinationBase,
    {
      platform: opts.targetPlatform,
      campaign,
      creative,
    },
  );
  const hook =
    opts.hook.length > 100 ? `${opts.hook.slice(0, 99).trimEnd()}…` : opts.hook;
  // Short factual bridge only: source copy first, one attribution tail.
  // No "From what I'm building" / "kept for the gallery wall" boilerplate.
  // Full provenance lives in Media / Reshare-Of / Original-Post below.
  const appTag = `@${opts.sourceApp.replace(/-/g, "")}`;
  const bridgeBody = `${opts.body} Via ${appTag}.`;
  const title = `[Social] ${contentId} — Reshare ${opts.sourceContentId} to pantaleone`;
  const bodyLines = [
    `**App:** \`pantaleone\``,
    `**Platform:** \`${opts.targetPlatform}\``,
    `**Social pillar:** \`portfolio\``,
    `**Content type:** \`${opts.targetPlatform === "instagram" ? "carousel" : "facebook-post"}\``,
    `**Content ID:** \`${contentId}\``,
    `**Hook:** \`${hook}\``,
    `**Body:** \`${bridgeBody}\``,
    `**CTA:** \`${opts.cta}\``,
    `**Destination:** \`${url}\``,
    `**Media:** \`Reshare of #${opts.sourceIssue} (${opts.sourcePlatform} ${opts.sourcePermalink})\``,
    `**Campaign:** \`${campaign}\``,
    `**Creative:** \`${creative}\``,
    `**Priority:** \`p2\``,
    `**Audience:** \`Portfolio followers\``,
    `**Source asset:** \`Reshare ${opts.sourceContentId} from ${opts.sourceApp}\``,
    `**Reshare-Of:** \`#${opts.sourceIssue}/${opts.sourceContentId}\``,
    `**Original-Post:** \`${opts.sourcePermalink}\``,
    ``,
    `**Images:** \`${opts.images.join(",")}\``,
    ``,
    `Reshare draft generated by reshare.ts. Add \`publish:approved\` to publish via the standard pipeline.`,
  ];
  return { title, body: bodyLines.join("\n"), campaign, creative, url };
}

async function loadIssue(n: string): Promise<IssueView> {
  return ghJson<IssueView>([
    "issue",
    "view",
    n,
    "--json",
    "number,title,state,labels,body,comments",
  ]);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const createIssue = process.argv.includes("--create-issue");
  const auto = process.argv.includes("--auto");
  const toSite = arg("--to-site") ?? "pantaleone";
  if (toSite !== "pantaleone") {
    console.error("only --to-site pantaleone is supported in v1");
    process.exit(1);
  }

  if (auto) {
    const limit = Number(arg("--limit") ?? "20");
    const issues = ghJson<IssueView[]>([
      "issue",
      "list",
      "--label",
      "social",
      "--state",
      "closed",
      "--limit",
      "100",
      "--json",
      "number,title,state,labels,body,comments",
    ]);
    const now = Date.now();
    const scored = issues
      .map((i) => {
        const labels = i.labels.map((l) => l.name);
        const srcPlatform = platformOf(i.labels, i.body);
        if (srcPlatform !== "instagram" && srcPlatform !== "facebook")
          return undefined;
        if (labels.includes("site:pantaleone")) return undefined;
        const proof = proofPermalink(i.comments);
        if (!proof) return undefined;
        const appId = appIdOf(i.labels, i.body);
        if (!PANTA_RESHARE_CAPS.allowedSourceSites.includes(appId))
          return undefined;
        const pri = priorityOf(i.labels);
        if (!PANTA_RESHARE_CAPS.autoPublishPriorities.includes(pri))
          return undefined;
        const closedAt = (i as unknown as { closedAt?: string }).closedAt;
        const ageDays = closedAt
          ? (now - new Date(closedAt).getTime()) / 86400000
          : 7;
        if (ageDays * 24 < PANTA_RESHARE_CAPS.minDelayHoursAfterSource)
          return undefined;
        return {
          issue: i,
          appId,
          pri,
          proof,
          score: reshareScore(appId, srcPlatform, pri, ageDays),
          ageDays,
        };
      })
      .filter(Boolean) as Array<{
      issue: IssueView;
      appId: string;
      pri: string;
      proof: string;
      score: number;
      ageDays: number;
    }>;
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    for (const c of top) {
      const strat = strategyFor(c.appId);
      console.log(
        `#${c.issue.number} ${c.appId} ${c.pri} score=${c.score} age=${c.ageDays.toFixed(1)}d dest=${strat?.domain ?? "?"} proof=${c.proof}`,
      );
    }
    if (top.length === 0) console.log("(no eligible reshare candidates)");
    void dryRun;
    return;
  }

  const from = arg("--from");
  if (!from) {
    console.error(
      "Usage: reshare.ts --from <issue> [--to-site pantaleone] [--dry-run] [--create-issue] | --auto",
    );
    process.exit(1);
  }
  const src = await loadIssue(from);
  const srcPlatform = platformOf(src.labels, src.body);
  const srcApp = appIdOf(src.labels, src.body);
  const proof = proofPermalink(src.comments);
  if (!proof) {
    console.error(
      `source #${from} has no Platform publish proof — publish it first`,
    );
    process.exit(1);
  }
  const images = imagesFromBody(src.body);
  if (images.length === 0) {
    // Fallback: recover visuals from the media ledger (older FB issues stored
    // visuals only via --images CLI, not in the body).
    const srcContentId = (
      src.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ?? ""
    ).toLowerCase();
    const ledger = readMediaLedger();
    for (const [url, uses] of Object.entries(ledger)) {
      if (
        uses.some((u) => u.contentId === srcContentId) &&
        /^https:\/\//.test(url) &&
        /\.(jpe?g|png)(\?|$)/i.test(url)
      ) {
        images.push(url);
      }
    }
  }
  if (images.length === 0) {
    console.error(
      `source #${from} has no **Images:** and no ledger visuals — cannot reshare without visuals`,
    );
    process.exit(1);
  }
  const targetPlatform =
    srcPlatform === "instagram" || srcPlatform === "facebook"
      ? srcPlatform
      : "facebook";
  const targetImages =
    targetPlatform === "instagram" && images.length < 2
      ? [...images, ...images].slice(0, 2)
      : images;
  const dest =
    field(src.body, "Destination") ||
    strategyFor(srcApp)?.domain ||
    "https://www.synthetic.pics";
  const draft = buildReshareBody({
    sourceIssue: src.number,
    sourceContentId: (
      src.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ??
      `issue-${src.number}`
    ).toLowerCase(),
    sourceApp: srcApp,
    sourcePlatform: srcPlatform,
    sourcePermalink: proof,
    hook: field(src.body, "Hook") || src.title,
    body: field(src.body, "Body") || "",
    cta: field(src.body, "CTA") || "Explore the gallery",
    destinationBase: dest,
    images: targetImages,
    targetPlatform,
  });
  console.log(
    `--- reshare draft (${srcPlatform} -> pantaleone/${targetPlatform}) ---`,
  );
  console.log(`title: ${draft.title}`);
  console.log(`campaign: ${draft.campaign} creative: ${draft.creative}`);
  console.log(`url: ${draft.url}`);
  console.log(`--- body ---\n${draft.body}`);
  if (dryRun && !createIssue) return;
  if (createIssue) {
    // Reshares reuse already-live source visuals + proven copy, so they are
    // born packet-ready (auto-packet would try to rebuild from catalog art
    // and fail on `Source asset: Reshare ...`). Publish guard needs
    // status:packet-ready with no proof yet — exactly this state.
    // Targets are instagram/facebook only (both auto-posted via slots), so
    // no needs-manual-post: automation publishes at the stamped slot.
    const out = gh([
      "issue",
      "create",
      "--title",
      draft.title,
      "--body",
      draft.body,
      "--label",
      "social",
      "--label",
      "site:pantaleone",
      "--label",
      `platform:${targetPlatform}`,
      "--label",
      "status:packet-ready",
      "--label",
      "spri:p2",
      "--label",
      "spillar:portfolio",
    ]);
    console.log(out);
  }
}

const isReshareMain = (process.argv[1] ?? "").endsWith("reshare.ts");
if (isReshareMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
