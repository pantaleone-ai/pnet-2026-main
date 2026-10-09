import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APEX_HOST = "pantaleone.net";
const CANONICAL_HOST = "www.pantaleone.net";

/**
 * First path segments with no equivalent live page. These are dead legacy
 * photo-blog / directory URLs (old `/p/*`, `/tag/*`, `/nft-art/*` etc.).
 * They return 410 Gone instead of a soft-404 301 to the homepage so Google
 * drops them instead of reporting them as "Page with redirect" forever.
 */
const GONE_SEGMENTS = new Set([
  "p",
  "tag",
  "nft-art",
  "product",
  "digital-asset-nft-tag",
  "buy-nfts-and-custom-artwork",
]);

function isGonePath(pathname: string): boolean {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return GONE_SEGMENTS.has(firstSegment);
}

/**
 * Legacy paths that DO have a true equivalent. Returns the destination
 * pathname, or null when the path is not a legacy redirect.
 */
function getLegacyDestination(pathname: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (normalized === "/grid" || normalized === "/sets") return "/shop";
  if (normalized === "/feed") return "/rss.xml";
  if (
    normalized === "/about" ||
    normalized === "/education" ||
    normalized === "/experience"
  )
    return "/";
  if (
    normalized === "/blog/post" ||
    normalized.startsWith("/blog/post/")
  ) {
    return `/blog${normalized.slice("/blog/post".length)}`;
  }
  return null;
}

/**
 * App Router flight requests must never produce a cacheable response.
 * Cloudflare bypasses them via the `[pnet-2026] bypass dynamic + RSC`
 * cache rule (primary), but the origin header is still the 24h HTML block
 * from `next.config.mjs` — and the Vercel layer was observed caching flight
 * payloads (`x-vercel-cache: HIT` on `text/x-component`, 2026-10). Marking
 * the response `no-store` here keeps both layers from ever caching flight
 * data, even if the CF rule is bypassed or removed.
 */
function isFlightRequest(request: NextRequest): boolean {
  if (request.headers.get("rsc") === "1") return true;
  if (request.headers.get("next-router-prefetch") === "1") return true;
  if (request.headers.get("next-router-state-tree") !== null) return true;
  if (request.headers.get("next-router-segment-prefetch") !== null)
    return true;
  return request.nextUrl.searchParams.has("_rsc");
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
} as const;

function applyNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  response.headers.set(
    "Vercel-CDN-Cache-Control",
    NO_STORE_HEADERS["Vercel-CDN-Cache-Control"],
  );
  return response;
}

const GONE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page no longer exists. <a href="https://www.pantaleone.net/">Return to the homepage</a>.</p></body></html>`;

/**
 * Canonical-host enforcement + legacy-URL handling in a single edge hop.
 *
 * The edge (Cloudflare) already 308-redirects apex -> www, but if that
 * rule is ever bypassed or removed, every apex URL would serve a 200 with
 * apex canonicals stripped — a duplicate-host SEO split. Handling legacy
 * paths here (instead of only in `next.config.mjs` redirects) collapses
 * apex + legacy URLs (e.g. `pantaleone.net/grid`) into a single 301 to
 * the canonical target, instead of a two-hop chain
 * (apex -> www -> destination).
 *
 * Only the exact apex host is rewritten. Localhost, preview deployments,
 * and www pass through untouched (except for legacy/gone handling, which
 * applies on every host so behavior is identical everywhere).
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Dead content with no equivalent: 410 regardless of host. no-store so
  // neither CDN layer pins the Gone body (observed: 404/410 HTML inheriting
  // the 24h HTML block, 2026-10).
  if (isGonePath(pathname)) {
    return new NextResponse(GONE_HTML, {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  }

  // Legacy path with a true equivalent: single-hop 301 to the canonical
  // absolute URL (host + path fixed in one redirect).
  const legacyDestination = getLegacyDestination(pathname);
  if (legacyDestination) {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.pathname = legacyDestination;
    return NextResponse.redirect(url, 301);
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === APEX_HOST) {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const response = NextResponse.next();
  // Flight responses must never be cacheable at origin (CF bypass is
  // primary; this is the Vercel-layer backstop). Plain HTML passes through
  // untouched so the 24h/1yr next.config split keeps working.
  if (isFlightRequest(request)) {
    applyNoStore(response);
    response.headers.set("Vary", "RSC");
  }
  return response;
}

// Matcher excludes fingerprinted/static assets so the edge function never
// runs (and never bills Fluid CPU) for cacheable bytes. Dynamic HTML,
// /api/*, /checkout, legacy redirects (/grid, /blog/post/*, /feed) and
// 410 prefixes (/p, /tag, ...) still run — apex->www single-hop 301,
// legacy 301s, and 410 Gone are preserved. RSC/prefetch bypass lives in
// Cloudflare cache rules (never cache flight data); middleware stamps
// no-store on flight responses as the origin/Vercel-layer backstop.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.*|rss.xml|opengraph-image|fonts|images|favicons|files).*)",
  ],
};
