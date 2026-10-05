import type { SocialContent } from "@/lib/social-growth/content-model";

/**
 * Serialize/parse SocialContent to GitHub issue body **Field:** `value` lines.
 * Keeps gh.ts parsers working. No secrets ever written to bodies.
 */

const FIELDS = [
  "App",
  "Platform",
  "Social pillar",
  "Content type",
  "Content ID",
  "Hook",
  "Body",
  "CTA",
  "Destination",
  "Media",
  "Campaign",
  "Creative",
  "Publish at",
  "Priority",
  "Audience",
  "Source asset",
] as const;

export function socialIssueTitle(contentId: string, hook: string): string {
  const short = hook.length > 60 ? `${hook.slice(0, 60)}…` : hook;
  return `[Social] ${contentId} — ${short}`;
}

export function socialIssueBody(c: SocialContent): string {
  return [
    `**App:** \`${c.appId}\``,
    `**Platform:** \`${c.platform}\``,
    `**Social pillar:** \`${c.pillar}\``,
    `**Content type:** \`${c.contentType}\``,
    `**Content ID:** \`${c.contentId}\``,
    `**Hook:** \`${c.hook}\``,
    `**Body:** \`${c.body}\``,
    `**CTA:** \`${c.cta}\``,
    `**Destination:** \`${c.destinationUrl}\``,
    `**Media:** \`${c.format ?? ""}\``,
    `**Campaign:** \`${c.campaignId}\``,
    `**Creative:** \`${c.creativeId}\``,
    `**Publish at:** \`${c.publishAt ?? ""}\``,
    `**Priority:** \`${c.priority}\``,
    `**Audience:** \`${c.audience ?? ""}\``,
    `**Source asset:** \`${c.sourceAsset ?? ""}\``,
    ``,
    `## Execution`,
    ``,
    `Follow \`docs/SOCIAL_GROWTH_OS.md\`. Branch: \`social/<issue-number>-${c.contentId}\`.`,
    `PR body must reference \`Closes #<issue-number>\` with hook, CTA, destination,`,
    `UTM verification, creative spec, and platform screenshot note.`,
  ].join("\n");
}

function field(body: string, name: string): string | undefined {
  const match = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*\`([^\`]*)\``));
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

export function parseSocialIssueBody(body: string): Partial<SocialContent> {
  return {
    appId: field(body, "App"),
    platform: field(body, "Platform"),
    pillar: field(body, "Social pillar") as SocialContent["pillar"] | undefined,
    contentType: field(body, "Content type") as SocialContent["contentType"] | undefined,
    topic: field(body, "App"),
    hook: field(body, "Hook"),
    body: field(body, "Body"),
    cta: field(body, "CTA"),
    destinationUrl: field(body, "Destination"),
    campaignId: field(body, "Campaign"),
    creativeId: field(body, "Creative"),
    publishAt: field(body, "Publish at"),
    priority: (field(body, "Priority") as SocialContent["priority"]) ?? undefined,
    audience: field(body, "Audience"),
    sourceAsset: field(body, "Source asset"),
  };
}

export const SOCIAL_ISSUE_FIELDS = FIELDS;
