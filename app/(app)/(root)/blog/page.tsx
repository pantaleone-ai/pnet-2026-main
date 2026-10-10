import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import { getBlogPosts } from "@/features/blog/data/blogSource";
import BlogPostList from "@/features/blog/components/BlogPostList";
import FeaturedProductsSectionAsync from "@/features/shop/components/FeaturedProductsSectionAsync";
import { Suspense } from "react";

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Content is static MDX from the repo - force static prerender, no ISR reads.
export const dynamic = "force-static";

// Define the current page for SEO configuration
const PAGE = "Blog";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page);

export default async function BlogPage() {
  // Fetch data on server side
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );

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
        as="h1"
      />
      <SeparatorHorizontal short={true} />
      <BlogPostList posts={serializablePosts} />
      <SeparatorHorizontal short={true} />
      <Suspense>
        <FeaturedProductsSectionAsync />
      </Suspense>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
