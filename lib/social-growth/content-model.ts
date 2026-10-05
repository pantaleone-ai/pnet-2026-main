import { z } from "zod";
import { SOCIAL_CONTENT_TYPES, SOCIAL_PILLARS, CONTENT_STATUSES } from "@/config/social-growth/taxonomy";

/**
 * Social content object. Reuses growth event/UTM naming, adds no tracking.
 * No credentials or secrets in content data.
 */
export const socialContentSchema = z.object({
  contentId: z.string().min(1),
  appId: z.string().min(1),
  platform: z.string().min(1),
  contentType: z.enum(SOCIAL_CONTENT_TYPES),
  pillar: z.enum(SOCIAL_PILLARS),
  topic: z.string().min(1),
  hook: z.string().min(1).max(220),
  body: z.string().min(1).max(2000),
  cta: z.string().min(1),
  destinationUrl: z.string().url(),
  campaignId: z.string().min(1),
  creativeId: z.string().min(1),
  utmId: z.string().optional(),
  publishAt: z.string().optional(),
  status: z.enum(CONTENT_STATUSES).default("idea"),
  priority: z.enum(["p1", "p2", "p3"]).default("p2"),
  audience: z.string().optional(),
  format: z.string().optional(),
  sourceAsset: z.string().optional(),
  variant: z.string().optional(),
  performanceStatus: z.string().optional(),
});

export type SocialContent = z.infer<typeof socialContentSchema>;

export function validateSocialContent(input: unknown) {
  return socialContentSchema.safeParse(input);
}
