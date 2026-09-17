import { searchPosts } from "@/actions/search";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server";

// Per-query dynamic search over local content. Results depend on the query
// string, so shared CDN caching would be a poisoning risk; mark no-store.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

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
    return NextResponse.json(results, { headers: NO_STORE });
  } catch (error) {
    logger.error("Search error", error, { context: "search-api" });
    return NextResponse.json(
      { error: "An error occurred while searching" },
      { status: 500, headers: NO_STORE },
    );
  }
}
