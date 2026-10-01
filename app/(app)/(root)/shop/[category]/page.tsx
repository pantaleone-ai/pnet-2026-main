import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import ShopCategoryProducts from "@/features/shop/components/ShopCategoryProducts";
import {
  getCategories,
  getProductsByCategory,
} from "@/features/shop/data/shopSource";
import { getBaseUrl, getProductCategorySlug } from "@/lib/helpers";
import { ProductListJsonLd } from "@/lib/schema/json-ld";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import HeadingTitle from "@/components/HeadingTitle";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

const FALLBACK_PAGE = "Shop";

function getCategoryEntry(categorySlug: string): HeadType {
  const bySlug = HEAD.find(
    (entry: HeadType) => entry.slug === `/shop/${categorySlug}`,
  );
  if (bySlug) return bySlug;
  return HEAD.find((entry: HeadType) => entry.page === FALLBACK_PAGE) as HeadType;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const entry = getCategoryEntry(category);
  const canonical =
    entry.slug === "/shop"
      ? getBaseUrl(`/shop/${category}`)
      : getBaseUrl(entry.slug);

  return {
    title: entry.title,
    applicationName: entry.title,
    description: entry.description,
    metadataBase: new URL(canonical),
    alternates: {
      canonical,
    },
  };
}

// Categories are derived from static content, so pre-render them at build
// time instead of server-rendering on every request.
export const dynamic = "force-static";

// Unknown category paths 404 statically instead of triggering ISR generation.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((category) => ({
    category: getProductCategorySlug(category),
  }));
}

const CATEGORY_H1: Record<string, string> = {
  "ai-apps": "AI Apps",
  "ai-workflows": "AI Workflows",
};

const CATEGORY_INTRO: Record<string, string> = {
  "ai-apps":
    "Ready-to-run AI software: starters, tools, and utilities your team can deploy today.",
  "ai-workflows":
    "Downloadable N8N workflow packs and prompt systems for support triage, content ops, and back-office automation.",
};

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  // Convert URL slug to readable category name
  const formatCategoryName = (slug: string): string => {
    // First decode the URL-encoded slug
    const decodedSlug = decodeURIComponent(slug);
    return decodedSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const { category } = await params;
  const categoryName = category ? formatCategoryName(category) : "";
  const products = getProductsByCategory(categoryName);

  return (
    <>
      <ProductListJsonLd products={products} categoryName={categoryName} />
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle title={CATEGORY_H1[category] ?? categoryName} as="h1" />
      {CATEGORY_INTRO[category] ? (
        <p className="mx-auto max-w-2xl px-6 text-center text-lg/8 text-foreground/80">
          {CATEGORY_INTRO[category]}
        </p>
      ) : null}
      <SeparatorHorizontal short={true} />
      <ShopCategoryProducts category={categoryName} />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
