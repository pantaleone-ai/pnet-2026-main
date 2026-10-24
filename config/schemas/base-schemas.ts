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
  pillar: z.string().optional(),
  cluster: z.string().optional(),
  intent: z.string().optional(),
  status: z.string().optional(),
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
 * Schema for AI blueprint entries (features/blueprints/content).
 * Mirrors blogPostSchema and adds the blueprint taxonomy: one primary
 * type per blueprint, the concrete stack, and explicit code-package
 * availability so listings never imply a download that does not exist.
 */
export const blueprintSchema = frontmatterSchema.extend({
  title: z.string(),
  description: z.string(),
  created: z.string(),
  lastUpdated: z.string().optional(),
  image: z.string(),
  imageAlt: z.string().optional(),
  author: z.string().optional(),
  blueprintType: z.enum([
    "ai-agent",
    "automation-workflow",
    "agentic-workflow",
  ]),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  techStacks: z.array(z.string()).optional(),
  integrations: z.array(z.string()).optional(),
  hasCodePackage: z.boolean().default(false),
  codeUrl: z.string().optional(),
  workflowFile: z.string().optional(),
  difficulty: z.string().optional(),
  seo: z.array(z.string()).optional(),
  status: z.string().optional(),
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
  mpn: z.string().optional(),
  gtin: z.string().optional(),
  inventory: z.number().default(9999),
  availability: z.string().default("in_stock"),
  condition: z.string().default("new"),
  brand: z.string().default("Pantaleone Digital Services"),
  googleProductCategory: z.string().optional(),
  productType: z.string().optional(),
  identifierExists: z.boolean().default(false),
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
  priceValidUntil: z.string().optional(),
  brandLogo: z.string().optional(),
  timeToValue: z.number().optional(),
  targetKeywords: z.array(z.string()).optional(),
  documentationUrl: z.string().optional(),
  architectureDiagram: z.string().optional(),
  coreStack: z.array(z.string()).optional(),
  primaryLibraries: z.array(z.string()).optional(),
  infrastructureRequirements: z.array(z.string()).optional(),
});
