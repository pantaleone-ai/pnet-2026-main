import { getFeedProducts } from "@/lib/feed-data";

// Content changes require a redeploy, so the feed is only built at
// deploy time. No time-based revalidation means no ISR reads.
export const dynamic = "force-static";

// Etsy CSV headers based on their bulk upload format
const ETSY_CSV_HEADERS = [
  "TITLE",
  "DESCRIPTION",
  "PRICE",
  "QUANTITY",
  "TAGS",
  "MATERIALS",
  "IMAGE1",
  "IMAGE2",
  "IMAGE3",
  "IMAGE4",
  "IMAGE5"
];

function escapeCsvValue(value: string): string {
  // Escape commas, quotes, and newlines for CSV
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  try {
    const products = await getFeedProducts();

    // Create CSV rows
    const csvRows = products.map((product) => {
      // For digital products, quantity is unlimited
      const quantity = 999;

      // Basic tags for Etsy
      const tags = "digital,software,AI,template,digital download";

      // Materials for digital products
      const materials = "digital";

      // image_link is already absolute https (see lib/feed-data.ts).
      // Fill IMAGE1-5 from primary + additional images.
      const allImages = [
        product.image_link,
        ...(product.additional_image_link ?? []),
      ].slice(0, 5);
      const [image1 = "", image2 = "", image3 = "", image4 = "", image5 = ""] =
        allImages;

      return [
        escapeCsvValue(product.title),
        escapeCsvValue(product.description.substring(0, 5000)), // Etsy description limit
        product.price.split(' ')[0], // Remove currency for Etsy
        quantity.toString(),
        escapeCsvValue(tags),
        escapeCsvValue(materials),
        image1,
        image2,
        image3,
        image4,
        image5
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [ETSY_CSV_HEADERS.join(','), ...csvRows].join('\n');

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="etsy-products.csv"',
        // Deploy-time static (force-static, redeploy on content change;
        // Vercel purges CDN on deploy) => 1yr CDN pin. Zero ISR.
        "Cache-Control":
          "public, s-maxage=31536000, stale-while-revalidate=31536000",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
      },
    });
  } catch (error) {
    console.error("Error generating Etsy CSV feed:", error);
    return new Response("Error generating CSV feed", { status: 500 });
  }
}
