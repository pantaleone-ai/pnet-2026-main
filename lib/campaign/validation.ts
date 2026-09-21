import { z } from "zod";

export const channelSchema = z.enum([
  "website",
  "linkedin",
  "email",
  "x",
  "instagram",
  "facebook",
  "youtube",
]);

export const promoteSchema = z.object({
  brand_id: z.string().min(1).max(128).optional(),
  source_content_id: z.string().min(1).max(128).optional(),
  objective: z.string().min(1).max(120).default("Awareness"),
  audience_ids: z.array(z.string().min(1).max(128)).max(20).optional(),
  channels: z.array(channelSchema).min(1).max(7).optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
  autonomy_level: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
});

export const reviewerSchema = z.object({
  reviewer: z.string().min(1).max(254).optional(),
});

export const executeSchema = z.object({
  dry_run: z.boolean().optional(),
});

export const metricSchema = z.object({
  publication_id: z.string().min(1).max(128),
  metric_type: z.string().min(1).max(64),
  metric_value: z.number().finite(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const tickSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  dry_run: z.boolean().optional(),
});

export const detectSchema = z.object({
  brand_id: z.string().min(1).max(128).optional(),
});

export const ingestSchema = z.object({
  brand_id: z.string().min(1).max(128).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const eventSchema = z.object({
  type: z.string().min(1).max(120),
  entity_id: z.string().min(1).max(128),
  payload: z.record(z.string(), z.unknown()).optional(),
});
