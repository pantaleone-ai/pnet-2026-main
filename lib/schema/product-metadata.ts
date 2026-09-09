import {
  convertShopProductToMerchantProduct,
  buildBreadcrumbItems,
  getOpenGraphImages,
} from "@/lib/schema/product-converter";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";
import { siteConfig } from "@/config/site";
import { getBaseUrl } from "@/lib/helpers";

export function generateMerchantProductSchema(
  product: ShopProduct,
  canonicalUrl: string,
) {
  return convertShopProductToMerchantProduct(product, canonicalUrl);
}

export function generateProductMetadata(
  product: ShopProduct,
  canonicalUrl: string,
) {
  const availability = product.inventory === 0 ? "out of stock" : "in stock";
  const images = getOpenGraphImages(product);

  return {
    title: `${product.title} - ${siteConfig.name}`,
    description: product.description || "Shop AI products",
    keywords: [
      product.title,
      product.category,
      ...(product.techStacks || []),
      "AI products",
      "Next.js",
      "TypeScript",
      "digital products",
    ].filter(Boolean) as string[],
    openGraph: {
      title: `${product.title} - ${siteConfig.name}`,
      description: product.description || "Shop AI products",
      images: images,
      url: canonicalUrl,
      type: "product" as const,
      siteName: siteConfig.name,
      locale: "en_US",
      ...(product.price && {
        priceAmount: product.price,
        priceCurrency: product.currency || "USD",
      }),
      availability: availability,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${product.title} - ${siteConfig.name}`,
      description: product.description || "Shop AI products",
      images: [product.imageUrl || "/summary_large_image.png"],
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": product.currency || "USD",
      "product:availability:condition": availability,
    },
  };
}

export function generateBreadcrumbSchema(category: string, slug: string) {
  const baseUrl = getBaseUrl();

  return buildBreadcrumbItems(category, slug, baseUrl);
}
