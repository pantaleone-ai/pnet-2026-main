import { z } from "zod";

export const shopCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  imageUrl: z.string().optional(),
  weight: z.number().default(0),
});

export type ShopCategory = z.infer<typeof shopCategorySchema>;
