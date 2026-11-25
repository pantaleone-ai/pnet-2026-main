import corpus from "./chat-corpus.json";
import { levenshtein } from "./helpers";
import { SEARCH_MAX_RESULTS } from "./search-server";

export type ChatSourceDoc = {
  type: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  /** Product category slug (e.g. ai-apps) — deep-links citations to /shop/[category]/[slug]. */
  category?: string;
  /** Editorial topic aliases from the corpus builder (scored like title matches). */
  aliases?: string[];
  /**
   * Provenance: exact lexical matches need title-level evidence
   * (MIN_LEXICAL_SCORE) to count; fuzzy typo-rescues and Vectorize
   * rescues pass through on the strength of their own signal.
   */
  origin?: "lexical" | "fuzzy" | "vector";
};

export const MIN_LEXICAL_SCORE = 10;

export type ChatRetrievalHit = ChatSourceDoc & {
  excerpt: string;
  score: number;
};

const MAX_QUERY_LENGTH = 100;
const FUZZY_THRESHOLD = 2;

// Same scoring weights as site search (lib/search-server.ts): title +10,
// slug +8, description +6, content +4. Kept in sync manually — if the
// weights change there, update here and re-run scripts/chat-eval.mjs.
// Body-text matching requires 4+ char terms: short tokens ("sea", "aid")
// match inside unrelated longer words ("research") and fabricate
// confident-looking hits out of off-topic queries.
function scoreDoc(doc: ChatSourceDoc, terms: string[]): number {
  let score = 0;
  const title = doc.title.toLowerCase();
  const description = doc.description.toLowerCase();
  const content = doc.content.toLowerCase();
  const slug = doc.slug.toLowerCase();
  for (const word of terms) {
    if (title.includes(word)) score += 10;
    if (slug.includes(word)) score += 8;
    if (description.includes(word)) score += 6;
    if (word.length >= 4 && content.includes(word)) score += 4;
    if (
      word.length >= 4 &&
      doc.aliases?.some((a) => a.toLowerCase().includes(word))
    )
      score += 10;
  }
  return score;
}

function slugTokens(slug: string): string[] {
  return slug.toLowerCase().split(/[-_/\s]+/).filter(Boolean);
}

function fuzzyScore(doc: ChatSourceDoc, terms: string[]): number {
  let score = 0;
  // Only match substantial tokens: short title/slug words ("for", "top",
  // "ai") sit within edit distance 2 of countless unrelated query words
  // and turned gibberish queries into confident-looking citations.
  const titleTerms = doc.title
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  const slugTerms = slugTokens(doc.slug).filter((t) => t.length >= 4);
  const longTerms = terms.filter((w) => w.length >= 4);
  for (const word of longTerms) {
    if (titleTerms.some((t) => levenshtein(t, word) <= FUZZY_THRESHOLD))
      score += 5;
    if (slugTerms.some((t) => levenshtein(t, word) <= FUZZY_THRESHOLD))
      score += 4;
  }
  return score;
}

function excerptAround(content: string, query: string): string {
  if (!content || !query.trim()) return content.slice(0, 300);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const windowSize = 150;
  let bestScore = 0;
  let bestStart = 0;
  for (let i = 0; i < content.length - windowSize; i += 50) {
    const window = content.slice(i, i + windowSize).toLowerCase();
    let score = 0;
    for (const word of words) {
      score += (window.split(word).length - 1) * word.length * 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }
  const start = Math.max(0, bestStart - 50);
  const end = Math.min(content.length, bestStart + windowSize);
  let out = content.slice(start, end).trim();
  if (start > 0) out = "..." + out;
  if (end < content.length) out = out + "...";
  return out;
}

// Stopword/short-token filtering mirrors lib/search-server.ts scoring:
// ubiquitous tokens score equally everywhere and only add ranking noise.
// "about" and "write" are included: alone they carried entire off-topic
// queries ("write a poem") to confident citations.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did",
  "do", "does", "for", "from", "had", "has", "have", "how", "if", "in",
  "is", "it", "its", "me", "my", "of", "on", "or", "our", "should",
  "so", "that", "the", "they", "this", "to", "was", "we", "what",
  "when", "where", "which", "who", "why", "will", "with", "you",
  "your", "about", "write", "get", "give", "much",
]);

