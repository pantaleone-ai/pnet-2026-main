import { notFound } from "next/navigation";

import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getLLMText } from "@/features/blog/lib/get-llm-text";

// Unknown slugs to 404 statically instead of triggering ISR generation.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = getBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const allPosts = getBlogPosts();
  const post = allPosts.find((post) => post.slug === slug);

  if (!post) {
    notFound();
  }

  return new Response(await getLLMText(post), {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
      // Deploy-time static (dynamicParams=false, redeploy on change;
      // Vercel purges CDN on deploy) => 1yr CDN pin. Zero ISR.
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=86400",
    },
  });
}
