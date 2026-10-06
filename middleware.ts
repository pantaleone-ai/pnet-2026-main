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

  // Dead content with no equivalent: 410 regardless of host.
  if (isGonePath(pathname)) {
    return new NextResponse(GONE_HTML, {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
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

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
