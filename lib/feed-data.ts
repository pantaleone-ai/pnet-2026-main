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
  brand?: string;
  gtin?: string; // UPC/EAN
  google_product_category?: string; // For Google Merchant Center
}

export async function getFeedProducts(): Promise<FeedProduct[]> {
  const products = getProducts();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pantaleone.net";

  return products.map((p: ShopProduct) => ({
    id: p.sku || `product-${p.id}`,
    title: p.title,
    description: p.description.substring(0, 5000), // Limit description length
    link: `${baseUrl}/shop/${p.category.toLowerCase().replace(/\s+/g, '-')}/${p.slug}`,
    image_link: p.imageUrl,
    price: `${p.price} ${p.currency}`,
    // Digital products are always in stock
    availability: "in_stock",
    brand: "Pantaleone",
    gtin: p.gtin || "", // GTIN/UPC from product data
    google_product_category: "Software > Computer Software", // Category for digital software
  }));
}
