import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirectToHome = (_path: string) => {
    return NextResponse.redirect(new URL("/", request.url), 301);
  };

  const redirectToBlog = (_path: string) => {
    return NextResponse.redirect(new URL("/blog", request.url), 301);
  };

  const redirectToRSS = (_path: string) => {
    return NextResponse.redirect(new URL("/rss.xml", request.url), 301);
  };

  const redirectToShop = (_path: string) => {
    return NextResponse.redirect(new URL("/shop", request.url), 301);
  };

  if (pathname.startsWith("/p/")) {
    return redirectToHome(pathname);
  }

  if (pathname === "/grid" || pathname === "/sets") {
    return redirectToShop(pathname);
  }

  if (pathname === "/feed" || pathname === "/feed/") {
    return redirectToRSS(pathname);
  }

  if (pathname.startsWith("/tag/")) {
    return redirectToBlog(pathname);
  }

  if (
    pathname === "/digital-asset-nft-tag/technology" ||
    pathname === "/digital-asset-nft-tag/technology/"
  ) {
    return redirectToHome(pathname);
  }

  const blogPostRedirects: Record<string, string> = {
    "/blog/post/claude-sonnet-4-5-system-prompt-analysis":
      "/blog/claude-sonnet-4-5-system-prompt-analysis",
    "/blog/post/code-prompt-bytes": "/blog/code-prompt-bytes",
    "/blog/post/private-ai-stack-setup-in-minutes":
      "/blog/private-ai-stack-setup-in-minutes",
    "/blog/post/mcp-ai-server-for-highquality-ai":
      "/blog/mcp-ai-server-for-highquality-ai",
    "/blog/claude-opus-4.6-system-prompt-analysis-tuning-insights-template":
      "/blog/claude-opus-4.6-system-prompt-analysis-tuning-insights-template",
  };

  if (blogPostRedirects[pathname]) {
    return NextResponse.redirect(
      new URL(blogPostRedirects[pathname], request.url),
      301,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)",
  ],
};
