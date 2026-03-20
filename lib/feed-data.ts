import { getProducts } from "@/features/shop/data/shopSource";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export interface FeedProduct {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: string; // "49.99 USD"
  availability: "in_stock" | "out_of_stock" | "preorder";
  quantity: number; // Inventory count (999 for unlimited digital products)
  brand?: string;
  gtin?: string; // UPC/EAN
  google_product_category?: string; // For Google Merchant Center
  checkout_link?: string; // Stripe payment link for checkout
}

export async function getFeedProducts(): Promise<FeedProduct[]> {
  const products = getProducts();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pantaleone.net";

  return products.map((p: ShopProduct) => {
    // Map category names to URL slugs (consistent with other components)
    const categoryMapping: Record<string, string> = {
      Apps: "ai-apps",
      "Ai Workflows": "ai-workflows",
      // Add more mappings as needed for future categories
    };

    const categorySlug =
      categoryMapping[p.category] ||
      p.category.toLowerCase().replace(/\s+/g, "-");

    return {
      id: p.sku || `product-${p.id}`,
      title: p.title,
      description: p.description.substring(0, 5000), // Limit description length
      link: `${baseUrl}/shop/${categorySlug}/${p.slug}`,
      image_link: p.imageUrl,
      price: `${p.price} ${p.currency}`,
      // Digital products are always in stock
      availability: "in_stock",
      // 999 for unlimited digital inventory
      quantity: 999,
      brand: "Pantaleone",
      gtin: p.gtin || "", // GTIN/UPC from product data
      google_product_category: "Software > Computer Software", // Category for digital software
      checkout_link: `${baseUrl}/checkout?product_id=${p.sku || `product-${p.id}`}`, // URL template for Google checkout
    };
  });
}
