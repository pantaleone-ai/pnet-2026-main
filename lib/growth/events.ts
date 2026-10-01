/**
 * Growth event taxonomy (pure, extractable).
 *
 * 14 standard events shared across the portfolio plus per-app extensions.
 * zod-validated; `track()` normalizes a payload by injecting `app_id`,
 * `event_id`, UTM context, and consent state. No side effects — vendors
 * receive the payload from platform adapters, never from here.
 */

import { z } from "zod";

export const STANDARD_EVENTS = [
  "page_view",
  "session_start",
  "signup_started",
  "signup_completed",
  "signin_completed",
  "cta_clicked",
  "lead_submitted",
  "contact_submitted",
  "search_performed",
  "checkout_started",
  "purchase_completed",
  "subscription_started",
  "affiliate_click",
  "analysis_completed",
] as const;

export const APP_EXTENSION_EVENTS = [
  "compression_completed",
  "swing_uploaded",
  "artwork_saved",
  "artwork_downloaded",
  "product_viewed",
  "workflow_completed",
  "download_completed",
  "recipe_saved",
] as const;

export const GROWTH_EVENTS = [...STANDARD_EVENTS, ...APP_EXTENSION_EVENTS] as const;

export type GrowthEventName = (typeof GROWTH_EVENTS)[number];

const utmContextSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  utm_id: z.string().optional(),
});

export type UtmContext = z.infer<typeof utmContextSchema>;

const trackInputSchema = z.object({
  app: z.string().min(1),
  event: z.enum(GROWTH_EVENTS),
  event_id: z.string().min(1).optional(),
  utm: utmContextSchema.optional(),
  consented: z.boolean(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type TrackInput = z.infer<typeof trackInputSchema>;

export type TrackedEvent = {
  app_id: string;
  event: GrowthEventName;
  event_id: string;
  utm: UtmContext;
  consented: boolean;
  properties: Record<string, string | number | boolean | null>;
};

export function track(input: TrackInput, eventId?: string): TrackedEvent {
  const parsed = trackInputSchema.parse(input);
  return {
    app_id: parsed.app,
    event: parsed.event,
    event_id: parsed.event_id ?? eventId ?? `${Date.now().toString(36)}-fallback`,
    utm: parsed.utm ?? {},
    consented: parsed.consented,
    properties: parsed.properties ?? {},
  };
}
