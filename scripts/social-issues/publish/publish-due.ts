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
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { accountsForSite } from "./accounts";
import { buildCaption as composeCaption } from "@/lib/social-growth/caption";
import {
  channelForLabelNames,
  missingEnvs,
  type ChannelSpec,
} from "./channels";
import { deletePost, publishLinkPost } from "./facebook";
import { publishCarousel } from "./instagram";
import { pendingPlan } from "./pending-channels";

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
    console.error("Usage: publish-due.ts --issue <n> [options]");
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
    if (!accounts.igUserId || images.length < 2) {
      console.error(
        "instagram needs verified igUserId + --images u1,u2[,...] (2-10 public JPEG/PNG)",
      );
      process.exit(1);
    }
    if (dryRun) {
      console.log(
        `would-publish-instagram - #${issue.number} to @${accounts.igUsername} (${images.length} images)\n---caption---\n${caption}`,
      );
      return;
    }
    const res = await publishCarousel(
      token,
      accounts.igUserId,
      images,
      caption,
    );
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
    if (dryRun) {
      console.log(
        `would-publish-facebook - #${issue.number} to ${accounts.pageName} (${accounts.pageId})\n---caption---\n${caption}\n---link---\n${destination}`,
      );
      return;
    }
    const res = publishLinkPost(token, accounts.pageId, caption, destination);
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
