"use server";

import { getPostsBySearchQuery } from "@/lib/search-server";
import type { SearchResult } from "@/types/search";

export async function searchPosts(query: string): Promise<SearchResult[]> {
  if (!query || typeof query !== "string") {
    throw new Error("Query parameter is required");
  }

  const searchResults = await getPostsBySearchQuery(query);

  // Track search analytics (this runs on the server, so we can't use client-side tracking)
  // We'll need to track this client-side when the results are displayed

  // Return a plain object to avoid serialization issues with server actions
  return JSON.parse(JSON.stringify(searchResults));
}
