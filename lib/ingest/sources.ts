import { z } from "zod";

import { INGEST_LIMITS } from "./text";

/**
 * API validation for knowledge sources. Structural only — SSRF/DNS checks
 * run in the route handler with the injectable resolver (lib/security/ssrf),
 * and page fetching happens in the ingest worker, never here.
 */

const nameSchema = z.string().trim().min(1).max(120);

export const websiteSourceSchema = z.object({
  type: z.literal("website"),
  url: z.string().trim().min(1).max(2048),
  name: nameSchema.optional(),
  excludedPaths: z.array(z.string().trim().max(200)).max(50).optional(),
});

export const sitemapSourceSchema = z.object({
  type: z.literal("sitemap"),
  url: z.string().trim().min(1).max(2048),
  name: nameSchema.optional(),
  excludedPaths: z.array(z.string().trim().max(200)).max(50).optional(),
});

export const faqPairSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(5000),
});

export const faqSourceSchema = z.object({
  type: z.literal("faq"),
  name: nameSchema.optional(),
  pairs: z.array(faqPairSchema).min(1).max(INGEST_LIMITS.maxFaqPairs),
});

export const createSourceSchema = z.discriminatedUnion("type", [
  websiteSourceSchema,
  sitemapSourceSchema,
  faqSourceSchema,
]);

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const updateSourceSchema = z.object({
  name: nameSchema.optional(),
  excludedPaths: z.array(z.string().trim().max(200)).max(50).optional(),
});

export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

/** File metadata arrives as multipart fields; bytes arrive as the file. */
export function fileFieldSchema() {
  return z.object({
    type: z.literal("file"),
    name: nameSchema.optional(),
  });
}
