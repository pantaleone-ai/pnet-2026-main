import { Product, Organization, BreadcrumbList } from "schema-dts";
import type { MerchantProduct, BreadcrumbItem } from "./merchant-types";
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