function termsFor(query: string): string[] {
  const words = query.split(/\s+/).filter(Boolean);
  const cleaned = words
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return cleaned.length > 0 ? cleaned : words;
}

/**
 * Resolves Vectorize matches (which carry only metadata) back to full
 * corpus hits. Used to fuse semantic index results with lexical order.
 */
export function findDocsBySlugs(
  items: { type: string; slug: string }[],
  query: string,
): ChatRetrievalHit[] {
  const docs = (corpus as { docs: ChatSourceDoc[] }).docs;
  const lowered = query.trim().toLowerCase();
  const out: ChatRetrievalHit[] = [];
  for (const item of items) {
    const doc = docs.find((d) => d.type === item.type && d.slug === item.slug);
    if (doc) {
      out.push({
        ...doc,
        score: 0,
        origin: "vector" as const,
        excerpt: excerptAround(doc.content, lowered),
      });
    }
  }
  return out;
}

/**
 * Reciprocal rank fusion over id-keyed hit lists. Preserves lexical winners
 * unless semantic signals disagree across the pool (pure cosine reorder
 * demonstrably demotes strong lexical hits on this corpus).
 */
export function docKey(h: { type: string; slug: string }): string {
  return `${h.type}/${h.slug}`;
}

export function fuseRanks(lists: ChatRetrievalHit[][]): ChatRetrievalHit[] {
  const K = 60;
  const seen = new Map<string, { hit: ChatRetrievalHit; score: number }>();
  for (const list of lists) {
    list.forEach((hit, i) => {
      const key = docKey(hit);
      const entry = seen.get(key) ?? { hit, score: 0 };
      entry.score += 1 / (K + (i + 1));
      seen.set(key, entry);
    });
  }
  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .map((e) => e.hit);
}

/**
 * Pure, runtime-safe retrieval over the build-time corpus
 * (scripts/build-chat-corpus.mjs). No fs, no network — identical results
 * on Node, Vercel, and Cloudflare Workers.
 *
 * NOTE (retrieval fork): this intentionally differs from site search in
 * lib/search-server.ts. A catalog may show weak matches; the assistant
 * may only answer from strong ones (MIN_LEXICAL_SCORE floor, extra
 * stopwords, len>=4 content matching, fuzzy typo-rescue that bypasses the
 * floor). Keep the weights in sync, but do NOT merge the two paths.
 */
export function searchChatCorpus(query: string): ChatRetrievalHit[] {
  if (!query || typeof query !== "string") return [];
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (trimmed.length < 2) return [];
  const lowered = trimmed.toLowerCase();
  const terms = termsFor(lowered);
  const docs = (corpus as { docs: ChatSourceDoc[] }).docs;

  let hits = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .filter((h) => h.score > 0);

  if (hits.length === 0) {
    // Genuine typo path: fuzzy matches pass through regardless of the
    // lexical floor below — a near-miss on a real term is strong evidence.
    hits = docs
      .map((doc) => ({ doc, score: fuzzyScore(doc, terms) }))
      .filter((h) => h.score > 0);
    return hits
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_MAX_RESULTS)
      .map(({ doc, score }) => ({
        ...doc,
        score,
        origin: "fuzzy" as const,
        excerpt: excerptAround(doc.content, lowered),
      }));
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_MAX_RESULTS)
    .map(({ doc, score }) => ({
      ...doc,
      score,
      origin: "lexical" as const,
      excerpt: excerptAround(doc.content, lowered),
    }));
}
