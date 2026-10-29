import {
  buildCampaignName,
  buildCreativeName,
  buildUtmUrl,
  validateCampaignName,
  validateCreativeName,
} from "@/lib/growth/utm";

/**
 * Social UTM wrapper. Reuses lib/growth/utm.ts as the single standard.
 * Social convention: utm_medium=organic_social, utm_source=<platform>.
 * Paid convention (opt-in): utm_medium=paid_social, utm_source=<meta|tiktok|youtube>.
 * Never introduce a competing convention.
 */

export type SocialCampaignInput = {
  app: string;
  platform: string;
  objective: string;
  audience: string;
  geo?: string;
  yyyymm: string;
};

export function buildSocialCampaign(input: SocialCampaignInput): string {
  return buildCampaignName({
    app: input.app,
    platform: input.platform,
    objective: input.objective,
    audience: input.audience,
    geo: input.geo ?? "US",
    yyyymm: input.yyyymm,
  });
}

export function buildSocialCreative(app: string, concept: string, format: string, variant: string): string {
  return buildCreativeName({ app, concept, format, variant });
}

export function buildSocialUrl(
  baseUrl: string,
  opts: { platform: string; campaign: string; creative: string; utmId?: string },
): string {
  return buildUtmUrl(
    baseUrl,
    {
      utm_source: opts.platform,
      utm_medium: "organic_social",
      utm_campaign: opts.campaign,
      utm_content: opts.creative,
      utm_id: opts.utmId,
    },
    "organic_social",
  );
}

/**
 * Paid prep (Meta/TikTok/YouTube). Same campaign/creative naming standard,
 * only the medium + source change. Requires explicit `--paid` flag at packet
 * time and credentialed publish endpoint. Organic path untouched.
 */
export function buildPaidSocialUrl(
  baseUrl: string,
  opts: {
    paidPlatform: "meta" | "tiktok" | "youtube";
    campaign: string;
    creative: string;
    utmId?: string;
  },
): string {
  return buildUtmUrl(
    baseUrl,
    {
      utm_source: opts.paidPlatform,
      utm_medium: "paid_social",
      utm_campaign: opts.campaign,
      utm_content: opts.creative,
      utm_id: opts.utmId,
    },
    "paid_social",
  );
}

export function validateSocialNaming(campaign: string, creative: string) {
  return {
    campaign: validateCampaignName(campaign),
    creative: validateCreativeName(creative),
  };
}
