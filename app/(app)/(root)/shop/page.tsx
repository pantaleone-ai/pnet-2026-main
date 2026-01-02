import ContactMe from "@/components/ContactMe";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import ShopHero from "@/features/shop/components/ShopHero";
import ShopCategories from "@/features/shop/components/ShopCategories";
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

export default async function ShopPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle title="Shop" />
      <SeparatorHorizontal short={true} />
      <ShopHero />
      <SeparatorHorizontal short={true} />
      <ShopCategories />
      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
