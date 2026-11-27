/**
 * Shared ingestion primitives (P3). Pure functions only — identical behavior
 * in the API worker (validation), the ingest worker (crawl/chunk/embed),
 * and vitest. No fs, no network, no platform APIs here.
 */

export const INGEST_LIMITS = {
  /** Max pages crawled per website/sitemap source. */
  maxPagesPerSource: 200,
  /** Max bytes fetched per page. */
  maxBytesPerPage: 2 * 1024 * 1024,
  /** Max crawl depth from the entry URL. */
  maxDepth: 3,
  /** Max concurrent fetches per source job. */
  concurrency: 4,
  /** Uploaded file cap (PDF/TXT/MD/CSV). */
  maxUploadBytes: 10 * 1024 * 1024,
  /** Chunk target size in characters with overlap for context continuity. */
  chunkSize: 1500,
  chunkOverlap: 200,
  /** Max chunks stored per document (bounds runaway pages). */
  maxChunksPerDocument: 500,
  /** Max FAQ pairs per source. */
  maxFaqPairs: 200,
} as const;

export const ALLOWED_UPLOAD_TYPES = ["pdf", "txt", "md", "csv"] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

const UPLOAD_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
  csv: ["text/csv", "application/csv", "text/plain"],
};

export function uploadTypeFor(filename: string, mime: string): AllowedUploadType | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const type = (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(ext)
    ? (ext as AllowedUploadType)
    : null;
  if (!type) return null;
  // MIME is advisory (browsers lie); accept when it matches or is generic.
  const generic = ["application/octet-stream", ""];
  if (generic.includes(mime)) return type;
  return UPLOAD_MIME[type]?.includes(mime) ?? false ? type : null;
}

/**
 * Totally ordered, idempotent chunking: split on paragraph/sentence
 * boundaries up to chunkSize, carrying overlap chars forward so a fact
 * split across a boundary still matches. Deterministic for a given input —
 * re-ingestion produces identical chunk streams.
 */
export function chunkText(input: string): string[] {
  const { chunkSize, chunkOverlap, maxChunksPerDocument } = INGEST_LIMITS;
  const text = input.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < maxChunksPerDocument) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      // Prefer a paragraph break, then a sentence end, then a space.
      const window = text.slice(start, end);
      const para = window.lastIndexOf("\n\n");
      const sent = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
      );
      const space = window.lastIndexOf(" ");
      const cut = para > chunkSize * 0.4 ? para : sent > chunkSize * 0.4 ? sent + 1 : space > chunkSize * 0.4 ? space : -1;
      if (cut > 0) end = start + cut;
    }
    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= text.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }
  return chunks;
}

const STRIP_TAGS_RE =
  /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<aside[\s\S]*?<\/aside>|<!--[\s\S]*?-->/gi;

/**
 * Readable-text extraction without a DOM (Workers-safe). Drops boilerplate
 * containers, then tags, entities, and whitespace noise. Near-dup detection
 * happens in the ingest worker via content hashing.
 */
export function extractReadableText(html: string): string {
  const withoutBoilerplate = html.replace(STRIP_TAGS_RE, " ");
  const withoutTags = withoutBoilerplate.replace(/<[^>]*>/g, " ");
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Same-origin + robots scope check for crawl candidates. */
export function isCrawlableCandidate(
  candidate: URL,
  entry: URL,
  excludedPaths: string[],
): boolean {
  if (candidate.protocol !== "http:" && candidate.protocol !== "https:") return false;
  if (candidate.hostname.toLowerCase() !== entry.hostname.toLowerCase()) return false;
  if (candidate.username || candidate.password) return false;
  const path = candidate.pathname;
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|mp4|mp3|zip|gz)$/i.test(path)) return false;
  return !excludedPaths.some((p) => p && path.startsWith(p));
}

/** Normalize a discovered link against the page URL. Null when unusable. */
export function normalizeLink(href: string, base: URL): URL | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:")) return null;
  try {
    return new URL(trimmed, base);
  } catch {
    return null;
  }
}

/** Pull raw hrefs from anchor tags (regex pass; resolved by the worker). */
export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href) out.push(href);
  }
  return out;
}
