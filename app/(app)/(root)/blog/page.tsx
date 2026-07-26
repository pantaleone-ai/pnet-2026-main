import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProducts } from "@/features/shop/data/shopSource";
import BlogPostList from "@/features/blog/components/BlogPostList";
import FeaturedProductsSection from "@/features/shop/components/FeaturedProductsSection";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "Blog";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// Configure comprehensive metadata for SEO and social sharing
// This includes all necessary meta tags for search engines and social media platforms
export const metadata: Metadata = {
  // Basic metadata
  title: page?.title,
  applicationName: page?.title,
  description: page?.description,

  // URL configurations for canonical links and RSS feed
  metadataBase: new URL(getBaseUrl(page?.slug)),
  alternates: {
    canonical: getBaseUrl(page?.slug),
  },

  // OpenGraph - preserved original behavior
  openGraph: {
    type: "website",
    title: page?.title,
    description: page?.description,
    images: [
      {
        url: "https://pantaleone.net/opengraph-image",
        width: 1200,
        height: 630,
        alt: page?.title,
      },
    ],
  },

  // Twitter - preserved original behavior
  twitter: {
    card: "summary_large_image",
    title: page?.title,
    description: page?.description,
    images: ["https://pantaleone.net/opengraph-image"],
  },

  // Additional meta tags
  other: {
    "og:logo": "summary_large_image.png",
  },
};

export default async function BlogPage() {
  // Fetch data on server side
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
  const products = getProducts();

  // Transform posts to serializable format for client components
  const serializablePosts = posts.map((post) => {
    const { body, ...serializablePost } = post;
    return serializablePost;
  });

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <HeadingTitle
        title="Blog"
        textStyleClassName="text-2xl font-bold sm:text-3xl"
      />
      <SeparatorHorizontal short={true} />
      <BlogPostList posts={serializablePosts} />
      <SeparatorHorizontal short={true} />
      <FeaturedProductsSection products={products} />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
