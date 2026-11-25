/**
 * Portfolio prioritization tiers.
 * Scores are relative 1-5 from registry evidence only:
 * revenue potential, conversion readiness, maturity, differentiation,
 * social-content potential, audience clarity, visual potential,
 * SEO potential, margin, demo ease, strategic importance.
 * Existing traffic / customer base marked unknown (all ids null in registry)
 * and excluded from scoring until measurement lands.
 */

export type GrowthTier = "tier1" | "tier2" | "tier3";

export type TierAssignment = {
  appId: string;
  tier: GrowthTier;
  score: number;
  rationale: string;
  postsPerWeek: number;
};

export const TIER_ASSIGNMENTS: TierAssignment[] = [
  {
    appId: "synthetic-pics",
    tier: "tier1",
    score: 58,
    rationale: "Purchasable downloads, strongest visual + Pinterest fit, clear discovery-to-purchase path.",
    postsPerWeek: 11,
  },
  {
    appId: "print3dmodels",
    tier: "tier1",
    score: 56,
    rationale: "Only true purchase event in registry, visual product pages, giftable use cases.",
    postsPerWeek: 5,
  },
  {
    appId: "mixphd",
    tier: "tier1",
    score: 55,
    rationale: "Recipe discovery plus affiliate revenue, evergreen Pinterest + SEO loop.",
    postsPerWeek: 5,
  },
  {
    appId: "proswing",
    tier: "tier2",
    score: 46,
    rationale: "Strong demo potential (before/after swing), activation clear, monetization not yet flagged.",
    postsPerWeek: 5,
  },
  {
    appId: "imgsquash",
    tier: "tier2",
    score: 45,
    rationale: "One-step tool demo, easy proof content, broad audience but low visual novelty.",
    postsPerWeek: 5,
  },
  {
    appId: "aicapturelab",
    tier: "tier2",
    score: 44,
    rationale: "High visual transformation value, purchase path, narrower audience than gallery apps.",
    postsPerWeek: 5,
  },
  {
    appId: "profitsignals",
    tier: "tier3",
    score: 34,
    rationale: "Subscription upside but regulated claims. Education-only content, no performance promises.",
    postsPerWeek: 5,
  },
  {
    appId: "aiceo",
    tier: "tier3",
    score: 32,
    rationale: "B2B subscription, LinkedIn-only fit. Founder insight format, low volume.",
    postsPerWeek: 5,
  },
];

export const PORTFOLIO_WEEKLY_TARGET = 46;
export const TIER_WEEKLY_TARGETS: Record<GrowthTier, number> = {
  tier1: 21,
  tier2: 15,
  tier3: 10,
};

export function tierFor(appId: string): GrowthTier {
  return TIER_ASSIGNMENTS.find((t) => t.appId === appId)?.tier ?? "tier3";
}
