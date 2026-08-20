import type { MetadataRoute } from "next";

import { getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";

const LAST_MODIFIED = "2026-07-29";

// Content changes require a redeploy, so the sitemap is only built at
// deploy time. No time-based revalidation means no ISR reads.
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  // Add shop product pages - use directory-based category URLs
  const shopProducts = getProducts().map((product) => {
    // Map category names to directory-based URLs
    const categorySlug = product.category === "Apps" ? "ai-apps" :
                        product.category === "Ai Workflows" ? "ai-workflows" :
                        product.category.toLowerCase().replace(/\s+/g, '-');

    return {
      url: getBaseUrl(`/shop/${categorySlug}/${product.slug}`),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  return shopProducts;
}
