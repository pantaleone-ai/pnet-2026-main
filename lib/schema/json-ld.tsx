import type { Product, Organization, BreadcrumbList } from "schema-dts";
import type { MerchantProduct, BreadcrumbItem } from "./merchant-types";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";
import {
  buildProductSchema,
  buildOrganizationSchema,
  buildBreadcrumbSchema,
} from "./merchant-builder";

interface JsonLdProps {
  data: Product | Organization | BreadcrumbList;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

export function ProductJsonLd({ product }: { product: MerchantProduct }) {
  return <JsonLd data={buildProductSchema(product)} />;
}

export function OrganizationJsonLd({
  siteName,
  siteUrl,
}: {
  siteName: string;
  siteUrl: string;
}) {
  return <JsonLd data={buildOrganizationSchema(siteName, siteUrl)} />;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return <JsonLd data={buildBreadcrumbSchema(items)} />;
}

interface ProductListJsonLdProps {
  products: ShopProduct[];
  categoryName?: string;
}

export function ProductListJsonLd({ products, categoryName }: ProductListJsonLdProps) {
  if (!products || products.length === 0) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pantaleone.net";

  const itemListElement = products.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${baseUrl}/shop/${product.category.toLowerCase().replace(/\s+/g, "-")}/${product.slug}`,
    name: product.title,
    image: product.imageUrl || `${baseUrl}/summary_large_image.png`,
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categoryName ? `${categoryName} Products` : "Shop Products",
    description: categoryName
      ? `Browse ${categoryName} products on Pantaleone Digital Services`
      : "Browse AI products and services on Pantaleone Digital Services",
    numberOfItems: products.length,
    itemListElement,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
