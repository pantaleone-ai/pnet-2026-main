import { NextResponse } from "next/server";
import { getProducts } from "@/features/shop/data/shopSource";

// Content changes require a redeploy, so the feed is only built at
// deploy time. No time-based revalidation means no ISR reads.
export const dynamic = "force-static";

export async function GET() {
  const products = getProducts();
  // Sanitize: production env carried a trailing newline which embedded
  // `\n` in every link (Missing product page for all products in
  // Merchant Center). Trim and strip trailing slashes defensively.
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.pantaleone.net"
  )
    .trim()
    .replace(/\/+$/, "");

  // Canonical shop category slugs (must match /shop/[category] routes).
  const categoryMapping: Record<string, string> = {
    Apps: "ai-apps",
    "Ai Workflows": "ai-workflows",
  };

  // TSV cells must not contain tabs/newlines; strip them per field.
  const cell = (value: unknown): string =>
    String(value ?? "")
      .replace(/[\t\n\r]+/g, " ")
      .trim();

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
    "checkout_link_template",
    "shipping_weight",
    "is_digital",
  ];

  const rows = products.map((product) => {
    const categorySlug =
      categoryMapping[product.category] ||
      product.category.toLowerCase().replace(/\s+/g, "-");
    const link = `${baseUrl}/shop/${categorySlug}/${product.slug}`.trim();
    const additionalImages = (product.additionalImages ?? [])
      ?.map((img) => img.url)
      .filter(Boolean)
      .join("|");
    // Google's valid attribute is checkout_link_template (checkout_link is
    // rejected). Omit when there is no payment link: the URL must land on
    // a purchasable checkout/cart page.
    const checkoutLinkTemplate = product.stripePaymentLink
      ? `${baseUrl}/checkout?product_id=${product.sku || `product-${product.id}`}`.trim()
      : "";

    return [
      cell(product.sku || `product-${product.id}`),
      cell(product.title),
      cell(product.description),
      cell(link),
      cell(product.imageUrl),
      cell(additionalImages || ""),
      cell(product.availability || "in_stock"),
      cell(`${product.price} ${product.currency}`),
      cell(product.brand || "Pantaleone Digital Services"),
      cell(product.condition || "new"),
      cell(product.googleProductCategory || "319"),
      cell(product.productType || "Software & Apps"),
      product.identifierExists ? "true" : "false",
      cell(checkoutLinkTemplate),
      cell(product.isDigital ? "0 lb" : `${product.weight || 0} lb`),
      product.isDigital ? "yes" : "no",
    ].join("\t");
  });

  const feedContent = [headers.join("\t"), ...rows].join("\n");

  return new NextResponse(feedContent, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products.txt"',
      // Deploy-time static (force-static, redeploy on content change;
      // Vercel purges CDN on deploy) => 1yr CDN pin. Zero ISR.
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
