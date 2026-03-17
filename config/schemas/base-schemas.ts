import { z } from "zod";
import { frontmatterSchema } from "fumadocs-mdx/config";

/**
 * Base schema for project/app content types
 * Used by featuredApps, webApps, and projects collections
 */
export const baseProjectSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  featured: z.boolean(),
  showOnPortfolio: z.boolean().default(true),
  websiteUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  videoEmbedUrl: z.string().optional(),
  videoEmbedAlt: z.string().optional(),
  techStacks: z.array(z.string()).optional(),
  weight: z.number().optional(),
});

/**
 * Schema for blog posts
 */
export const blogPostSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  created: z.string(),
  lastUpdated: z.string().optional(),
  image: z.string(),
  imageAlt: z.string().optional(),
  author: z.string().optional(),
  authorAvatar: z.string().optional(),
  authorAvatarAlt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo: z.array(z.string()).optional(),
});

/**
 * Schema for privacy policy content
 */
export const privacySchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string().optional(),
  lastModified: z.union([z.string(), z.number(), z.date()]).optional(),
});

/**
 * Schema for changelog entries
 */
export const changelogSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  created: z.string(),
});

/**
 * Schema for shop products
 */
export const shopProductSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  currency: z.string().default("USD"),
  sku: z.string().optional(),
  mpn: z.string().optional(), // Manufacturer Part Number
  gtin: z.string().optional(), // UPC/EAN/GTIN for product feeds
  inventory: z.number().optional(),
  purchaseUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  additionalImages: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string().optional(),
      }),
    )
    .optional(),
  featured: z.boolean().default(false),
  isDigital: z.boolean().default(true),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  websiteUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  videoEmbedUrl: z.string().optional(),
  videoEmbedAlt: z.string().optional(),
  techStacks: z.array(z.string()).optional(),
  weight: z.number().optional(),
  itemCondition: z
    .enum(["NewCondition", "UsedCondition", "RefurbishedCondition"])
    .optional(),
  priceValidUntil: z.string().optional(), // ISO date string for sale expiration
  brandLogo: z.string().optional(),
  timeToValue: z.number().optional(),
  targetKeywords: z.array(z.string()).optional(),
  documentationUrl: z.string().optional(),
  architectureDiagram: z.string().optional(),
  coreStack: z.array(z.string()).optional(),
  primaryLibraries: z.array(z.string()).optional(),
  infrastructureRequirements: z.array(z.string()).optional(),
});
