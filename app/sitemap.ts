import type { MetadataRoute } from "next";

import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProducts, getCategories } from "@/features/shop/data/shopSource";
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

  // Add shop category pages
  const shopCategories = getCategories().map((category) => ({
    url: getBaseUrl(`/shop/${category.toLowerCase().replace(/\s+/g, '-')}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Add shop product pages
  const shopProducts = getProducts().map((product) => ({
    url: getBaseUrl(`/shop/${product.category.toLowerCase().replace(/\s+/g, '-')}/${product.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPosts, shopMainPage, ...shopCategories, ...shopProducts];
}
