/**
 * Social content taxonomy. Distinct from blog PILLARS in config/content/pillars.ts
 * which govern SEO authority. These govern short social distribution.
 */

export const SOCIAL_PILLARS = [
  "product",
  "proof",
  "education",
  "discovery",
  "how-to",
  "insight",
  "comparison",
  "use-case",
  "feature",
  "social-proof",
  "build",
  "experiment",
  "portfolio",
] as const;

export type SocialPillar = (typeof SOCIAL_PILLARS)[number];

export const SOCIAL_CONTENT_TYPES = [
  "pin",
  "carousel",
  "reel-concept",
  "short-demo-concept",
  "x-post",
  "linkedin-post",
  "facebook-post",
  "reddit-answer",
  "before-after",
  "how-to-card",
  "short-recipe-card",
] as const;

export type SocialContentType = (typeof SOCIAL_CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  "idea",
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "analyzing",
  "winner",
  "retire",
] as const;

export type SocialContentStatus = (typeof CONTENT_STATUSES)[number];

/** Starting portfolio mix. Hypothesis only, reweighted by conversion data. */
export const CONTENT_MIX: Record<string, number> = {
  education: 0.4,
  product: 0.25,
  proof: 0.15,
  discovery: 0.1,
  "use-case": 0.1,
};
