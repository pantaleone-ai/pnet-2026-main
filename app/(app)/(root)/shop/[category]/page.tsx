import ContactMe from "@/components/ContactMe";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import ShopCategoryProducts from "@/features/shop/components/ShopCategoryProducts";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import HeadingTitle from "@/components/HeadingTitle";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Shop";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// Configure comprehensive metadata for SEO and social sharing
// This includes all necessary meta tags for search engines and social media platforms
export const metadata: Metadata = {
  // Basic metadata
  title: page.title,
  applicationName: page.title,
  description: page.description,

  // URL configurations for canonical links and RSS feed
  metadataBase: new URL(getBaseUrl(page.slug)),
  alternates: {
    canonical: getBaseUrl(page.slug),
  },
};

export default async function ShopCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  // Convert URL slug to readable category name
  const formatCategoryName = (slug: string): string => {
    // First decode the URL-encoded slug
    const decodedSlug = decodeURIComponent(slug);
    return decodedSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const categoryName = params.category ? formatCategoryName(params.category) : '';

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle title={`Shop - ${categoryName}`} />
      <SeparatorHorizontal short={true} />
      <ShopCategoryProducts category={categoryName} />
      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
