import { format } from "date-fns";
/**
 * Gets base URL for the app
 */
export function getBaseUrl(slug?: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://www.pantaleone.net");

  if (!slug) return baseUrl;

  // Ensure slug starts with forward slash
  const normalizedSlug = slug.startsWith("/") ? slug : `/${slug}`;
  return `${baseUrl}${normalizedSlug}`;
}

// Slugify
export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize(`NFD`)
    .trim()
    .replace(/\./g, ``)
    .replace(/\s+/g, `-`)
    .replace(/[^\w-]+/g, ``)
    .replace(/--+/g, `-`);
}
export function formatDate(date: string, formatStr: string = "MMM d, yyyy") {
  return format(new Date(date), formatStr);
}

export function parseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  // Split by hyphen, en dash, or em dash with surrounding spaces
  const parts = dateStr.split(/\s+[–—-]\s+/);
  const lastPart = parts[parts.length - 1];
  const endDate = lastPart?.trim();

  if (!endDate) return 0;

  if (endDate.toLowerCase().includes("present")) {
    return new Date().getTime();
  }
  const timestamp = new Date(endDate).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Gets the most recent date (usually end date) from a list of positions.
 * This determines the sorting order of the experience.
 */
export function getMostRecentDate(
  positions: Array<{ employmentPeriod: string }>,
): Date {
  const timestamps = positions
    .map((pos) => parseDate(pos.employmentPeriod))
    .filter((timestamp) => timestamp !== 0);

  if (timestamps.length === 0) return new Date(0); // Fallback for no dates

  // Sort descending to get the latest date first
  timestamps.sort((a, b) => b - a);
  const mostRecent = timestamps[0];
  return new Date(mostRecent ?? 0);
}

export const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0]![i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j]![0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,
        matrix[j - 1]![i]! + 1,
        matrix[j - 1]![i - 1]! + cost,
      );
    }
  }

  return matrix[b.length]![a.length]!;
};

/**
 * Maps product category names to URL slugs for consistent routing
 */
export function getProductCategorySlug(category: string): string {
  // Map category names to URL slugs
  const categoryMapping: Record<string, string> = {
    'Apps': 'ai-apps',
    'Ai Workflows': 'ai-workflows',
    // Add more mappings as needed for future categories
  };

  return categoryMapping[category] || category.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Resolve a product image URL to an absolute https URL for shopping feeds.
 *
 * Google Shopping (`image_link` / `additional_image_link`) and Meta catalog
 * both reject relative paths, protocol-relative URLs, and URLs with
 * whitespace/control chars. This normalizes every stored value:
 * - trims whitespace/control chars
 * - `https://...` kept as-is (upgrades `http://` to `https://`)
 * - `//host/path` -> `https://host/path`
 * - `/path` -> `${baseUrl}/path`
 * - `path` -> `${baseUrl}/path`
 * - empty -> `${baseUrl}/summary_large_image.png` fallback so the feed
 *   never emits an empty image_link (which fails validation for all
 *   destinations).
 */
export function toAbsoluteImageUrl(
  url: string | undefined | null,
  baseUrl: string,
): string {
  const fallback = `${baseUrl.replace(/\/+$/, "")}/summary_large_image.png`;
  const raw = (url ?? "").trim();
  if (!raw) return fallback;

  // Strip tabs/newlines that break TSV/XML feeds.
  const clean = raw.replace(/[\t\n\r]+/g, " ").trim();
  if (!clean) return fallback;

  if (/^https?:\/\//i.test(clean)) {
    // Prefer https for crawlability; img.pantaleone.net + site both serve https.
    return clean.replace(/^http:\/\//i, "https://");
  }
  if (clean.startsWith("//")) return `https:${clean}`;

  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  if (clean.startsWith("/")) return `${normalizedBase}${clean}`;
  return `${normalizedBase}/${clean}`;
}
