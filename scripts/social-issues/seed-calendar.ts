// One-time migration: seed shared social queue from config/social-growth/calendar-30d.ts.
// Run: npx tsx scripts/social-issues/seed-calendar.ts [--dry-run]
// After the live seed, calendar-30d.ts is FROZEN — new posts go to Issues or POST /api/social/ingest.
// Auth: GITHUB_TOKEN (Actions) or `gh auth login` (local).
import { CALENDAR_30D } from "@/config/social-growth/calendar-30d";
import { socialIssueBody, socialIssueTitle } from "@/lib/social-growth/issue-body";
import { validateSocialNaming } from "@/lib/social-growth/social-utm";
import { gh, ghJson, isDryRun } from "../content-issues/gh";

function existingTitles(): Set<string> {
  try {
    const rows = ghJson<Array<{ title: string }>>([
      "issue",
      "list",
      "--label",
      "social",
      "--state",
      "all",
      "--limit",
      "200",
      "--json",
      "title",
    ]);
    return new Set(rows.map((r) => r.title));
  } catch {
    return new Set();
  }
}

async function main(): Promise<void> {
  const dryRun = isDryRun();
  const seen = existingTitles();
  let created = 0;
  let skipped = 0;
  for (const post of CALENDAR_30D) {
    const naming = validateSocialNaming(post.campaignId, post.creativeId);
    if (!naming.campaign.valid || !naming.creative.valid) {
      console.log(`skip - bad naming: ${post.contentId}`);
      skipped += 1;
      continue;
    }
    const title = socialIssueTitle(post.contentId, post.hook);
    if (seen.has(title)) {
      skipped += 1;
      console.log(`skip - exists: ${title}`);
      continue;
    }
    const labels = [
      "social",
      `site:${post.appId}`,
      `platform:${post.platform}`,
      `spillar:${post.pillar}`,
      `spri:${post.priority}`,
      "status:queued",
    ].join(",");
    const body = socialIssueBody({
      contentId: post.contentId,
      appId: post.appId,
      platform: post.platform,
      contentType: post.contentType as "pin",
      pillar: post.pillar as "discovery",
      topic: post.topic,
      hook: post.hook,
      body: post.body,
      cta: post.cta,
      destinationUrl: post.destinationUrl,
      campaignId: post.campaignId,
      creativeId: post.creativeId,
      publishAt: post.publishAt,
      status: "idea",
      priority: post.priority,
      audience: post.audience,
      format: post.creative,
      sourceAsset: post.sourceAsset,
    });
    if (dryRun) {
      console.log(`would-create - ${title} [${labels}]`);
      created += 1;
      continue;
    }
    // Resilient create: retry transient network failures, never abort the run.
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt += 1) {
      try {
        gh(["issue", "create", "--title", title, "--label", labels, "--body-file", "-"], body);
        done = true;
      } catch {
        if (attempt === 4) {
          console.log(`fail - gave up after 4 attempts: ${title}`);
        } else {
          await new Promise((r) => setTimeout(r, attempt * 5000));
        }
      }
    }
    if (!done) {
      skipped += 1;
      continue;
    }
    seen.add(title);
    created += 1;
    console.log(`created - ${title}`);
  }
  console.log(`\nseed-calendar${dryRun ? " (dry-run)" : ""}: created=${created} skipped=${skipped} total=${CALENDAR_30D.length}`);
}

main();
