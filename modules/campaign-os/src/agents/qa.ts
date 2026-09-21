// QA Agent — explicit criteria, scored {status, score, issues, suggested_changes}.
// Reuses anti-slop philosophy: ban generic AI phrasing, require specificity.
import { CampaignStore } from "../store";
import { Brand, QAResult } from "../types";

const BANNED = [
  "unlock",
  "revolutionize",
  "game-changing",
  "seamlessly",
  "delve",
  "in today's rapidly changing world",
  "leverage",
  "tapestry",
  "testament",
];

export function qaAsset(
  store: CampaignStore,
  brand: Brand,
  _campaignId: string,
  assetId: string,
  channel: string,
  title: string,
  body: string,
  cta: string,
): QAResult {
  const issues: QAResult["issues"] = [];
  const suggested: string[] = [];
  let score = 100;
  const fail = (
    criterion: string,
    detail: string,
    penalty: number,
    suggestion?: string,
  ) => {
    issues.push({ criterion, detail });
    score -= penalty;
    if (suggestion) suggested.push(suggestion);
  };
  if (!title.trim())
    fail("title", "Missing title", 15, "Add a specific title.");
  if (!body.trim() || body.trim().length < 40)
    fail(
      "length",
      "Body too short to be useful",
      20,
      "Add specific detail from the source.",
    );
  for (const phrase of [
    ...BANNED,
    ...(brand.voice_config.prohibited_terminology ?? []),
  ]) {
    if (
      body.toLowerCase().includes(phrase.toLowerCase()) ||
      title.toLowerCase().includes(phrase.toLowerCase())
    )
      fail(
        "brand_voice",
        `Contains banned phrase: "${phrase}"`,
        12,
        `Rewrite without "${phrase}".`,
      );
  }
  if (!body.includes(cta) && !title.includes(cta))
    fail(
      "cta_quality",
      "CTA missing from asset",
      10,
      "Include the campaign CTA verbatim.",
    );
  if (channel === "x" && body.length > 280)
    fail(
      "channel_fit",
      `X post exceeds 280 chars (${body.length})`,
      10,
      "Shorten to under 280 characters.",
    );
  if (channel === "linkedin" && body.split(/\s+/).length > 220)
    fail(
      "channel_fit",
      "LinkedIn post too long",
      8,
      "Trim to under ~150 words.",
    );
  if (channel === "email" && !/subject:/i.test(body) && !title)
    fail(
      "channel_fit",
      "Email missing subject",
      10,
      "Add Subject + preview text.",
    );
  if (/(lorem ipsum|TODO|FIXME|\[insert\])/i.test(body))
    fail(
      "factual_consistency",
      "Placeholder content detected",
      25,
      "Replace placeholders with real content.",
    );
  if (
    !/https?:\/\//.test(body) &&
    (channel === "website" || channel === "email")
  )
    fail(
      "links",
      "No link present for website/email asset",
      5,
      "Add canonical + UTM-tagged link.",
    );
  const status = score >= 80 ? "pass" : score >= 55 ? "revise" : "block";
  const result: QAResult = {
    status,
    score: Math.max(0, score),
    issues,
    suggested_changes: suggested,
  };
  store.recordAgentExecution({
    agent: "qa",
    task: `qa:${channel}`,
    input_ref: assetId,
    output: result,
    model: "rules-v1",
    prompt_version: "1.0.0",
    duration_ms: 0,
    status: "ok",
  });
  store.audit("qa-agent", `qa:${status}`, "asset", assetId, {
    score: result.score,
    issues: issues.length,
  });
  return result;
}
