import { shop } from "@/.source/server";
import type { Source, SourceConfig } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import type { ShopProduct } from "../types/ShopProduct";
import { cache } from "react";
import fs from "fs";
import path from "path";
import readingTime from "reading-time";
import type React from "react";

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
  const slug =
    page.slugs.length > 0
      ? page.slugs[page.slugs.length - 1]?.replace(/\.mdx?$/, "") ||
        data.title.toLowerCase().replace(/\s+/g, "-")
      : data.title.toLowerCase().replace(/\s+/g, "-");

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
    filePath = path.join(process.cwd(), "features/shop/content", `${slug}.mdx`);
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

  // Parse additionalImages if it's a JSON string
  let parsedAdditionalImages = data.additionalImages;
  if (typeof data.additionalImages === "string") {
    try {
      parsedAdditionalImages = JSON.parse(data.additionalImages);
    } catch (error) {
      console.error("Error parsing additionalImages JSON:", error);
      parsedAdditionalImages = [];
    }
  }

  // Add fallback additional images for specific products
  // This is a temporary solution until MDX parsing works correctly
  // if (!parsedAdditionalImages || parsedAdditionalImages.length === 0) {
  //   if (data.title === "Next.js AI Starter App") {
  //     parsedAdditionalImages = [
  //       { url: "https://i.ebayimg.com/images/g/u2YAAeSwBeFpBmIn/s-l1600.webp", alt: "Nextjs Boilerplate" },
  //       { url: "https://i.ebayimg.com/images/g/u~QAAeSwZilpB5Bc/s-l1600.webp", alt: "Mobile responsive design on smartphone" },
  //       { url: "https://i.ebayimg.com/images/g/u~QAAeSwZilpB5Bc/s-l1600.webp", alt: "Admin panel with user management" }
  //     ];
  //   } else if (data.title === "AI Agent Starter Kit") {
  //     parsedAdditionalImages = [
  //       { url: "/images/ai-agent-starter-kit.jpg", alt: "Agent workflow builder interface" },
  //       { url: "/images/ai-agent-starter-kit.jpg", alt: "Pre-configured agent templates" },
  //       { url: "/images/ai-agent-starter-kit.jpg", alt: "Integration dashboard with API connections" }
  //     ];
  //   } else if (data.title === "AI Consulting Hour") {
  //     parsedAdditionalImages = [
  //       { url: "/images/ai-consulting.jpg", alt: "Consultant in video call discussing AI strategy" },
  //       { url: "/images/ai-consulting.jpg", alt: "Whiteboard session with AI architecture diagrams" }
  //     ];
  //   } else if (data.title === "Social Media Automation Workflow") {
  //     parsedAdditionalImages = [
  //       { url: "/images/social-media-automation.jpg", alt: "Workflow editor showing automation nodes" },
  //       { url: "/images/social-media-automation.jpg", alt: "Analytics dashboard with engagement metrics" }
  //     ];
  //   } else if (data.title === "AI-Generated Futuristic Landscape") {
  //     parsedAdditionalImages = [
  //       { url: "/images/ai-landscape-artwork.jpg", alt: "Full artwork view with vibrant colors" },
  //       { url: "/images/ai-landscape-artwork.jpg", alt: "Close-up detail of architectural elements" },
  //       { url: "/images/ai-landscape-artwork.jpg", alt: "Alternative color variation" }
  //     ];
  //   }
  // }

  const gmcCategoryMap: Record<string, string> = {
    "Apps": "319",
    "Ai Workflows": "319",
  };

  const productTypeMap: Record<string, string> = {
    "Apps": "Software & Apps > AI Applications",
    "Ai Workflows": "Software & Apps > AI Workflows & Automation",
  };

  return {
    id: index,
    title: data.title,
    description: data.description,
    category: data.category,
    price: data.price,
    currency: data.currency ?? "USD",
    sku: data.sku,
    mpn: data.mpn,
    gtin: data.gtin,
    inventory: data.inventory ?? 9999,
    availability: data.availability ?? "in_stock",
    condition: data.condition ?? "new",
    brand: data.brand ?? "Pantaleone Digital Services",
    googleProductCategory: data.googleProductCategory ?? gmcCategoryMap[data.category] ?? "319",
    productType: data.productType ?? productTypeMap[data.category] ?? "Software & Apps",
    identifierExists: data.identifierExists ?? !data.gtin,
    purchaseUrl: data.purchaseUrl,
    stripeProductId: data.stripeProductId,
    stripePriceId: data.stripePriceId,
    stripePaymentLink: data.stripePaymentLink,
    imageUrl: data.imageUrl ?? "",
    imageAlt: data.imageAlt ?? "",
    additionalImages: parsedAdditionalImages,
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
    timeToValue: data.timeToValue,
    targetKeywords: data.targetKeywords,
    documentationUrl: data.documentationUrl,
    architectureDiagram: data.architectureDiagram,
    coreStack: data.coreStack,
    primaryLibraries: data.primaryLibraries,
    infrastructureRequirements: data.infrastructureRequirements,
  };
}

