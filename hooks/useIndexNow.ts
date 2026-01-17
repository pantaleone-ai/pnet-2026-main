import { useCallback, useEffect, useRef } from "react";
import { submitUrlsToIndexNow } from "@/lib/indexnow";

/**
 * React hook for IndexNow instant indexing
 * Automatically submits URLs to search engines when content changes
 */

export interface UseIndexNowOptions {
  enabled?: boolean;
  delay?: number; // Delay before submission (ms)
  onSuccess?: (results: any[]) => void;
  onError?: (error: Error) => void;
}

export function useIndexNow(options: UseIndexNowOptions = {}) {
  const {
    enabled = true,
    delay = 1000, // 1 second delay
    onSuccess,
    onError,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Submit URLs with optional delay
  const submitUrls = useCallback(async (urls: string[], immediate = false) => {
    if (!enabled || urls.length === 0) return;

    const doSubmit = async () => {
      try {
        console.log("IndexNow: Submitting URLs from hook", urls);
        const results = await submitUrlsToIndexNow(urls);
        onSuccess?.(results);
        return results;
      } catch (error) {
        console.error("IndexNow hook error:", error);
        onError?.(error as Error);
        throw error;
      }
    };

    if (immediate) {
      return doSubmit();
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(doSubmit, delay);

    return new Promise((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        const result = await doSubmit();
        resolve(result);
      }, delay);
    });
  }, [enabled, delay, onSuccess, onError]);

  // Submit single URL
  const submitUrl = useCallback((url: string, immediate = false) => {
    return submitUrls([url], immediate);
  }, [submitUrls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    submitUrl,
    submitUrls,
  };
}

/**
 * Hook for blog post changes
 */
export function useBlogIndexNow(options?: UseIndexNowOptions) {
  const { submitUrl } = useIndexNow(options);

  const submitBlogPost = useCallback((slug: string) => {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/blog/${slug}`;
    return submitUrl(url);
  }, [submitUrl]);

  return { submitBlogPost };
}

/**
 * Hook for product changes
 */
export function useProductIndexNow(options?: UseIndexNowOptions) {
  const { submitUrl } = useIndexNow(options);

  const submitProduct = useCallback((category: string, slug: string) => {
    // Normalize category for URL
    const categorySlug = category === "Apps" ? "ai-apps" :
                        category === "Ai Workflows" ? "ai-workflows" :
                        category.toLowerCase().replace(/\s+/g, '-');

    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/shop/${categorySlug}/${slug}`;
    return submitUrl(url);
  }, [submitUrl]);

  return { submitProduct };
}

/**
 * Utility function to submit all URLs from a sitemap
 */
export async function submitSitemapUrls(sitemapUrl: string): Promise<void> {
  try {
    // Fetch sitemap
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xmlText = await response.text();

    // Simple XML parsing to extract URLs (basic implementation)
    const urlMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) {
      throw new Error("No URLs found in sitemap");
    }

    const urls = urlMatches
      .map(match => match.replace(/<\/?loc>/g, ''))
      .filter(url => url.trim().length > 0);

    if (urls.length === 0) {
      throw new Error("No valid URLs extracted from sitemap");
    }

    console.log(`IndexNow: Submitting ${urls.length} URLs from sitemap`);
    await submitUrlsToIndexNow(urls);

  } catch (error) {
    console.error("Error submitting sitemap URLs:", error);
    throw error;
  }
}
