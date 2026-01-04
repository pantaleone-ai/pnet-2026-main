import type { BlogPostType } from "@/features/blog/types/BlogPostType";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export type SerializableBlogPostType = Omit<BlogPostType, "body">;

// Union type for search results that can be either blog posts or products
export type SearchResult = (
  | {
      type: "blog";
      score: number;
    } & SerializableBlogPostType
  | {
      type: "product";
      score: number;
      content: string;
    } & Omit<ShopProduct, "readingTime" | "readingTimeMinutes">
);
