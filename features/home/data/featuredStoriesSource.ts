import { getBlogPosts } from "@/features/blog/data/blogSource";
import type { BlogPostType } from "@/features/blog/types/BlogPostType";

export function getFeaturedStories(): BlogPostType[] {
  const posts = getBlogPosts();
  return posts.filter(
    (post) => post.slug === "agentdna-enterprise-ai-agent-infrastructure",
  );
}

export function getFeaturedStory(): Omit<BlogPostType, "body"> | null {
  const stories = getFeaturedStories();
  const story = stories[0];
  if (!story) return null;
  const { body, ...postWithoutBody } = story;
  return postWithoutBody;
}
