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

      // Use the first image, and potentially additional images if available
      // Note: We don't have access to additional images in FeedProduct interface
      // This could be enhanced later to include additional images
      const image1 = product.image_link;

      return [
        escapeCsvValue(product.title),
        escapeCsvValue(product.description.substring(0, 5000)), // Etsy description limit
        product.price.split(' ')[0], // Remove currency for Etsy
        quantity.toString(),
        escapeCsvValue(tags),
        escapeCsvValue(materials),
        image1,
        "", // IMAGE2
        "", // IMAGE3
        "", // IMAGE4
        ""  // IMAGE5
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [ETSY_CSV_HEADERS.join(','), ...csvRows].join('\n');

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="etsy-products.csv"',
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Error generating Etsy CSV feed:", error);
    return new Response("Error generating CSV feed", { status: 500 });
  }
}
