import { getBlogPosts } from "@/features/blog/data/blogSource";
import { getProducts } from "@/features/shop/data/shopSource";
import type { SearchResult } from "@/types/search";
import { levenshtein } from "./helpers";

/**
 * Function to get all posts by search query.
 * @param query - The search query.
 * @returns An array of search results.
 */
// Cost guard: search scans every post+product in memory and the response is
// JSON over origin transfer. Cap both result count and query length so a
// 1-character query can't dump the whole catalog in one function call.
//
// CPU guard: exact substring matches run first (cheap). The expensive
// Levenshtein fuzzy pass runs ONLY when zero exact hits exist, and only
// against title/slug tokens — never full content/description. This keeps
// the common path O(catalog) substring scans instead of O(words x terms)
// edit-distance matrices.
export const SEARCH_MAX_RESULTS = 20;
const SEARCH_MAX_QUERY_LENGTH = 100;
const FUZZY_THRESHOLD = 2;

function slugTokens(slug: string): string[] {
  return slug.toLowerCase().split(/[-_/\s]+/).filter(Boolean);
}

export async function getPostsBySearchQuery(query: string) {
  if (!query || typeof query !== "string") return [];
  const trimmed = query.trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
  if (trimmed.length < 2) return [];

  const searchQuery = trimmed.toLowerCase();
  const searchWords = searchQuery.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];

  // Pass 1: exact substring matches only (cheap).
  for (const post of getBlogPosts()) {
    let score = 0;
    const title = post.title.toLowerCase();
    const description = post.description.toLowerCase();
    const content = post.content.toLowerCase();
    const fileName = post.slug.toLowerCase();

    for (const word of searchWords) {
      if (title.includes(word)) score += 10;
      if (fileName.includes(word)) score += 8;
      if (description.includes(word)) score += 6;
      if (content.includes(word)) score += 4;
    }

    if (score > 0) {
      const { body, ...serializablePost } = post;
      results.push({
        ...serializablePost,
        type: "blog",
        content: getContextAroundMatch(post.content, searchQuery),
        score,
      });
    }
  }

  for (const product of getProducts()) {
    let score = 0;
    const title = product.title.toLowerCase();
    const description = product.description.toLowerCase();
    const content = (product.content || "").toLowerCase();
    const fileName = product.slug.toLowerCase();
    const category = product.category.toLowerCase();

    for (const word of searchWords) {
      if (title.includes(word)) score += 10;
      if (fileName.includes(word)) score += 8;
      if (description.includes(word)) score += 6;
      if (content.includes(word)) score += 4;
      if (category.includes(word)) score += 5;
    }

    if (score > 0) {
      const productContent = product.content || "";
      results.push({
        type: "product",
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        currency: product.currency,
        sku: product.sku,
        inventory: product.inventory,
        purchaseUrl: product.purchaseUrl,
        imageUrl: product.imageUrl,
        imageAlt: product.imageAlt,
        additionalImages: product.additionalImages,
        featured: product.featured,
        isDigital: product.isDigital,
        fromDate: product.fromDate,
        toDate: product.toDate,
        websiteUrl: product.websiteUrl,
        githubUrl: product.githubUrl,
        videoEmbedUrl: product.videoEmbedUrl,
        videoEmbedAlt: product.videoEmbedAlt,
        techStacks: product.techStacks,
        weight: product.weight,
        slug: product.slug,
        availability: product.availability,
        condition: product.condition,
        brand: product.brand,
        identifierExists: product.identifierExists,
        content: getContextAroundMatch(productContent, searchQuery),
        score,
      });
    }
  }

  if (results.length > 0) {
    return results.sort((a, b) => b.score - a.score).slice(0, SEARCH_MAX_RESULTS);
  }

  // Pass 2: zero exact hits — capped fuzzy over title/slug tokens only.
  for (const post of getBlogPosts()) {
    let score = 0;
    const titleTerms = post.title.toLowerCase().split(/\s+/).filter(Boolean);
    const slugTerms = slugTokens(post.slug);

    for (const word of searchWords) {
      if (titleTerms.some((term) => levenshtein(term, word) <= FUZZY_THRESHOLD)) {
        score += 5;
      }
      if (slugTerms.some((term) => levenshtein(term, word) <= FUZZY_THRESHOLD)) {
        score += 4;
      }
    }

    if (score > 0) {
      const { body, ...serializablePost } = post;
      results.push({
        ...serializablePost,
        type: "blog",
        content: getContextAroundMatch(post.content, searchQuery),
        score,
      });
    }
  }

  for (const product of getProducts()) {
    let score = 0;
    const titleTerms = product.title.toLowerCase().split(/\s+/).filter(Boolean);
    const slugTerms = slugTokens(product.slug);

    for (const word of searchWords) {
      if (titleTerms.some((term) => levenshtein(term, word) <= FUZZY_THRESHOLD)) {
        score += 5;
      }
      if (slugTerms.some((term) => levenshtein(term, word) <= FUZZY_THRESHOLD)) {
        score += 4;
      }
    }

    if (score > 0) {
      const productContent = product.content || "";
      results.push({
        type: "product",
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        currency: product.currency,
        sku: product.sku,
        inventory: product.inventory,
        purchaseUrl: product.purchaseUrl,
        imageUrl: product.imageUrl,
        imageAlt: product.imageAlt,
        additionalImages: product.additionalImages,
        featured: product.featured,
        isDigital: product.isDigital,
        fromDate: product.fromDate,
        toDate: product.toDate,
        websiteUrl: product.websiteUrl,
        githubUrl: product.githubUrl,
        videoEmbedUrl: product.videoEmbedUrl,
        videoEmbedAlt: product.videoEmbedAlt,
        techStacks: product.techStacks,
        weight: product.weight,
        slug: product.slug,
        availability: product.availability,
        condition: product.condition,
        brand: product.brand,
        identifierExists: product.identifierExists,
        content: getContextAroundMatch(productContent, searchQuery),
        score,
      });
    }
  }

  // Sort results by score in descending order
  return results.sort((a, b) => b.score - a.score).slice(0, SEARCH_MAX_RESULTS);
}

/**
 * Function to get the context around the best match of the query in the content.
 * Exact split scoring only — no Levenshtein here (keeps snippet extraction
 * linear instead of quadratic per window).
 * @param content - The content to search within.
 * @param query - The search query.
 * @returns A string containing the context around the best match.
 */
export function getContextAroundMatch(content: string, query: string) {
  if (!content || !query.trim()) return content;

  const searchWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (searchWords.length === 0) return content;

  const windowSize = 150;
  let bestScore = 0;
  let bestStart = 0;

  // Iterate over the content in steps of 50 characters
  for (let i = 0; i < content.length - windowSize; i += 50) {
    const window = content.slice(i, i + windowSize).toLowerCase();
    let score = 0;

    // Calculate score for the current window (exact matches only)
    for (const word of searchWords) {
      const exactMatches = window.split(word).length - 1;
      score += exactMatches * word.length * 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const contextStart = Math.max(0, bestStart - 50);
  const contextEnd = Math.min(content.length, bestStart + windowSize);

  let excerpt = content.slice(contextStart, contextEnd).trim();

  if (contextStart > 0) excerpt = "..." + excerpt;
  if (contextEnd < content.length) excerpt = excerpt + "...";

  return excerpt;
}
