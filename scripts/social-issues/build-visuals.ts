// Build per-post visuals from catalog gallery art (no invented imagery).
// Run: npx tsx scripts/social-issues/build-visuals.ts --issue <n> [--dry-run] [--write]
// Reads artwork IDs from the issue **Source asset:** field, resolves them via
// SYN_CATALOG, renders platform-native JPEG cards (IG 1080x1350 trio,
// FB 1200x630 single), and stamps **Images:** on the issue with --write.
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
      : "";
  if (!platform) {
    console.error(
      `build-visuals: no instagram/facebook label on #${issue.number} (Pinterest/manual channels excluded)`,
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
  const resolved = ids
    .map((id) => SYN_CATALOG.find((c) => c.id === id || c.id.startsWith(id)))
    .filter((c) => c !== undefined);
  const missing = ids.filter(
    (id) => !SYN_CATALOG.some((c) => c.id === id || c.id.startsWith(id)),
  );
  const problems: string[] = [];
  if (ids.length < spec.count) {
    problems.push(
      `needs ${spec.count} named artworks for ${platform}, found ${ids.length} in Source asset`,
    );
  }
  if (missing.length > 0)
    problems.push(`artwork IDs not in catalog: ${missing.join(", ")}`);
  if (problems.length > 0) {
    console.error(`needs-asset - #${issue.number}\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  const urls = resolved.slice(0, spec.count).map((c) => c!.imageUrl);
  const publicUrls = urls.map(
    (_, i) =>
      `https://www.pantaleone.net/${platform === "instagram" ? "ig" : "fb"}/${contentId}-${issue.number}/${i + 1}.jpg`,
  );
  if (dryRun) {
    console.log(
      `would-build - #${issue.number} ${platform} ${spec.size} x${spec.count}\n${urls.map((u, i) => `- ${u} -> ${publicUrls[i]}`).join("\n")}`,
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
  console.log(`built - #${issue.number} ${spec.count} cards -> ${spec.dir}`);
}

const isMain = (process.argv[1] ?? "").endsWith("build-visuals.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
