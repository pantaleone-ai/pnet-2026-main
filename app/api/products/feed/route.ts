import { NextResponse } from "next/server";
import { getProducts } from "@/features/shop/data/shopSource";

// Content changes require a redeploy, so the feed is only built at
// deploy time. No time-based revalidation means no ISR reads.
export const dynamic = "force-static";

export async function GET() {
  const products = getProducts();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pantaleone.net";

  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "additional_image_link",
    "availability",
    "price",
    "brand",
    "condition",
    "google_product_category",
    "product_type",
    "identifier_exists",
    "shipping_weight",
    "is_digital",
  ];

  const rows = products.map((product) => {
    const categorySlug = product.category.toLowerCase().replace(/\s+/g, "-");
    const link = `${baseUrl}/shop/${categorySlug}/${product.slug}`;
    const additionalImages = product.additionalImages
      ?.map((img) => img.url)
      .filter(Boolean)
      .join("|");

    return [
      product.sku || `product-${product.id}`,
      product.title,
      product.description.replace(/\n/g, " ").replace(/\t/g, " "),
      link,
      product.imageUrl,
      additionalImages || "",
      product.availability || "in_stock",
      `${product.price} ${product.currency}`,
      product.brand || "Pantaleone Digital Services",
      product.condition || "new",
      product.googleProductCategory || "319",
      product.productType || "Software & Apps",
      product.identifierExists ? "true" : "false",
      product.isDigital ? "0 lb" : `${product.weight || 0} lb`,
      product.isDigital ? "yes" : "no",
    ].join("\t");
  });

  const feedContent = [headers.join("\t"), ...rows].join("\n");

  return new NextResponse(feedContent, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products.txt"',
      "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
}
