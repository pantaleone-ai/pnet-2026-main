/**
 * Safe fetching for the ingest worker. Every URL (entry, redirect target,
 * sitemap, page) passes SSRF validation with DNS re-resolution per hop.
 * Bodies are size-capped via streaming reads; HTML-only for crawled pages.
 */
import {
  extractHrefs,
  isCrawlableCandidate,
  normalizeLink,
} from "../../../lib/ingest/text";
import { isFollowableRedirect, MAX_REDIRECT_HOPS } from "../../../lib/ingest/crawl";
import { parseOutboundUrl } from "../../../lib/security/ssrf";
import { resolvePublic } from "./dns";

const FETCH_TIMEOUT_MS = 20_000;
const ROBOTS_TIMEOUT_MS = 10_000;

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

/** Validate structure + current DNS before any fetch. Throws on rejection. */
export async function assertSafeUrl(raw: string): Promise<URL> {
  const url = parseOutboundUrl(raw);
  await resolvePublic(url.hostname);
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > maxBytes) throw new Error("Response exceeds size cap.");
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new Error("Response exceeds size cap.");
      }
      chunks.push(value);
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Fetch with manual redirect handling. Each hop is re-validated
 * (structure + DNS) and must satisfy the redirect policy. Returns the
 * final response body (capped) and landing URL.
 */
export async function safeFetch(url: URL, maxBytes: number): Promise<FetchedPage> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    await resolvePublic(current.hostname);
    const res = await fetchWithTimeout(current.href, FETCH_TIMEOUT_MS, {
      headers: { "user-agent": "PantaleoneChatBot/1.0 (+https://www.pantaleone.net)" },
    });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const location = res.headers.get("location");
      try { await res.arrayBuffer(); } catch { /* drain */ }
      if (!location) throw new Error(`Redirect without location at ${current.href}`);
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error(`Unparseable redirect target at ${current.href}`);
      }
      if (!isFollowableRedirect(current, next)) {
        throw new Error(`Redirect target not allowed: ${next.href}`);
      }
      parseOutboundUrl(next.href);
      current = next;
      continue;
    }
    if (status < 200 || status >= 300) {
      throw new Error(`Fetch failed with status ${status} at ${current.href}`);
    }
    const bytes = await readCapped(res, maxBytes);
    return {
      url: current.href,
      status,
      contentType: res.headers.get("content-type") ?? "",
      bytes,
    };
  }
  throw new Error("Too many redirects.");
}

export async function fetchText(url: string, maxBytes: number, timeoutMs = ROBOTS_TIMEOUT_MS): Promise<string | null> {
  try {
    await assertSafeUrl(url);
    const res = await fetchWithTimeout(url, timeoutMs, {
      headers: { "user-agent": "PantaleoneChatBot/1.0 (+https://www.pantaleone.net)" },
    });
    if (!res.ok) return null;
    const bytes = await readCapped(res, maxBytes);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export interface CrawlResult {
  pages: { url: string; html: string }[];
}

/**
 * Bounded same-origin BFS crawl. Sitemap URLs (when provided) seed the
 * queue; otherwise the entry page's links do. Robots disallows and the
 * caller's excluded paths prune candidates before any fetch.
 */
export async function crawlSite(options: {
  entry: URL;
  seeds: string[];
  isAllowedByRobots: (pathname: string) => boolean;
  excludedPaths: string[];
  maxPages: number;
  maxDepth: number;
  maxBytesPerPage: number;
  concurrency: number;
}): Promise<CrawlResult> {
  const { entry, seeds, isAllowedByRobots, excludedPaths, maxPages, maxDepth, maxBytesPerPage, concurrency } = options;
  const seen = new Set<string>();
  const queue: URL[] = [];
  const pages: { url: string; html: string }[] = [];
  const depths = new Map<string, number>();

  const enqueue = (url: URL, depth: number) => {
    const key = url.href.split("#")[0] ?? url.href;
    if (seen.has(key)) return;
    seen.add(key);
    depths.set(key, depth);
    queue.push(url);
  };

  for (const seed of seeds) {
    try {
      const u = new URL(seed);
      if (isCrawlableCandidate(u, entry, excludedPaths) && isAllowedByRobots(u.pathname)) enqueue(u, 1);
    } catch { /* skip bad seeds */ }
  }
  if (queue.length === 0) enqueue(entry, 0);

  async function processOne(url: URL): Promise<{ discovered: URL[]; page: { url: string; html: string } | null }> {
    const key = url.href.split("#")[0] ?? url.href;
    const depth = depths.get(key) ?? 0;
    let fetched: FetchedPage;
    try {
      fetched = await safeFetch(url, maxBytesPerPage);
    } catch {
      return { discovered: [], page: null };
    }
    if (!fetched.contentType.includes("html")) return { discovered: [], page: null };
    const html = new TextDecoder().decode(fetched.bytes);
    const discovered: URL[] = [];
    if (depth < maxDepth) {
      for (const href of extractHrefs(html)) {
        const next = normalizeLink(href, new URL(fetched.url));
        if (!next) continue;
        const nextKey = next.href.split("#")[0] ?? next.href;
        if (seen.has(nextKey)) continue;
        if (!isCrawlableCandidate(next, entry, excludedPaths)) continue;
        if (!isAllowedByRobots(next.pathname)) continue;
        seen.add(nextKey);
        depths.set(nextKey, depth + 1);
        discovered.push(next);
      }
    }
    return { discovered, page: { url: fetched.url, html } };
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const batch = queue.splice(0, concurrency);
    const results = await Promise.all(batch.map(processOne));
    for (const r of results) {
      if (r.page && pages.length < maxPages) pages.push(r.page);
      for (const d of r.discovered) {
        if (pages.length + queue.length < maxPages * 2) queue.push(d);
      }
    }
  }
  return { pages };
}
