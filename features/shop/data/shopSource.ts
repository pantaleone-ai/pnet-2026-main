import { shop } from "@/.source/server";
import type { Source, SourceConfig } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import type { ShopProduct } from "../types/ShopProduct";

const shopDocs = shop as unknown as { toFumadocsSource: () => unknown };

export const shopSource = loader({
  baseUrl: "/shop",
  source: shopDocs.toFumadocsSource() as Source<SourceConfig>,
});

type Page = ReturnType<typeof shopSource.getPages>[number];

function getProduct(page: Page, index: number): ShopProduct {
  const data = page.data as unknown as ShopProduct;

  // Generate slug from page slugs or title
  const slug = page.slugs.length > 0 ? page.slugs.join("/") : data.title.toLowerCase().replace(/\s+/g, '-');

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
    return getProducts().filter((product) => product.category === category);
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
