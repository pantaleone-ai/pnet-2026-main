import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APEX_HOST = "pantaleone.net";
const CANONICAL_HOST = "www.pantaleone.net";

/**
 * App-level safety net enforcing the www canonical host.
 *
 * The edge (Cloudflare) already 308-redirects apex -> www, but if that
 * rule is ever bypassed or removed, every apex URL would serve a 200 with
 * apex canonicals stripped — a duplicate-host SEO split. This middleware
 * guarantees a single-hop 301 to the canonical host for any request that
 * reaches the origin on the apex, preserving path and query.
 *
 * Only matches the exact apex host. Localhost, preview deployments, and
 * www pass through untouched.
 */
export function middleware(request: NextRequest) {
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
