import { CALENDAR_30D, type CalendarPost } from "@/config/social-growth/calendar-30d";
import { validateSocialNaming } from "@/lib/social-growth/social-utm";

/**
 * Calendar helpers: filtering and QA. UTM validation reuses growth standard.
 */
export function postsForApp(appId: string): CalendarPost[] {
  return CALENDAR_30D.filter((p) => p.appId === appId);
}

export function postsForPlatform(platform: string): CalendarPost[] {
  return CALENDAR_30D.filter((p) => p.platform === platform);
}

export type CalendarIssue = { contentId: string; errors: string[] };

export function validateCalendar(posts: CalendarPost[] = CALENDAR_30D): CalendarIssue[] {
  const issues: CalendarIssue[] = [];
  for (const p of posts) {
    const errors: string[] = [];
    if (!p.cta) errors.push("missing CTA");
    if (!p.destinationUrl.includes("utm_source=")) errors.push("missing utm_source");
    if (!p.destinationUrl.includes("utm_medium=organic_social")) errors.push("medium must be organic_social");
    if (!p.destinationUrl.includes("utm_campaign=")) errors.push("missing utm_campaign");
    const naming = validateSocialNaming(p.campaignId, p.creativeId);
    if (!naming.campaign.valid) errors.push(`campaign: ${naming.campaign.errors.join("; ")}`);
    if (!naming.creative.valid) errors.push(`creative: ${naming.creative.errors.join("; ")}`);
    if (p.hook.length > 220) errors.push("hook too long");
    if (errors.length > 0) issues.push({ contentId: p.contentId, errors });
  }
  return issues;
}