function getProductWithBody(
  page: Page,
  index: number,
): ShopProduct & {
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

export const getProducts = cache(function getProducts(): ShopProduct[] {
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
});

export const getProductsByCategory = cache(
  function getProductsByCategory(category: string): ShopProduct[] {
    try {
      // Map URL slugs to actual product categories
      const categoryMapping: Record<string, string> = {
        "ai-apps": "Apps",
        "ai-workflows": "Ai Workflows",
        "Ai Apps": "Apps", // Handle formatted category names from URL
        "Ai Workflows": "Ai Workflows", // Handle formatted category names from URL
        // Add more mappings as needed for future categories
      };

      // First check if we have a direct mapping for the URL slug
      const mappedCategory = categoryMapping[category] || category;

      // If no mapping found, try to normalize the input
      const normalizedCategory =
        mappedCategory === category
          ? category
              .replace(/-/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : mappedCategory;

      return getProducts().filter((product) => {
        return product.category === normalizedCategory;
      });
    } catch (error) {
      console.error("Error getting products by category:", error);
      return [];
    }
  },
);

export const getFeaturedProducts = cache(
  function getFeaturedProducts(): ShopProduct[] {
    try {
      return getProducts().filter((product) => product.featured);
    } catch (error) {
      console.error("Error getting featured products:", error);
      return [];
    }
  },
);

export const getCategories = cache(function getCategories(): string[] {
  try {
    const products = getProducts();
    const categories = Array.from(
      new Set(products.map((product) => product.category)),
    );
    return categories.sort();
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
});

export const getProductBySlug = cache(
  function getProductBySlug(
    category: string,
    slug: string,
  ):
    | (ShopProduct & {
        body: React.ComponentType<object>;
      })
    | null {
    try {
      // Map URL slugs to actual product categories (same mapping as getProductsByCategory)
      const categoryMapping: Record<string, string> = {
        "ai-apps": "Apps",
        "ai-workflows": "Ai Workflows",
        "Ai Apps": "Apps", // Handle formatted category names from URL
        "Ai Workflows": "Ai Workflows", // Handle formatted category names from URL
        // Add more mappings as needed for future categories
      };

      // First check if we have a direct mapping for the URL slug
      const mappedCategory = categoryMapping[category] || category;

      // If no mapping found, try to normalize the input
      const normalizedCategory =
        mappedCategory === category
          ? category
              .replace(/-/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : mappedCategory;

      // Find the page that matches the category and slug
      const page = shopSource.getPages().find((page) => {
        const data = page.data as unknown as ShopProduct;
        const pageSlug =
          page.slugs.length > 0
            ? page.slugs[page.slugs.length - 1]?.replace(/\.mdx?$/, "") ||
              data.title.toLowerCase().replace(/\s+/g, "-")
            : data.title.toLowerCase().replace(/\s+/g, "-");
        return data.category === normalizedCategory && pageSlug === slug;
      });

      if (!page) return null;

      // Get the index for the product ID
      const index = shopSource.getPages().findIndex((p) => p === page);
      return getProductWithBody(page, index);
    } catch (error) {
      console.error("Error getting product by slug:", error);
      return null;
    }
  },
);

export const getProductByFeedId = cache(
  function getProductByFeedId(feedId: string): ShopProduct | null {
    try {
      const products = getProducts();

      // Feed ID format: sku || `product-${id}`
      // First try exact match on SKU
      const bySku = products.find((p) => p.sku === feedId);
      if (bySku) return bySku;

      // Try match on product-{id} format
      const byProductId = products.find((p) => `product-${p.id}` === feedId);
      if (byProductId) return byProductId;

      return null;
    } catch (error) {
      console.error("Error getting product by feed ID:", error);
      return null;
    }
  },
);
