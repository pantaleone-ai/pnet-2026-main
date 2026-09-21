import { searchPosts } from "@/actions/search";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server";

// Per-query dynamic search over local content. Query-dependent JSON, but
// cacheable per-URL: Vercel's CDN keys on the full URL including the query
// string, so distinct queries are distinct cache entries (no cross-query
// poisoning). A short 60s CDN TTL absorbs burst/bot waves without serving
// meaningfully stale results; errors and rate-limits stay no-store.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const SHARED_SHORT = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=60, stale-while-revalidate=300",
} as const;

// Lean hit: the only fields any consumer renders (title/description/
// snippet/category/link parts + score). Drops the heavy product/blog
// metadata (additionalImages, techStacks, inventory, purchaseUrl, body
// echoes, etc.) so each origin response is a fraction of its former bytes.
type LeanSearchHit = {
  type: "blog" | "product";
  slug: string;
  title: string;
  description: string;
  content: string;
  category?: string;
  score: number;
};

const LEAN_EXCERPT_CHARS = 200;

// Rate limiter: 20 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const identifier = getIdentifier(request);
    try {
      await limiter.check(20, identifier); // 20 requests per minute
    } catch {
      logger.warn("Rate limit exceeded", {
        context: "search-api",
        meta: { ip: identifier },
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: NO_STORE },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query")?.slice(0, 100);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query parameter of at least 2 characters is required" },
        { status: 400, headers: NO_STORE },
      );
    }

    const results = await searchPosts(query);
    const lean: LeanSearchHit[] = results.map((result) => ({
      type: result.type,
      slug: result.slug,
      title: result.title,
      description: result.description,
      content:
        typeof result.content === "string"
          ? result.content.slice(0, LEAN_EXCERPT_CHARS)
          : "",
      category:
        "category" in result && typeof result.category === "string"
          ? result.category
          : undefined,
      score: result.score,
    }));
    return NextResponse.json(lean, { headers: SHARED_SHORT });
  } catch (error) {
    logger.error("Search error", error, { context: "search-api" });
    return NextResponse.json(
      { error: "An error occurred while searching" },
      { status: 500, headers: NO_STORE },
    );
  }
}

// Non-GET methods are not supported; explicit 405 + no-store so misuse
// never writes a shared cache entry.
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed. Use GET with a ?query= parameter." },
    { status: 405, headers: NO_STORE },
  );
}

export async function PUT() {
  return POST();
}

export async function DELETE() {
  return POST();
}

export async function PATCH() {
  return POST();
}
