import { tierFor } from "@/config/social-growth/tiers";
import { APP_PLATFORM_FIT } from "@/config/social-growth/platform-matrix";

/**
 * Content opportunity scoring. Inputs are 1-5 evidence scores.
 * No fabricated traffic or revenue numbers; unknowns stay neutral (3).
 */

export type OpportunityInput = {
  appId: string;
  platform: string;
  businessValue: number;
  audienceRelevance: number;
  searchDemand: number;
  socialPotential: number;
  visualPotential: number;
  conversionProximity: number;
  freshness: number;
  reusability: number;
};

export function scoreOpportunity(input: OpportunityInput): number {
  const tierWeight = tierFor(input.appId) === "tier1" ? 1.2 : tierFor(input.appId) === "tier2" ? 1.0 : 0.8;
  const fit = APP_PLATFORM_FIT[input.appId]?.[input.platform] ?? "experimental";
  const fitWeight = fit === "primary" ? 1.2 : fit === "secondary" ? 1.0 : fit === "experimental" ? 0.8 : 0.3;
  const base =
    input.businessValue * 3 +
    input.conversionProximity * 2 +
    input.audienceRelevance +
    input.searchDemand +
    input.socialPotential +
    input.visualPotential +
    input.freshness +
    input.reusability;
  return Math.round(base * tierWeight * fitWeight * 10) / 10;
}
