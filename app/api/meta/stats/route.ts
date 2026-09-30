import { NextResponse } from "next/server";

import { META_DATASET_ID, getCapiToken } from "@/lib/meta-capi";

// 7-day dataset event stats (aggregation=url). Used to verify the funnel
// is conversion-ready (PageView + ViewContent + lower-funnel events) and
// that zero events aggregate under vercel.app / localhost hosts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const token = getCapiToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "META_CAPI_ACCESS_TOKEN is not configured. Mint it from the Conversions API System User in Events Manager.",
      },
      { status: 503, headers: NO_STORE },
    );
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(
    Math.max(Number(searchParams.get("days") ?? 7) || 7, 1),
    28,
  );
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 24 * 60 * 60;

  try {
    const url =
      `https://graph.facebook.com/v21.0/${META_DATASET_ID}/stats` +
      `?aggregation=url&start_time=${start}&end_time=${end}` +
      `&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as {
      paging?: { next?: string; previous?: string; cursors?: unknown };
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: "Graph API error" },
        { status: 502, headers: NO_STORE },
      );
    }
    // Scrub the access token out of Graph pagination URLs before responding.
    if (data?.paging) {
      for (const key of ["next", "previous"] as const) {
        const pagingUrl = data.paging[key];
        if (typeof pagingUrl === "string") {
          try {
            const parsed = new URL(pagingUrl);
            parsed.searchParams.delete("access_token");
            data.paging[key] = parsed.toString();
          } catch {
            delete data.paging[key];
          }
        }
      }
    }
    return NextResponse.json(
      { dataset_id: META_DATASET_ID, days, stats: data },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Meta stats error:", error);
    return NextResponse.json(
      { error: "Stats fetch failed." },
      { status: 500, headers: NO_STORE },
    );
  }
}
