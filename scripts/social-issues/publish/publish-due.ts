// Publish a due social issue to its platform channel, then close with proof.
// Run: npx tsx scripts/social-issues/publish/publish-due.ts --issue <n>
//        [--channel <id>] [--images u1,u2,..] [--caption-file path]
//        [--screenshot-url url] [--verify-delete] [--dry-run]
//
// Flow: packet-ready issue -> live platform post -> proof comment (post URL +
// media ID) -> screenshot attached -> status:published + status:done, closed.
// Without --screenshot-url the issue waits at status:packet-ready +
// needs-screenshot (never closed on URL alone).
// Channels without stored credentials report blocked and stay packet-ready.
import { gh, ghJson } from "../../content-issues/gh";
import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

loadEnv({ path: ".env.local" });
import { accountsForSite } from "./accounts";
import { buildCaption as composeCaption } from "@/lib/social-growth/caption";
import {
  channelForLabelNames,
  missingEnvs,
  type ChannelSpec,
} from "./channels";
import { deletePost, publishPhotoPost, selectFbImage } from "./facebook";
import { publishCarousel, publishPhoto } from "./instagram";
import { pendingPlan } from "./pending-channels";
import {
  claimImage,
  conflictingUsesForReshare,
  readMediaLedger,
} from "@/lib/social-growth/media-registry";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
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
  const match = body.match(
    new RegExp(`\\*\\*${name}:\\*\\*\\s*` + "`([^`]+)`"),
  );
  return match?.[1]?.trim() ?? "";
}

