// Ensure the content-queue labels exist. Idempotent — safe to run on every tick.
// Run: npx tsx scripts/content-issues/labels.ts
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { gh, ghJson } from "./gh";

const LABELS: Array<{ name: string; color: string; description: string }> = [
  { name: "content", color: "0075ca", description: "Content-engine topic in the issues queue." },
  { name: "P0", color: "b60205", description: "Critical authority page. Claim first." },
  { name: "P1", color: "d93f0b", description: "High-priority supporting topic." },
  { name: "P2", color: "fbca04", description: "Medium-priority topic." },
  { name: "P3", color: "0e8a16", description: "Low-priority topic." },
  { name: "pillar:ai-agents", color: "1d76db", description: "Pillar: AI Agents." },
  { name: "pillar:ai-engineering", color: "1d76db", description: "Pillar: AI Engineering." },
  { name: "pillar:mcp", color: "1d76db", description: "Pillar: MCP." },
  { name: "pillar:ai-automation", color: "1d76db", description: "Pillar: AI Automation." },
  { name: "pillar:enterprise-ai", color: "1d76db", description: "Pillar: Enterprise AI." },
  { name: "pillar:lab", color: "1d76db", description: "Pillar: Lab field notes." },
  { name: "status:queued", color: "ededed", description: "Waiting in the content queue." },
  { name: "status:in-progress", color: "fbca04", description: "Claimed. Branch content/<issue>-<slug> expected." },
  { name: "status:in-review", color: "d93f0b", description: "PR open referencing Closes #N." },
  { name: "status:done", color: "0e8a16", description: "Merged with evidence bundle. Closed." },
  { name: "needs-evidence", color: "b60205", description: "Merged PR lacked required validation logs." },
];

function existingLabels(): Set<string> {
  try {
    const rows = ghJson<Array<{ name: string }>>([
      "label",
      "list",
      "--limit",
      "200",
      "--json",
      "name",
    ]);
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

function main(): void {
  const existing = existingLabels();
  let created = 0;
  let updated = 0;
  for (const label of LABELS) {
    if (existing.has(label.name)) {
      gh([
        "label",
        "edit",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
      ]);
      updated += 1;
    } else {
      gh([
        "label",
        "create",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
      ]);
      created += 1;
    }
    console.log(`ok - ${label.name}`);
  }
  console.log(`\nlabels: created=${created} updated=${updated} total=${LABELS.length}`);
}

main();
