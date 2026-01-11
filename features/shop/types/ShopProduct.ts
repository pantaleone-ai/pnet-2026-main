import { z } from "zod";
import { baseProjectSchema } from "@/config/schemas/base-schemas";

export const shopProductSchema = baseProjectSchema.extend({
  price: z.number(),
  currency: z.string().default("USD"),
  sku: z.string().optional(),
  inventory: z.number().optional(),
  purchaseUrl: z.string().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  stripePaymentLink: z.string().optional(),
  category: z.string(),
  featured: z.boolean().default(false),
  isDigital: z.boolean().default(true),
  weight: z.number().optional(),
  gtin: z.string().optional(), // UPC/EAN/GTIN for product feeds
});

type ShopProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku?: string;
  inventory?: number;
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
  gtin?: string; // UPC/EAN/GTIN for product feeds
};

export type { ShopProduct };
