import { shop } from "@/.source/server";
import type { Source, SourceConfig } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import type { ShopProduct } from "../types/ShopProduct";
import fs from "fs";
import path from "path";
import readingTime from "reading-time";
import React from "react";

const shopDocs = shop as unknown as { toFumadocsSource: () => unknown };

export const shopSource = loader({
  baseUrl: "/shop",
  source: shopDocs.toFumadocsSource() as Source<SourceConfig>,
});

type Page = ReturnType<typeof shopSource.getPages>[number];

function getProduct(page: Page, index: number): ShopProduct {
  const data = page.data as unknown as ShopProduct & {
    body: React.ComponentType<object>;
  };

  // Generate slug from page slugs or title - use only the filename part
  const slug = page.slugs.length > 0 ? page.slugs[page.slugs.length - 1]?.replace(/\.mdx?$/, '') || data.title.toLowerCase().replace(/\s+/g, '-') : data.title.toLowerCase().replace(/\s+/g, '-');

  // Get file path for reading content
  const pageWithFile = page as Page & { file: { path: string } };
  let filePath = "";
  if (pageWithFile.file?.path) {
    filePath = path.join(
      process.cwd(),
      "features/shop/content",
      pageWithFile.file.path,
    );
  } else if (slug) {
    filePath = path.join(
      process.cwd(),
      "features/shop/content",
      `${slug}.mdx`,
    );
  }

  // Read and process MDX content
  let contentStr = "";
  let readingTimeText = "";
  let readingTimeMinutes = 0;

  if (filePath && fs.existsSync(filePath)) {
    contentStr = fs.readFileSync(filePath, "utf-8");
    const readingTimeStats = readingTime(contentStr);
    readingTimeText = readingTimeStats.text;
    readingTimeMinutes = Math.round(readingTimeStats.minutes);
  }

  return {
    id: index,
    title: data.title,
    description: data.description,
    category: data.category,
    price: data.price,
    currency: data.currency ?? "USD",
    sku: data.sku,
    inventory: data.inventory,
    purchaseUrl: data.purchaseUrl,
    imageUrl: data.imageUrl ?? "",
    imageAlt: data.imageAlt ?? "",
    additionalImages: data.additionalImages,
    featured: data.featured ?? false,
    isDigital: data.isDigital ?? true,
    fromDate: data.fromDate ?? "",
    toDate: data.toDate ?? "",
    websiteUrl: data.websiteUrl,
    githubUrl: data.githubUrl,
    videoEmbedUrl: data.videoEmbedUrl,
    videoEmbedAlt: data.videoEmbedAlt,
    techStacks: data.techStacks,
    weight: data.weight,
    slug: slug,
    content: contentStr,
    readingTime: readingTimeText,
    readingTimeMinutes: readingTimeMinutes,
  };
}

function getProductWithBody(page: Page, index: number): ShopProduct & {
  body: React.ComponentType<object>;
} {
  const baseProduct = getProduct(page, index);
  const data = page.data as unknown as ShopProduct & {
    body: React.ComponentType<object>;
  };

  return {
    ...baseProduct,
    body: data.body,
  };
}

export function getProducts(): ShopProduct[] {
  try {
    return shopSource
      .getPages()
      .map((page, index) => getProduct(page, index))
      .sort((a, b) => {
        // Sort by weight if available, otherwise by title
        if (a.weight && b.weight) {
          return a.weight - b.weight;
        }
        return a.title.localeCompare(b.title);
      });
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
}

export function getProductsByCategory(category: string): ShopProduct[] {
  try {
    // For single-word categories, we can use direct comparison
    // Just capitalize the first letter to match the stored format
    const normalizedCategory = category
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return getProducts().filter((product) => {
      return product.category === normalizedCategory;
    });
  } catch (error) {
    console.error("Error getting products by category:", error);
    return [];
  }
}

export function getFeaturedProducts(): ShopProduct[] {
  try {
    return getProducts().filter((product) => product.featured);
  } catch (error) {
    console.error("Error getting featured products:", error);
    return [];
  }
}

export function getCategories(): string[] {
  try {
    const products = getProducts();
    const categories = Array.from(new Set(products.map((product) => product.category)));
    return categories.sort();
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

export function getProductBySlug(category: string, slug: string): (ShopProduct & {
  body: React.ComponentType<object>;
}) | null {
  try {
    // Normalize the input category slug to match against product categories
    const normalizedCategory = category
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    // Find the page that matches the category and slug
    const page = shopSource.getPages().find((page) => {
      const data = page.data as unknown as ShopProduct;
      const pageSlug = page.slugs.length > 0 ? page.slugs[page.slugs.length - 1]?.replace(/\.mdx?$/, '') || data.title.toLowerCase().replace(/\s+/g, '-') : data.title.toLowerCase().replace(/\s+/g, '-');
      return data.category === normalizedCategory && pageSlug === slug;
    });

    if (!page) return null;

    // Get the index for the product ID
    const index = shopSource.getPages().findIndex(p => p === page);
    return getProductWithBody(page, index);
  } catch (error) {
    console.error("Error getting product by slug:", error);
    return null;
  }
}
