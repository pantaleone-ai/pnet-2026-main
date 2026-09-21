import { NextRequest, NextResponse } from "next/server";
import { submitUrlsToIndexNow, getIndexNowClient } from "@/lib/indexnow";

// Admin/cron-triggered endpoint: per-request origin work, never CDN-shared
// on POST. Explicit force-dynamic + no-store on all mutations.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
// 10k URLs cap bounds legit bodies; reject absurd payloads before parsing.
const MAX_BODY_BYTES = 512 * 1024;

/**
 * Manual IndexNow URL submission endpoint
 * POST /api/indexnow/submit
 *
 * Body: { urls: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: NO_STORE },
      );
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'urls' array in request body" },
        { status: 400, headers: NO_STORE }
      );
    }

    if (urls.length > 10000) {
      return NextResponse.json(
        { error: "Maximum 10,000 URLs per submission" },
        { status: 400, headers: NO_STORE }
      );
    }

    // Validate URLs
    const client = getIndexNowClient();
    const { valid, invalid } = client.validateUrls(urls);

    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid URLs found",
          valid,
          invalid
        },
        { status: 400, headers: NO_STORE }
      );
    }

    // Submit to IndexNow
    const results = await submitUrlsToIndexNow(valid);

    // Count successes and failures
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      message: `Submitted ${valid.length} URLs to ${results.length} search engines`,
      urlsSubmitted: valid.length,
      engines: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map(r => ({
        engine: r.engine,
        success: r.success,
        urlsSubmitted: r.urlsSubmitted,
        error: r.error,
        responseTime: r.responseTime,
      })),
    }, { headers: NO_STORE });

  } catch (error) {
    console.error("IndexNow submission error:", error);
    return NextResponse.json(
      { error: "Internal server error during submission" },
      { status: 500, headers: NO_STORE }
    );
  }
}

/**
 * GET /api/indexnow/submit - Get submission status/help
 */
export async function GET() {
  const client = getIndexNowClient();
  const config = client.getConfig();

  return NextResponse.json({
    message: "IndexNow API endpoint",
    config: {
      host: config.host,
      keyLocation: config.keyLocation,
      verificationUrl: `https://${config.host}/${config.apiKey}.txt`,
    },
    usage: {
      method: "POST",
      body: {
        urls: ["https://your-domain.com/page1", "https://your-domain.com/page2"]
      },
      maxUrls: 10000,
    },
    supportedEngines: ["bing", "yandex", "seznam", "naver"],
  }, {
    // Static per-deploy usage doc: short shared cache absorbs scanner waves.
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
