// Bounded blog-topic discovery (Phase 3A).
// Proposes ONLY frozen-backlog titles (config/content/backlog.ts) that have
// no MDX file and no open content issue yet — never invents topics, never
// rewrites frozen titles. Bounded: max 5 new issues per run.
// Run: npx tsx scripts/content-issues/discover.ts [--dry-run] [--apply] [--limit 5]
// Default is dry-run.
import { existsSync } from "node:fs";
import { gh, ghJson } from "./gh";
import { CONTENT_BACKLOG } from "@/config/content/backlog";
import { CONTENT_INVENTORY } from "@/config/content/inventory";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface GHIssue {
  number: number;
  title: string;
  state: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const limit = Number(
    flag("--limit") || String(AUTOMATION_POLICY.content.maxNewTopicsPerRun),
  );
  console.log(
    `discover policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} limit=${limit}`,
  );

  // Pillar coverage from the live inventory (context for the report only).
  const counts = new Map<string, number>();
  for (const e of CONTENT_INVENTORY)
    counts.set(e.pillar, (counts.get(e.pillar) ?? 0) + 1);
  console.log(
    `pillar coverage: ${[...counts.entries()].map(([p, n]) => `${p}=${n}`).join(" ")}`,
  );

  const open = ghJson<GHIssue[]>([
    "issue",
    "list",
    "--label",
    "content",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,state",
  ]);
  const openTitles = open.map((i) => i.title.toLowerCase());
  let shown = 0;
  let created = 0;
  for (const item of CONTENT_BACKLOG) {
    if (shown >= limit && !apply) break;
    if (created >= limit && apply) break;
    const slug = slugify(item.title);
    if (existsSync(`features/blog/content/${slug}.mdx`)) continue;
    if (CONTENT_INVENTORY.some((e) => e.slug === slug)) continue;
    const dup = openTitles.some((t) =>
      t.includes(item.title.toLowerCase().slice(0, 24)),
    );
    if (dup) {
      console.log(`skip (open issue exists): ${item.title}`);
      continue;
    }
    shown += 1;
    const body = [
      `Proposed by bounded discovery (policy ${AUTOMATION_POLICY.version}). Frozen-backlog title — do not rewrite.`,
      ``,
      `**Pillar:** \`${item.pillar}\``,
      `**Priority:** \`${item.priority}\``,
      `**Intent:** \`${item.intent}\``,
      `**Angle:** \`${item.angle}\``,
      `**Target slug:** \`${slug}\``,
      ``,
      `Suggested opening H2 must build on the title (never repeat it). Follow docs/CONTENT_ENGINE.md + docs/EDITORIAL.md.`,
    ].join("\n");
    if (!apply) {
      console.log(
        `would-create - [Content] ${item.title} (${item.pillar}/${item.priority})`,
      );
      continue;
    }
    const out = gh([
      "issue",
      "create",
      "--title",
      `[Content] ${item.title}`,
      "--body",
      body,
      "--label",
      "content",
      "--label",
      "status:queued",
      "--label",
      item.priority,
      "--label",
      `pillar:${item.pillar}`,
    ]);
    console.log(`created - ${out.trim()} : ${item.title}`);
    created += 1;
  }
  if (shown === 0 && created === 0)
    console.log("(discover: nothing new — backlog covered by files/issues)");
  if (!apply)
    console.log("dry-run: no issues created. Re-run with --apply to act.");
}

const isMain = (process.argv[1] ?? "").endsWith("discover.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
