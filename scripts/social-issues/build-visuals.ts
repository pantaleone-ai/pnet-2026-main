// Build per-post visuals from catalog gallery art (no invented imagery).
// Run: npx tsx scripts/social-issues/build-visuals.ts --issue <n> [--dry-run] [--write]
// Reads artwork IDs from the issue **Source asset:** field, resolves them via
// SYN_CATALOG, renders platform-native JPEG cards (IG 1080x1350 trio,
// FB 1200x630 single, Pinterest 1000x1500 single), and stamps **Images:** on
// the issue with --write.
// IG needs >=3 named artworks; FB needs >=1. Anything less fails needs-asset.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
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
  labels: Array<{ name: string }>;
  body: string;
}

/** Artwork IDs (with date prefix) named in a Source asset field. */
export function parseArtworkIds(sourceAsset: string): string[] {
  const ids = [...sourceAsset.matchAll(/20\d\d-\d\d-\d\d-[a-z0-9-]+/g)].map(
    (m) => m[0],
  );
  return [...new Set(ids)];
}

/** Card plan per platform: output dir (repo-relative) + size + count. */
export function visualSpec(
  platform: string,
  contentId: string,
  issue: number,
): { dir: string; size: string; count: number } {
  if (platform === "instagram") {
    return {
      dir: `public/ig/${contentId}-${issue}`,
      size: "1080x1350",
      count: 3,
    };
  }
  if (platform === "pinterest") {
    return {
      dir: `public/pins/${contentId}-${issue}`,
      size: "1000x1500",
      count: 1,
    };
  }
  return { dir: `public/fb/${contentId}-${issue}`, size: "1200x630", count: 1 };
}

function field(body: string, name: string): string {
  const match = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*\`([^\`]*)\``));
  return match?.[1]?.trim() ?? "";
}

async function main(): Promise<void> {
  const issueArg = arg("--issue");
  const dryRun = !process.argv.includes("--write");
  if (!issueArg) {
    console.error(
      "Usage: build-visuals.ts --issue <n> [--write] (default dry-run)",
    );
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
  const platform = labelNames.includes("platform:instagram")
    ? "instagram"
    : labelNames.includes("platform:facebook")
      ? "facebook"
      : labelNames.includes("platform:pinterest")
        ? "pinterest"
        : "";
  if (!platform) {
    console.error(
      `build-visuals: no instagram/facebook/pinterest label on #${issue.number} (manual channels excluded)`,
    );
    process.exit(1);
  }
  const contentId = (
    issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1] ??
    `content-${issue.number}`
  ).toLowerCase();
  const sourceAsset = field(issue.body, "Source asset");
  const ids = parseArtworkIds(sourceAsset);
  const spec = visualSpec(platform, contentId, issue.number);
  // Mixphd recipes carry a direct hero image (sitemap image:loc) instead of
  // catalog artwork IDs: `**Hero image:** <url>`. Same card pipeline.
  const heroMatch = /^Recipe:\s*\S+/.test(sourceAsset)
    ? field(issue.body, "Hero image")
    : "";
  const resolved = ids
    .map((artId) =>
      SYN_CATALOG.find((c) => c.id === artId || c.id.startsWith(artId)),
    )
    .filter((c) => c !== undefined);
  const missing = ids.filter(
    (id) => !SYN_CATALOG.some((c) => c.id === id || c.id.startsWith(id)),
  );
  if (heroMatch && !/^https:\/\//.test(heroMatch)) {
    console.error(
      `needs-asset - #${issue.number}\n- Hero image is not a public URL`,
    );
    process.exit(1);
  }
  // IG carousels want >=2 named artworks; a single artwork renders one
  // portrait card for the single-photo flow. FB always renders one card.
  // Mixphd recipes always render one card from the hero image.
  const want = heroMatch
    ? 1
    : platform === "instagram"
      ? Math.max(1, Math.min(ids.length, 10))
      : 1;
  const problems: string[] = [];
  if (!heroMatch && ids.length < 1) {
    problems.push(`no named artworks for ${platform} in Source asset`);
  }
  if (missing.length > 0)
    problems.push(`artwork IDs not in catalog: ${missing.join(", ")}`);
  if (problems.length > 0) {
    console.error(`needs-asset - #${issue.number}\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  const urls = heroMatch
    ? [heroMatch]
    : resolved.slice(0, want).map((c) => c!.imageUrl);
  // Optional `**Crop:** `top`` (set by respins): top-anchored portrait
  // framing so the fresh spin is pixel-different from the original card.
  const crop = field(issue.body, "Crop") === "top" ? "top" : "center";
  const publicUrls = urls.map(
    (_, i) =>
      `https://www.pantaleone.net/${platform === "instagram" ? "ig" : platform === "pinterest" ? "pins" : "fb"}/${contentId}-${issue.number}/${i + 1}.jpg`,
  );
  if (dryRun) {
    console.log(
      `would-build - #${issue.number} ${platform} ${spec.size} x${urls.length} crop=${crop}\n${urls.map((u, i) => `- ${u} -> ${publicUrls[i]}`).join("\n")}`,
    );
    return;
  }
  execFileSync(
    "python3",
    [
      "scripts/social-issues/build-cards.py",
      "--out-dir",
      spec.dir,
      "--size",
      spec.size,
      "--crop",
      crop,
      ...urls,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  if (!existsSync(`${spec.dir}/1.jpg`)) {
    console.error(
      `build-visuals: cards missing after render for #${issue.number}`,
    );
    process.exit(1);
  }
  const body = gh([
    "issue",
    "view",
    String(issue.number),
    "--json",
    "body",
    "--jq",
    ".body",
  ]);
  const stamped = /\*\*Images:\*\*/.test(body)
    ? body
    : `${body}\n**Images:** \`${publicUrls.join(",")}\`\n`;
  gh(["issue", "edit", String(issue.number), "--body-file", "-"], stamped);
  console.log(`built - #${issue.number} ${urls.length} cards -> ${spec.dir}`);
}

const isMain = (process.argv[1] ?? "").endsWith("build-visuals.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
