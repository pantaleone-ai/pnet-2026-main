import { z } from "zod";
import { baseProjectSchema } from "@/config/schemas/base-schemas";

export const shopProductSchema = baseProjectSchema.extend({
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
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  stripePaymentLink: z.string().optional(),
  category: z.string(),
  featured: z.boolean().default(false),
  isDigital: z.boolean().default(true),
  weight: z.number().optional(),
});

type ShopProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku?: string;
  mpn?: string;
  gtin?: string;
  inventory: number;
  availability: string;
  condition: string;
  brand: string;
  googleProductCategory?: string;
  productType?: string;
  identifierExists: boolean;
  purchaseUrl?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  stripePaymentLink?: string;
  imageUrl: string;
  imageAlt?: string;
  additionalImages?: {
    url: string;
    alt?: string;
  }[];
  featured?: boolean;
  isDigital?: boolean;
  fromDate?: string;
  toDate?: string;
  websiteUrl?: string;
  githubUrl?: string;
  videoEmbedUrl?: string;
  videoEmbedAlt?: string;
  techStacks?: string[];
  weight?: number;
  slug: string;
  content?: string;
  readingTime?: string;
  readingTimeMinutes?: number;
  itemCondition?: "NewCondition" | "UsedCondition" | "RefurbishedCondition";
  priceValidUntil?: string;
  brandLogo?: string;
  timeToValue?: number;
  targetKeywords?: string[];
  documentationUrl?: string;
  architectureDiagram?: string;
  coreStack?: string[];
  primaryLibraries?: string[];
  infrastructureRequirements?: string[];
};

export type { ShopProduct };
