import type { MetadataRoute } from "next";

import { getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";

export default function sitemap(): MetadataRoute.Sitemap {
  // Add shop product pages - use directory-based category URLs
  const shopProducts = getProducts().map((product) => {
    // Map category names to directory-based URLs
    const categorySlug = product.category === "Apps" ? "ai-apps" :
                        product.category === "Ai Workflows" ? "ai-workflows" :
                        product.category.toLowerCase().replace(/\s+/g, '-');

    return {
      url: getBaseUrl(`/shop/${categorySlug}/${product.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8, // Higher priority for product pages in dedicated sitemap
    };
  });

  return shopProducts;
}
