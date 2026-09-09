import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { submitUrlsToIndexNow, getIndexNowClient } from "@/lib/indexnow";

/**
 * Manual IndexNow URL submission endpoint
 * POST /api/indexnow/submit
 *
 * Body: { urls: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'urls' array in request body" },
        { status: 400 }
      );
    }

    if (urls.length > 10000) {
      return NextResponse.json(
        { error: "Maximum 10,000 URLs per submission" },
        { status: 400 }
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
        { status: 400 }
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
    });

  } catch (error) {
    console.error("IndexNow submission error:", error);
    return NextResponse.json(
      { error: "Internal server error during submission" },
      { status: 500 }
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
  });
}
