// One-time migration: seed GitHub Issues from config/content/backlog.ts.
// Run: npx tsx scripts/content-issues/seed-backlog.ts [--dry-run]
// After the live seed, backlog.ts is FROZEN — new topics go to Issues.
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { CONTENT_BACKLOG } from "@/config/content/backlog";
import type { BacklogItem } from "@/config/content/backlog";
import { gh, ghJson, isDryRun, slugifyTitle } from "./gh";

function issueTitle(item: BacklogItem): string {
  return `[Content] ${item.title}`;
}

function issueBody(item: BacklogItem, slug: string): string {
  return [
    `**Pillar:** \`${item.pillar}\``,
    `**Priority:** \`${item.priority}\``,
    `**Intent:** \`${item.intent}\``,
    `**Target slug:** \`${slug}\``,
    `**Cluster:** \` \``,
    ``,
    `## Angle`,
    ``,
    item.angle,
    ``,
    `## Execution`,
    ``,
    `Follow \`docs/CONTENT_ENGINE.md\` sections 4-7 and \`docs/EDITORIAL.md\`.`,
    `Branch: \`content/<issue-number>-${slug}\`. PR body must reference \`Closes #<issue-number>\``,
    `and include the evidence section (\`npm run editorial\`, \`npm run content:validate\`,`,
    `\`npm run check-types\`, preview URL, internal links).`,
    ``,
    `Source: \`config/content/backlog.ts\` (frozen after migration).`,
  ].join("\n");
}

/** True when an open or closed issue with this exact title already exists. */
function titleExists(title: string): boolean {
  const rows = ghJson<Array<{ number: number }>>([
    "issue",
    "list",
    "--state",
    "all",
    "--search",
    `in:title "${title}"`,
    "--json",
    "number",
    "--limit",
    "10",
  ]);
  return rows.length > 0;
}

function main(): void {
  const dryRun = isDryRun();
  let created = 0;
  let skipped = 0;
  for (const item of CONTENT_BACKLOG) {
    const title = issueTitle(item);
    const slug = slugifyTitle(item.title);
    if (titleExists(title)) {
      skipped += 1;
      console.log(`skip - exists: ${title}`);
      continue;
    }
    const labels = `content,${item.priority},pillar:${item.pillar},status:queued`;
    if (dryRun) {
      console.log(`would-create - ${title} [${labels}] -> ${slug}`);
      created += 1;
      continue;
    }
    gh(
      [
        "issue",
        "create",
        "--title",
        title,
        "--label",
        labels,
        "--body-file",
        "-",
      ],
      issueBody(item, slug),
    );
    created += 1;
    console.log(`created - ${title}`);
  }
  console.log(
    `\nseed-backlog${dryRun ? " (dry-run)" : ""}: created=${created} skipped=${skipped} total=${CONTENT_BACKLOG.length}`,
  );
}

main();
