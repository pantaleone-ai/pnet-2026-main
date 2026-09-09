import { NextRequest } from "next/server";

/**
 * IndexNow verification endpoint
 * Returns the API key as plain text for verification
 * URL: /api/indexnow/{api-key}.txt
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  // Verify the key matches our configured API key
  const configuredKey = process.env.INDEXNOW_API_KEY;

  if (!configuredKey) {
    return new Response("IndexNow API key not configured", { status: 500 });
  }

  if (key !== configuredKey) {
    return new Response("Invalid API key", { status: 403 });
  }

  // Return the API key as plain text
  return new Response(configuredKey, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
    },
  });
}
