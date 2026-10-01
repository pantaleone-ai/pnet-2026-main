import posthog from "posthog-js";
import { z } from "zod";

import { track as normalizeGrowthEvent } from "@/lib/growth/events";
import type { TrackInput } from "@/lib/growth/events";

const eventSchema = z.object({
  name: z.enum([
    "open_command_menu",
    "command_menu_search",
    "command_menu_action",
    "blog_search",
    "contact_form_submitted",
    "contact_form_failed",
    "project_live_demo_clicked",
    "project_github_clicked",
    "blog_post_read_more_clicked",
    "blog_share_x",
    "blog_share_linkedin",
    "blog_copy_link",
    "cta_contact_me_clicked",
    "social_link_clicked",
    "application_error",
    "error_retry_clicked",
    "featured_story_read_more_clicked",
    "select_item",
  ]),
  properties: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

export type Event = z.infer<typeof eventSchema>;

export function trackEvent(input: Event) {
  const event = eventSchema.parse(input);
  if (event) {
    posthog.capture(event.name, event.properties);
  }
}

export function captureException(
  error: Error,
  properties?: Record<string, unknown>,
) {
  posthog.captureException(error, properties);
}

/**
 * Growth bridge: normalize a portfolio event through `lib/growth` (injects
 * `app_id`, `event_id`, UTM, consent) then capture to PostHog. Existing
 * `trackEvent` callers are untouched.
 */
export function trackGrowthEvent(input: TrackInput) {
  const normalized = normalizeGrowthEvent(input);
  posthog.capture(normalized.event, {
    app_id: normalized.app_id,
    event_id: normalized.event_id,
    ...normalized.utm,
    ...normalized.properties,
  });
  return normalized;
}
