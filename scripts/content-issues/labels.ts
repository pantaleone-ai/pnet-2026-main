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
  { name: "social", color: "5319e7", description: "Portfolio social post in the shared queue." },
  { name: "spri:p1", color: "b60205", description: "Social P1: Tier 1 / revenue-proximate. Claim first." },
  { name: "spri:p2", color: "fbca04", description: "Social P2: standard priority." },
  { name: "spri:p3", color: "0e8a16", description: "Social P3: experimental." },
  { name: "site:synthetic-pics", color: "0e8a16", description: "Site: synthetic.pics." },
  { name: "site:print3dmodels", color: "0e8a16", description: "Site: print3dmodels.com." },
  { name: "site:mixphd", color: "0e8a16", description: "Site: mixphd.com." },
  { name: "site:proswing", color: "0e8a16", description: "Site: proswing.net." },
  { name: "site:imgsquash", color: "0e8a16", description: "Site: imgsquash.com." },
  { name: "site:aicapturelab", color: "0e8a16", description: "Site: aicapturelab.com." },
  { name: "site:profitsignals", color: "0e8a16", description: "Site: profitsignals.xyz." },
  { name: "site:aiceo", color: "0e8a16", description: "Site: aiceo.io." },
  { name: "site:pantaleone", color: "0e8a16", description: "Site: pantaleone.net umbrella." },
  { name: "platform:pinterest", color: "c51f2a", description: "Platform: Pinterest." },
  { name: "platform:instagram", color: "c51f2a", description: "Platform: Instagram." },
  { name: "platform:facebook", color: "c51f2a", description: "Platform: Facebook." },
  { name: "platform:x", color: "c51f2a", description: "Platform: X." },
  { name: "platform:reddit", color: "c51f2a", description: "Platform: Reddit." },
  { name: "platform:linkedin", color: "c51f2a", description: "Platform: LinkedIn." },
  { name: "platform:youtube-shorts", color: "c51f2a", description: "Platform: YouTube Shorts." },
  { name: "spillar:product", color: "1d76db", description: "Social pillar: product." },
  { name: "spillar:proof", color: "1d76db", description: "Social pillar: proof." },
  { name: "spillar:education", color: "1d76db", description: "Social pillar: education." },
  { name: "spillar:discovery", color: "1d76db", description: "Social pillar: discovery." },
  { name: "spillar:how-to", color: "1d76db", description: "Social pillar: how-to." },
  { name: "spillar:insight", color: "1d76db", description: "Social pillar: insight." },
  { name: "spillar:comparison", color: "1d76db", description: "Social pillar: comparison." },
  { name: "spillar:use-case", color: "1d76db", description: "Social pillar: use-case." },
  { name: "spillar:feature", color: "1d76db", description: "Social pillar: feature." },
  { name: "spillar:social-proof", color: "1d76db", description: "Social pillar: social-proof." },
  { name: "spillar:build", color: "1d76db", description: "Social pillar: build." },
  { name: "spillar:experiment", color: "1d76db", description: "Social pillar: experiment." },
  { name: "spillar:portfolio", color: "1d76db", description: "Social pillar: portfolio." },
  { name: "status:scheduled", color: "1d76db", description: "Approved with publish_at set." },
  { name: "status:published", color: "0e8a16", description: "Published with live URL evidence." },
  { name: "status:packet-ready", color: "fbca04", description: "Packet merged. Platform post pending — do not close." },
  { name: "needs-manual-post", color: "d93f0b", description: "Packet merged; owner must post manually then add post URL + screenshot." },
  { name: "needs-screenshot", color: "fbca04", description: "Live post URL present; screenshot still required to close." },
  { name: "publish:approved", color: "0e8a16", description: "Human approval: publish this packet-ready issue now (one-shot trigger)." },
  { name: "status:analyzing", color: "fbca04", description: "Published, collecting metrics." },
  { name: "status:winner", color: "5319e7", description: "Winner. Recycle with new angle." },
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
  let failed = 0;
  for (const label of LABELS) {
    try {
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
        try {
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
        } catch {
          // Race: label appeared after listing (or case-variant exists).
          // Force-update instead of crashing the whole run.
          gh([
            "label",
            "create",
            label.name,
            "--force",
            "--color",
            label.color,
            "--description",
            label.description,
          ]);
          updated += 1;
        }
      }
      console.log(`ok - ${label.name}`);
    } catch (error) {
      failed += 1;
      console.log(`fail - ${label.name} (non-blocking, continuing)`);
    }
  }
  console.log(`\nlabels: created=${created} updated=${updated} failed=${failed} total=${LABELS.length}`);
}

main();
