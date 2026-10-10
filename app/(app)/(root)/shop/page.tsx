import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import ShopHero from "@/features/shop/components/ShopHero";
import ShopCategories from "@/features/shop/components/ShopCategories";
import ShopCheckoutSuccessTracker from "@/features/shop/components/ShopCheckoutSuccessTracker";
import { getProducts } from "@/features/shop/data/shopSource";
import { ProductListJsonLd } from "@/lib/schema/json-ld";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import HeadingTitle from "@/components/HeadingTitle";
import { Suspense } from "react";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Content is static MDX from the repo - force static prerender, no ISR reads.
export const dynamic = "force-static";

// Define the current page for SEO configuration
const PAGE = "Shop";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page);

export default async function ShopPage() {
  const products = getProducts();

  return (
    <>
      {/* Stripe success landing (?checkout=success): fires the browser half
          of the Purchase dedup pair. Suspense boundary keeps the static
          prerender intact while searchParams resolve at runtime. */}
      <Suspense fallback={null}>
        <ShopCheckoutSuccessTracker />
      </Suspense>
      <ProductListJsonLd products={products} />
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle title="Shop" as="h1" />
      <SeparatorHorizontal short={true} />
      <ShopHero />
      <SeparatorHorizontal short={true} />
      <ShopCategories />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