function buildCaption(body: string, platform: string, pillar: string): string {
  const hook = field(body, "Hook");
  const text = field(body, "Body");
  const cta = field(body, "CTA");
  const destination = field(body, "Destination");
  const tags = field(body, "Hashtags");
  const { text: composed, lint } = composeCaption({
    hook,
    body: text,
    cta: cta || "Learn more",
    destinationUrl: destination,
    platform: platform === "instagram" ? "instagram" : "facebook",
    pillar,
    hashtags: tags
      ? tags.split(/[\s,]+/).map((t) => t.replace(/^#/, ""))
      : undefined,
  });
  if (!lint.ok)
    console.error(`caption lint warnings: ${lint.violations.join("; ")}`);
  return composed;
}

function proofPosted(
  comments: Array<{ body: string }>,
  channel: string,
): string | undefined {
  const hit = comments.find(
    (c) =>
      c.body.includes("Platform publish proof") && c.body.includes(channel),
  );
  const url = hit?.body.match(
    /https:\/\/(www\.)?(instagram\.com|facebook\.com|pinterest\.com)\/\S+/,
  );
  return url?.[0];
}

/** Board ID from a `**Board:** `id`` field (label-triggered runs have no CLI args). */
function boardFromBody(body: string): string {
  return body.match(/\*\*Board:\*\*\s*`([^`]+)`/i)?.[1]?.trim() ?? "";
}
/** Source reference for pantaleone reshares: `**Reshare-Of:** `#123/content-id``. */
function reshareOfFromBody(
  body: string,
): { issue: number; contentId: string } | undefined {
  const m = body.match(/\*\*Reshare-Of:\*\*\s*`#(\d+)\/([a-z0-9-]+)`/i);
  if (!m || !m[1] || !m[2]) return undefined;
  return { issue: Number(m[1]), contentId: m[2].toLowerCase() };
}

/**
 * Copy audit gate (budgets + voice + fidelity + anti-slop scan, never rewrites).
 * fail -> dry-run prints would-block and exits 1; live run comments, labels
 * needs_review, removes publish:approved so neither auto-approval nor a
 * retry can publish until fixed, then exits 1. warn -> logged, proceeds.
 */
async function gateCopyAudit(
  issue: IssueView,
  channelId: "instagram" | "facebook",
  dryRun: boolean,
): Promise<void> {
  if (!AUTOMATION_POLICY.social.audit.enabled) {
    console.log("copy audit skipped (policy flag off)");
    return;
  }
  const pillar = field(issue.body, "Social pillar");
  const tags = field(issue.body, "Hashtags");
  const { auditSocialCopy } = await import("@/lib/social-growth/social-audit");
  const { suggestHashtags } = await import("@/lib/social-growth/caption");
  const result = await auditSocialCopy({
    hook: field(issue.body, "Hook"),
    body: field(issue.body, "Body"),
    cta: field(issue.body, "CTA"),
    platform: channelId,
    pillar: pillar || undefined,
    hashtags:
      channelId === "instagram"
        ? suggestHashtags(
            pillar || undefined,
            tags
              ? tags.split(/[\s,]+/).map((t) => t.replace(/^#/, ""))
              : undefined,
          )
        : [],
    sourceAsset: field(issue.body, "Source asset") || undefined,
    destinationUrl: field(issue.body, "Destination") || undefined,
  });
  for (const r of result.reasons) console.log(`audit ${result.verdict}: ${r}`);
  if (result.verdict === "warn") {
    console.log(
      `copy audit warn - #${issue.number} (proceeding, recorded above)`,
    );
    return;
  }
  if (result.verdict !== "fail") return;
  const comment = [
    `## Copy audit failed — publication blocked`,
    ``,
    `Policy: social copy budgets + voice + source fidelity + anti-slop (scan only, no rewrites).`,
    ...result.reasons.map((r) => `- ${r}`),
    ``,
    `Fix the hook/body/CTA and re-run the audit. Labeled \`needs_review\`.`,
  ].join("\n");
  if (dryRun) {
    console.log(`would-block-audit - #${issue.number}\n${comment}`);
    process.exit(1);
  }
  gh(["issue", "comment", String(issue.number), "--body", comment]);
  gh(["issue", "edit", String(issue.number), "--add-label", "needs_review"]);
  if (issue.labels.some((l) => l.name === "publish:approved")) {
    gh([
      "issue",
      "edit",
      String(issue.number),
      "--remove-label",
      "publish:approved",
    ]);
  }
  console.error(`audit-fail-blocked - #${issue.number} (needs_review)`);
  process.exit(1);
}

function limitArg(): number {
  const i = process.argv.indexOf("--limit");
  if (i === -1) return 2;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), 10) : 2;
}

/**
 * Slot publisher for IG crons (IG has no native scheduling API).
 * Publishes open packet-ready issues whose **Publish at:** is due (<= now),
 * oldest slot first, up to --limit. Each child run enforces the full guard,
 * audit, ledger, and proof path; failures are commented and skipped.
 */
async function publishDueSlots(
  channelId: string,
  dryRun: boolean,
): Promise<void> {
  const limit = limitArg();
  const siteArg = (arg("--site") ?? "synthetic-pics").replace(/^site:/, "");
  const site = siteArg === "mixphd" ? "mixphd" : "synthetic-pics";
  // IG without a verified linked business account skips quietly — drafts
  // stay packet-ready until onboarding (all current sites are linked).
  if (channelId === "instagram") {
    const { accountsForSite } = await import("./accounts");
    if (!accountsForSite(site)?.igUserId) {
      console.log(
        `due slots skipped: site:${site} has no verified IG account yet (packet-ready drafts held)`,
      );
      return;
    }
  }
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--label",
    `site:${site}`,
    "--label",
    `platform:${channelId}`,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,labels,body,comments",
  ]);
  const now = Date.now();
  const due = issues
    .filter((i) => {
      const names = i.labels.map((l) => l.name);
      if (!names.includes("status:packet-ready")) return false;
      if (i.comments.some((c) => c.body.includes("Platform publish proof")))
        return false;
      const slot = i.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1];
      if (!slot || Number.isNaN(new Date(slot).getTime())) return false;
      return new Date(slot).getTime() <= now;
    })
    .sort((a, b) => {
      const ta = new Date(
        a.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1] ?? 0,
      ).getTime();
      const tb = new Date(
        b.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1] ?? 0,
      ).getTime();
      return ta - tb || a.number - b.number;
    })
    .slice(0, limit);
  console.log(
    `due slots (${channelId} site:${site}): ${due.length} of ${issues.length} open (limit ${limit})`,
  );
  if (dryRun) {
    for (const d of due)
      console.log(`would-publish-due - #${d.number} ${d.title.slice(0, 70)}`);
    return;
  }
  let published = 0;
  for (const d of due) {
    try {
      execFileSync(
        "npx",
        [
          "tsx",
          "scripts/social-issues/publish/publish-due.ts",
          "--issue",
          String(d.number),
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "inherit"],
        },
      );
      published += 1;
    } catch (e) {
      console.error(
        `due-slot failed - #${d.number}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`,
      );
      try {
        gh([
          "issue",
          "comment",
          String(d.number),
          "--body",
          `Slot publish failed at ${new Date().toISOString()} (see run logs). Left packet-ready for the next slot run.`,
        ]);
      } catch {
        /* best effort */
      }
    }
  }
  console.log(
    `due slots done: published=${published} failed=${due.length - published}`,
  );
}
export function imagesFromBody(body: string): string[] {
  const fields = [...body.matchAll(/\*\*Images:\*\*\s*`([^`]+)`/gi)].map(
    (m) => m[1] ?? "",
  );
  return fields
    .flatMap((f) => f.split(/[\s,]+/))
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//.test(s));
}

async function main(): Promise<void> {
  const issueArg = arg("--issue");
  const dryRun = process.argv.includes("--dry-run");
  const verifyDelete = process.argv.includes("--verify-delete");
  const screenshotUrl = arg("--screenshot-url");
  if (!issueArg) {
    if (process.argv.includes("--due")) {
      await publishDueSlots(arg("--channel") ?? "instagram", dryRun);
      return;
    }
    console.error(
      "Usage: publish-due.ts --issue <n> [options] | --due --channel <id> [--site <site>] [--limit N] [--dry-run]",
    );
    process.exit(1);
  }
  const issue = ghJson<IssueView>([
    "issue",
    "view",
    issueArg,
    "--json",
    "number,title,state,labels,body,comments",
  ]);
  const labelNames = issue.labels.map((l) => l.name);
  const override = arg("--channel");
  const channel: ChannelSpec | undefined = override
    ? (await import("./channels")).CHANNELS.find((c) => c.id === override)
    : channelForLabelNames(labelNames);
  if (!channel) {
    console.error(
      `no channel: override=${override ?? "none"} labels=${labelNames.join(",")}`,
    );
    process.exit(1);
  }

  // Screenshot-only finish: proof already posted, attach shot and close.
  const existingProof = proofPosted(issue.comments, channel.id);
  if (existingProof && screenshotUrl) {
    const closeComment = [
      `## Screenshot evidence — ${channel.id}`,
      ``,
      `- Post: ${existingProof}`,
      `- Screenshot:`,
      ``,
      `![${channel.id} post proof](${screenshotUrl})`,
    ].join("\n");
    if (dryRun) {
      console.log(
        `would-attach-screenshot - #${issue.number}\n${closeComment}`,
      );
      return;
    }
    gh(["issue", "comment", String(issue.number), "--body", closeComment]);
    gh([
      "issue",
      "edit",
      String(issue.number),
      "--remove-label",
      "status:packet-ready",
      "--remove-label",
      "needs-manual-post",
      "--remove-label",
      "needs-screenshot",
      "--remove-label",
      "needs-evidence",
      "--remove-label",
      "status:in-progress",
      "--remove-label",
      "status:in-review",
      "--add-label",
      "status:published",
      "--add-label",
      "status:done",
    ]);
    gh(["issue", "close", String(issue.number), "--reason", "completed"]);
    console.log(`closed with screenshot - #${issue.number} (${channel.id})`);
    return;
  }
  if (existingProof && !screenshotUrl) {
    console.log(
      `already-published - #${issue.number} ${existingProof} (pass --screenshot-url to close)`,
    );
    return;
  }

  const missing = missingEnvs(channel);
  if (missing.length > 0 || !channel.implemented) {
    const plan = pendingPlan(channel.id);
    const comment = [
      `## Publish blocked — ${channel.id}`,
      ``,
      `- Missing credentials: ${missing.map((m) => `\`${m}\``).join(", ") || "none stored"}`,
      plan ? `- Publish endpoint (when credentialed): ${plan.endpoint}` : "",
      plan?.policyNote ? `- Policy: ${plan.policyNote}` : "",
      ``,
      `Stays at \`status:packet-ready\`. See docs/SOCIAL_PUBLISHING.md for owner setup steps.`,
    ]
      .filter(Boolean)
      .join("\n");
    if (dryRun) {
      console.log(`would-flag-blocked - #${issue.number}\n${comment}`);
      return;
    }
    gh(["issue", "comment", String(issue.number), "--body", comment]);
    gh([
      "issue",
      "edit",
      String(issue.number),
      "--add-label",
      "needs-manual-post",
    ]);
    console.log(`flagged blocked - #${issue.number} (${channel.id})`);
    return;
  }

  const siteLabel = labelNames.find((l) => l.startsWith("site:")) ?? "";
  const accounts = accountsForSite(siteLabel.replace(/^site:/, ""));
  if (!accounts) {
    console.error(
      `no verified accounts for ${siteLabel || "unknown site"} — add to accounts.ts after the Graph handshake`,
    );
    process.exit(1);
  }
  const token = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  const captionFile = arg("--caption-file");
  const caption = captionFile
    ? (await import("node:fs")).readFileSync(captionFile, "utf8")
    : buildCaption(issue.body, channel.id, field(issue.body, "Social pillar"));
  const images = (arg("--images") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (images.length === 0) images.push(...imagesFromBody(issue.body));

  if (channel.id === "instagram") {
    if (arg("--schedule-at")) {
      console.error(
        "instagram has no native scheduling API — use **Publish at:** slots + --due instead",
      );
      process.exit(1);
    }
    if (!accounts.igUserId || images.length < 1 || images.length > 10) {
      console.error(
        "instagram needs verified igUserId + 1-10 public JPEG/PNG images (1 = single photo, 2-10 = carousel)",
      );
      process.exit(1);
    }
    await gateCopyAudit(issue, "instagram", dryRun);
    const igContentId =
      issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase() ??
      `issue-${issue.number}`;
    const igLedger = readMediaLedger();
    const igSite = siteLabel.replace(/^site:/, "") || undefined;
    const igReshare = reshareOfFromBody(issue.body);
    for (const url of images) {
      const conflicts = conflictingUsesForReshare(
        igLedger,
        url,
        igContentId,
        igSite,
        igReshare?.contentId,
      );
      if (conflicts.length > 0) {
        const owners = conflicts
          .map((c) => `#${c.issue}/${c.contentId}`)
          .join(", ");
        console.error(`image already used by ${owners}: ${url}`);
        process.exit(1);
      }
    }
    if (dryRun) {
      console.log(
        `would-publish-instagram-${images.length === 1 ? "photo" : "carousel"} - #${issue.number} to @${accounts.igUsername} (${images.length} images)\n---caption---\n${caption}`,
      );
      return;
    }
    const res =
      images.length === 1
        ? await publishPhoto(
            token,
            accounts.igUserId,
            images[0] as string,
            caption,
          )
        : await publishCarousel(token, accounts.igUserId, images, caption);
    for (const url of images) {
      try {
        claimImage(url, {
          issue: issue.number,
          contentId: igContentId,
          channel: channel.id,
          date: new Date().toISOString(),
          site: igSite,
          reshareOf: igReshare?.contentId,
        });
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    }
    const proof = [
      `## Platform publish proof — ${channel.id}`,
      ``,
      `- Post: ${res.permalink}`,
      `- Media ID: \`${res.mediaId}\` (published ${res.timestamp})`,
      screenshotUrl
        ? `- Screenshot:\n\n![${channel.id} post proof](${screenshotUrl})`
        : `- Screenshot: pending (re-run with --screenshot-url to close)`,
    ].join("\n");
    gh(["issue", "comment", String(issue.number), "--body", proof]);
    if (screenshotUrl) {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--remove-label",
        "status:packet-ready",
        "--remove-label",
        "needs-manual-post",
        "--remove-label",
        "needs-screenshot",
        "--add-label",
        "status:published",
        "--add-label",
        "status:done",
      ]);
      gh(["issue", "close", String(issue.number), "--reason", "completed"]);
      console.log(`published + closed - #${issue.number} ${res.permalink}`);
    } else {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--add-label",
        "status:packet-ready",
        "--add-label",
        "needs-screenshot",
        "--remove-label",
        "needs-manual-post",
      ]);
      console.log(
        `published, awaiting screenshot - #${issue.number} ${res.permalink}`,
      );
    }
    return;
  }

  if (channel.id === "facebook") {
    const destination = field(issue.body, "Destination");
    if (!destination) {
      console.error(
        "facebook needs a **Destination:** `url` in the issue body",
      );
      process.exit(1);
    }
    // No bare link posts: Meta would scrape the shared homepage OG image,
    // repeating one artwork under unrelated titles. Every FB post carries
    // its own JPEG/PNG visual via a photo post.
    const contentId =
      issue.title.match(/^\[Social\]\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase() ??
      `issue-${issue.number}`;
    const fbImage = selectFbImage(images);
    if (!fbImage) {
      const comment = [
        `## Publish blocked — ${channel.id} (needs-asset)`,
        ``,
        `- No per-post JPEG/PNG found. Add **Images:** \`https://…/1.jpg\` to the issue body`,
        `  (build a 1200x630 card from the packet source artwork, merge, verify 200).`,
        ``,
        `Stays at \`status:packet-ready\`. Link-scrape posts are refused by design.`,
      ].join("\n");
      if (dryRun) {
        console.log(`would-flag-needs-asset - #${issue.number}\n${comment}`);
        return;
      }
      gh(["issue", "comment", String(issue.number), "--body", comment]);
      gh(["issue", "edit", String(issue.number), "--add-label", "needs-asset"]);
      console.log(`flagged needs-asset - #${issue.number} (${channel.id})`);
      return;
    }
    const fbSite = siteLabel.replace(/^site:/, "") || undefined;
    const fbReshare = reshareOfFromBody(issue.body);
    const conflicts = conflictingUsesForReshare(
      readMediaLedger(),
      fbImage,
      contentId,
      fbSite,
      fbReshare?.contentId,
    );
    if (conflicts.length > 0) {
      const owners = conflicts
        .map((c) => `#${c.issue}/${c.contentId}`)
        .join(", ");
      console.error(`image already used by ${owners}: ${fbImage}`);
      process.exit(1);
    }
    await gateCopyAudit(issue, "facebook", dryRun);
    // Native FB scheduling: --schedule-at <ISO> posts via scheduled_publish_time
    // (10 min to 75 days out). Used by the nightly job; IG has no equivalent.
    const scheduleAtRaw = arg("--schedule-at");
    let schedule: { publishAtUnix: number } | undefined;
    let scheduledFor = "";
    if (scheduleAtRaw) {
      const when = new Date(scheduleAtRaw).getTime();
      if (
        Number.isNaN(when) ||
        when <= Date.now() + 10 * 60 * 1000 ||
        when > Date.now() + 75 * 86400000
      ) {
        console.error(
          `bad --schedule-at ${scheduleAtRaw}: want ISO 10min to 75d in the future`,
        );
        process.exit(1);
      }
      schedule = { publishAtUnix: Math.floor(when / 1000) };
      scheduledFor = new Date(when).toISOString();
    }
    if (dryRun) {
      console.log(
        `would-publish-facebook-photo - #${issue.number} to ${accounts.pageName} (${accounts.pageId})${scheduledFor ? ` scheduled for ${scheduledFor}` : ""}\n---caption---\n${caption}\n---image---\n${fbImage}\n---link---\n${destination}`,
      );
      return;
    }
    // Caption already ends with "CTA: <destination URL>" (buildCaption), and
    // Facebook linkifies that URL in place — do not append it a second time.
    const photoCaption = caption;
    const res = publishPhotoPost(
      token,
      accounts.pageId,
      fbImage,
      photoCaption,
      schedule,
    );
    claimImage(fbImage, {
      issue: issue.number,
      contentId,
      channel: channel.id,
      date: new Date().toISOString(),
      site: fbSite,
      reshareOf: fbReshare?.contentId,
    });
    if (verifyDelete) {
      deletePost(token, res.postId);
      console.log(
        `verified-then-deleted - ${res.postId} (proof: ${res.permalink})`,
      );
      return;
    }
    const proof = [
      `## Platform publish proof — ${channel.id}`,
      ``,
      `- Post: ${res.permalink}`,
      `- Post ID: \`${res.postId}\``,
      `- Image: ${fbImage} (per-post visual, photo post — no link-scrape)`,
      ...(scheduledFor
        ? [
            `- Scheduled for: \`${scheduledFor}\` (native FB scheduling; verify after due)`,
          ]
        : []),
      screenshotUrl
        ? `- Screenshot:\n\n![${channel.id} post proof](${screenshotUrl})`
        : `- Screenshot: pending (re-run with --screenshot-url to close)`,
    ].join("\n");
    gh(["issue", "comment", String(issue.number), "--body", proof]);
    if (screenshotUrl) {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--remove-label",
        "status:packet-ready",
        "--remove-label",
        "needs-manual-post",
        "--remove-label",
        "needs-screenshot",
        "--add-label",
        "status:published",
        "--add-label",
        "status:done",
      ]);
      gh(["issue", "close", String(issue.number), "--reason", "completed"]);
      console.log(`published + closed - #${issue.number} ${res.permalink}`);
    } else {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--add-label",
        "status:packet-ready",
        "--add-label",
        "needs-screenshot",
        "--remove-label",
        "needs-manual-post",
      ]);
      console.log(
        `published, awaiting screenshot - #${issue.number} ${res.permalink}`,
      );
    }
    return;
  }

  if (channel.id === "pinterest") {
    const { createPin, listBoards } = await import("./pinterest");
    const pinToken = process.env.PINTEREST_ACCESS_TOKEN ?? "";
    const boardId =
      arg("--board-id") ??
      process.env.PINTEREST_BOARD ??
      boardFromBody(issue.body);
    if (!boardId) {
      const boards = listBoards(pinToken);
      console.error(
        `pinterest needs --board-id. Available: ${boards.map((b) => `${b.name} (${b.id})`).join(", ") || "none"}`,
      );
      process.exit(1);
    }
    const image = images[0];
    const hook = field(issue.body, "Hook");
    const text = field(issue.body, "Body");
    const cta = field(issue.body, "CTA");
    const destination = field(issue.body, "Destination");
    if (!image || !destination) {
      console.error(
        "pinterest needs --images <public-url> and a **Destination:** `url` in the issue body",
      );
      process.exit(1);
    }
    const description = [text, "", `${cta}: ${destination}`].join("\n");
    if (dryRun) {
      console.log(
        `would-publish-pinterest - #${issue.number} to board ${boardId}\n---title---\n${hook}\n---image---\n${image}\n---link---\n${destination}`,
      );
      return;
    }
    const res = createPin(
      pinToken,
      boardId,
      image,
      hook,
      description,
      destination,
    );
    const proof = [
      `## Platform publish proof — ${channel.id}`,
      ``,
      `- Post: ${res.link}`,
      `- Pin ID: \`${res.id}\``,
      screenshotUrl
        ? `- Screenshot:\n\n![${channel.id} post proof](${screenshotUrl})`
        : `- Screenshot: pending (re-run with --screenshot-url to close)`,
    ].join("\n");
    gh(["issue", "comment", String(issue.number), "--body", proof]);
    if (screenshotUrl) {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--remove-label",
        "status:packet-ready",
        "--remove-label",
        "needs-manual-post",
        "--remove-label",
        "needs-screenshot",
        "--add-label",
        "status:published",
        "--add-label",
        "status:done",
      ]);
      gh(["issue", "close", String(issue.number), "--reason", "completed"]);
      console.log(`published + closed - #${issue.number} ${res.link}`);
    } else {
      gh([
        "issue",
        "edit",
        String(issue.number),
        "--add-label",
        "status:packet-ready",
        "--add-label",
        "needs-screenshot",
        "--remove-label",
        "needs-manual-post",
      ]);
      console.log(
        `published, awaiting screenshot - #${issue.number} ${res.link}`,
      );
    }
    return;
  }

  console.error(
    `channel ${channel.id} marked implemented without a publish path`,
  );
  process.exit(1);
}

const isPublishDueMain = (process.argv[1] ?? "").endsWith("publish-due.ts");
if (isPublishDueMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
