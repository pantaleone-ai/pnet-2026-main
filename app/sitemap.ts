import type { MetadataRoute } from "next";

import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getCategories, getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl, getProductCategorySlug } from "@/lib/helpers";

// Deploy revision date for undated static pages (services, b2b, contact,
// privacy, changelog, shop hubs). Dated content (blog posts) uses real
// created/lastUpdated dates below. Static pages share the deploy date
// because they change only on redeploy — not per-URL freshness signals.
const LAST_MODIFIED = "2026-09-27";

// Content changes require a redeploy, so the sitemap is only built at
// deploy time. No time-based revalidation means no ISR reads.
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  // Define static pages with their configurations
  const staticPages = [
    {
      url: getBaseUrl(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: getBaseUrl("/projects"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/blog"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/contact"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: getBaseUrl("/services"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/b2b"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/resources/ai-readiness-guide"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: getBaseUrl("/privacy"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: getBaseUrl("/changelog"),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];

  const blogPosts = getBlogPosts().map((post) => ({
    url: getBaseUrl(`/blog/${post.slug}`),
    lastModified: post.lastUpdated || post.created || LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Add shop main page
  const shopMainPage = {
    url: getBaseUrl("/shop"),
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  // Add shop category pages from the canonical shop data source so new
  // categories are picked up without hardcoding slugs here.
  const shopCategories = getCategories().map((category) => ({
    url: getBaseUrl(`/shop/${getProductCategorySlug(category)}`),
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Add shop product pages - use directory-based category URLs
  const shopProducts = getProducts().map((product) => {
    const categorySlug = getProductCategorySlug(product.category);
    return {
      url: getBaseUrl(`/shop/${categorySlug}/${product.slug}`),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [
    ...staticPages,
    ...blogPosts,
    shopMainPage,
    ...shopCategories,
    ...shopProducts,
  ];
}
