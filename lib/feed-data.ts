import { getProducts } from "@/features/shop/data/shopSource";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export interface FeedProduct {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  additional_image_link?: string[]; // Extra product images (Meta catalog quality signal)
  product_type?: string; // Merchant-defined category path (Meta + Google)
  price: string; // "49.99 USD"
  availability: "in_stock" | "out_of_stock" | "preorder";
  quantity: number; // Inventory count (999 for unlimited digital products)
  brand?: string;
  gtin?: string; // UPC/EAN
  google_product_category?: string; // For Google Merchant Center
  checkout_link?: string; // Stripe payment link for checkout
  excluded_destination?: string[]; // Exclude from local inventory ads (digital products) - must be repeated XML elements
}

export async function getFeedProducts(): Promise<FeedProduct[]> {
  const products = getProducts();
  // Merchant Center rejects links with whitespace/control chars. The
  // deployed NEXT_PUBLIC_BASE_URL carried a trailing newline, which broke
  // every <g:link> (Missing product page for all products), so sanitize.
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.pantaleone.net")
    .trim()
    .replace(/\/+$/, "");

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
      link: `${baseUrl}/shop/${categorySlug}/${p.slug}`.trim(),
      image_link: (p.imageUrl || "").trim(),
      additional_image_link: (p.additionalImages ?? [])
        .map((img) => img.url)
        .filter((url) => url && url !== p.imageUrl)
        .slice(0, 10),
      product_type: p.productType || undefined,
      // Meta/Google require major units ("100.00 USD"). ShopProduct.price is
      // canonical major units (see schema); format defensively to 2 decimals.
      price: `${p.price.toFixed(2)} ${p.currency}`,
      // Digital products are always in stock
      availability: "in_stock",
      // 999 for unlimited digital inventory
      quantity: 999,
      brand: "Pantaleone",
      gtin: p.gtin || "", // GTIN/UPC from product data
      google_product_category: "Software > Computer Software", // Category for digital software
      // Exclude digital products from local inventory - they don't have physical store inventory
      excluded_destination: ["Free_local_listings", "Local_inventory_ads"],
      checkout_link: `${baseUrl}/checkout?product_id=${p.sku || `product-${p.id}`}`.trim(), // URL template for Google checkout
    };
  });
}
