import type { BlogPostType } from "@/features/blog/types/BlogPostType";

export type SerializableBlogPostType = Omit<BlogPostType, "body">;

export interface SearchResult extends SerializableBlogPostType {
  score: number;
}
