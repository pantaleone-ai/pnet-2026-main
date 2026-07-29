import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProducts } from "@/features/shop/data/shopSource";
import { getBaseUrl } from "@/lib/helpers";
import { Feed } from "feed";

export const revalidate = 86400; // 24 hours

// Fixed date to avoid non-deterministic ISR output
const BUILD_DATE = new Date("2026-07-29");

export async function GET() {
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );

  const feed = new Feed({
    title: "Pantaleone.net AI Product and Blog RSS Feed",
    description: "Latest products and posts from Pantaleone.net",
    id: getBaseUrl(),
    link: getBaseUrl(),
    language: "en",
    image: getBaseUrl("/favicons/favicon-32x32.png"),
    favicon: getBaseUrl("/favicons/favicon.ico"),
    copyright: `All rights reserved ${BUILD_DATE.getFullYear()}`,
    updated: BUILD_DATE,
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: getBaseUrl(`/blog/${post.slug}`),
      link: getBaseUrl(`/blog/${post.slug}`),
      description: post.description,
      content: post.description,
      date: new Date(post.created),
    });
  });

  // Add shop products to RSS feed
  const products = getProducts();
  products.forEach((product) => {
    // Map category names to directory-based URLs
    const categorySlug = product.category === "Apps" ? "ai-apps" :
                        product.category === "Ai Workflows" ? "ai-workflows" :
                        product.category.toLowerCase().replace(/\s+/g, '-');
    feed.addItem({
      title: product.title,
      id: getBaseUrl(`/shop/${categorySlug}/${product.slug}`),
      link: getBaseUrl(`/shop/${categorySlug}/${product.slug}`),
      description: product.description,
      content: product.description,
      date: BUILD_DATE,
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
