import type { MetadataRoute } from "next";

import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";

export default function sitemap(): MetadataRoute.Sitemap {
  // Define static pages with their configurations
  const staticPages = [
    {
      url: getBaseUrl(),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0, // Homepage gets highest priority
    },
    {
      url: getBaseUrl("/projects"),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/blog"),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: getBaseUrl("/contact"),
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  const blogPosts = getBlogPosts().map((post) => ({
    url: getBaseUrl(`/blog/${post.slug}`),
    lastModified: post.lastUpdated
      ? new Date(post.lastUpdated)
      : new Date(post.created || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Add shop main page
  const shopMainPage = {
    url: getBaseUrl("/shop"),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  // Add shop category pages - use directory-based URLs that match routing
  const shopCategories = [
    {
      url: getBaseUrl("/shop/ai-apps"),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: getBaseUrl("/shop/ai-workflows"),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

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
      priority: 0.7,
    };
  });

  return [...staticPages, ...blogPosts, shopMainPage, ...shopCategories, ...shopProducts];
}
