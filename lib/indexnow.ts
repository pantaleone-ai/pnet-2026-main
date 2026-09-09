import { getBaseUrl } from "./helpers";

/**
 * IndexNow API client for instant search engine indexing
 * Supports Bing, Yandex, Seznam, and Naver
 */

export interface IndexNowConfig {
  apiKey: string;
  host: string;
  keyLocation: string;
}

export interface IndexNowSubmission {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface IndexNowResponse {
  success: boolean;
  engine: string;
  urlsSubmitted: number;
  error?: string;
  responseTime?: number;
}

// IndexNow endpoints for different search engines
const INDEXNOW_ENDPOINTS = {
  bing: "https://www.bing.com/indexnow",
  yandex: "https://yandex.com/indexnow",
  seznam: "https://search.seznam.cz/indexnow",
  naver: "https://searchadvisor.naver.com/indexnow",
} as const;

export class IndexNowClient {
  private config: IndexNowConfig;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.INDEXNOW_API_KEY;
    if (!key) {
      throw new Error("IndexNow API key not configured. Set INDEXNOW_API_KEY environment variable.");
    }

    const host = process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') || 'pantaleone.net';

    this.config = {
      apiKey: key,
      host: host,
      keyLocation: `${getBaseUrl()}/${key}.txt`,
    };
  }

  /**
   * Submit URLs to a specific search engine
   */
  async submitToEngine(engine: keyof typeof INDEXNOW_ENDPOINTS, urls: string[]): Promise<IndexNowResponse> {
    const startTime = Date.now();
    const endpoint = INDEXNOW_ENDPOINTS[engine];

    const payload: IndexNowSubmission = {
      host: this.config.host,
      key: this.config.apiKey,
      keyLocation: this.config.keyLocation,
      urlList: urls,
    };

    try {
      console.log(`IndexNow: Submitting ${urls.length} URLs to ${engine}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        console.log(`IndexNow: Successfully submitted ${urls.length} URLs to ${engine} (${responseTime}ms)`);
        return {
          success: true,
          engine,
          urlsSubmitted: urls.length,
          responseTime,
        };
      } else {
        const errorText = await response.text();
        console.error(`IndexNow: Failed to submit to ${engine} - ${response.status}: ${errorText}`);
        return {
          success: false,
          engine,
          urlsSubmitted: 0,
          error: `${response.status}: ${errorText}`,
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`IndexNow: Error submitting to ${engine}:`, error);
      return {
        success: false,
        engine,
        urlsSubmitted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      };
    }
  }

  /**
   * Submit URLs to all supported search engines
   */
  async submitToAll(urls: string[]): Promise<IndexNowResponse[]> {
    if (!urls.length) {
      console.log('IndexNow: No URLs to submit');
      return [];
    }

    if (urls.length > 10000) {
      throw new Error('IndexNow: Maximum 10,000 URLs per submission');
    }

    console.log(`IndexNow: Submitting ${urls.length} URLs to all search engines`);

    const results = await Promise.allSettled(
      Object.keys(INDEXNOW_ENDPOINTS).map(engine =>
        this.submitToEngine(engine as keyof typeof INDEXNOW_ENDPOINTS, urls)
      )
    );

    return results.map(result =>
      result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            engine: 'unknown',
            urlsSubmitted: 0,
            error: result.reason?.message || 'Promise rejected',
          }
    );
  }

  /**
   * Validate URLs before submission
   */
  validateUrls(urls: string[]): { valid: string[], invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          valid.push(url);
        } else {
          invalid.push(url);
        }
      } catch {
        invalid.push(url);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get configuration for verification
   */
  getConfig(): IndexNowConfig {
    return { ...this.config };
  }
}

// Singleton instance
let indexNowClient: IndexNowClient | null = null;

export function getIndexNowClient(apiKey?: string): IndexNowClient {
  if (!indexNowClient || apiKey) {
    indexNowClient = new IndexNowClient(apiKey);
  }
  return indexNowClient;
}

/**
 * Quick submit function for immediate use
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<IndexNowResponse[]> {
  const client = getIndexNowClient();
  return client.submitToAll(urls);
}

/**
 * Submit single URL to all search engines
 */
export async function submitUrlToIndexNow(url: string): Promise<IndexNowResponse[]> {
  return submitUrlsToIndexNow([url]);
}
