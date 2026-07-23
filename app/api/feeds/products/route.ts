import { getFeedProducts } from "@/lib/feed-data";
import { unstable_cache } from "next/cache";

// Cache the feed generation for 1 hour to prevent excessive MDX file reads
const getCachedXmlFeed = unstable_cache(
  async () => {
    const products = await getFeedProducts();
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://pantaleone.net";

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
    <title>Pantaleone Product Feed</title>
    <link>${baseUrl}</link>
    <description>Product feed for Google Merchant Center, Facebook, Instagram, Pinterest, and X</description>
`;

    const items = products
      .map(
        (product) => `
    <item>
        <g:id><![CDATA[${product.id}]]></g:id>
        <g:title><![CDATA[${product.title}]]></g:title>
        <g:description><![CDATA[${product.description}]]></g:description>
        <g:link>${product.link}</g:link>
        <g:image_link>${product.image_link}</g:image_link>
        <g:condition>new</g:condition>
        <g:availability>${product.availability}</g:availability>
        <g:price>${product.price}</g:price>
        <g:brand><![CDATA[${product.brand}]]></g:brand>
        ${product.gtin ? `<g:gtin>${product.gtin}</g:gtin>` : ""}
        ${product.google_product_category ? `<g:google_product_category><![CDATA[${product.google_product_category}]]></g:google_product_category>` : ""}
        <g:identifier_exists>${product.gtin ? "yes" : "no"}</g:identifier_exists>
        <g:quantity>${product.quantity}</g:quantity>
        ${product.excluded_destination?.map((dest) => `<g:excluded_destination>${dest}</g:excluded_destination>`).join("\n        ") || ""}
        ${product.checkout_link ? `<g:checkout_link>${product.checkout_link}</g:checkout_link>` : ""}
    </item>
`,
      )
      .join("");

    const xmlFooter = `
</channel>
</rss>`;

    return xmlHeader + items + xmlFooter;
  },
  ["product-feed-xml"], // Cache tag
  { revalidate: 86400 }, // Revalidate every 24 hours
);

export async function GET() {
  try {
    const xml = await getCachedXmlFeed();

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=86400, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating product feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}
