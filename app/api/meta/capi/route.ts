import { NextResponse } from "next/server";
import { z } from "zod";

import { sendCapiEvents, userDataFromRequest } from "@/lib/meta-capi";
import { isProdRequestHost } from "@/lib/meta-pixel";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";

// Browser -> server CAPI relay. The browser fires fbq with an eventID and
// POSTs the same eventID here; the server re-sends with IP/UA + fbc/fbp so
// Meta dedups the pair (same event_name + event_id).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 1000 });

const relaySchema = z.object({
  event_name: z.string().min(1).max(64),
  event_id: z.string().min(1).max(128),
  event_time: z.number().int().positive().optional(),
  event_source_url: z.string().url().max(1024).optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  // Marketing-consent assertion from the browser (localStorage-gated
  // before fbq ever fires; the server trusts nothing else).
  consented: z.boolean().optional(),
  email: z.string().email().max(254).optional(),
  fbp: z.string().max(256).optional(),
  fbc: z.string().max(256).optional(),
});

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405, headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  try {
    try {
      await limiter.check(60, getIdentifier(request));
    } catch {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: NO_STORE },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON." },
        { status: 400, headers: NO_STORE },
      );
    }

    const parsed = relaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400, headers: NO_STORE },
      );
    }

    const payload = parsed.data;

    // Consent gate: never forward unconsented browser events.
    if (payload.consented === false) {
      return NextResponse.json(
        { received: false, skipped: "no-consent" },
        { headers: NO_STORE },
      );
    }

    // Domain gate: only prod event sources reach the dataset. Referer /
    // origin fallback covers sendBeacon posts without event_source_url.
    const candidate =
      payload.event_source_url ??
      request.headers.get("referer") ??
      request.headers.get("origin") ??
      undefined;
    if (candidate) {
      try {
        if (!isProdRequestHost(new URL(candidate).host)) {
          return NextResponse.json(
            { received: false, skipped: "non-prod-source" },
            { headers: NO_STORE },
          );
        }
      } catch {
        return NextResponse.json(
          { received: false, skipped: "bad-source-url" },
          { headers: NO_STORE },
        );
      }
    }

    const userData = userDataFromRequest(request, {
      email: payload.email,
      fbc: payload.fbc,
      fbp: payload.fbp,
    });

    const result = await sendCapiEvents(
      [
        {
          event_name: payload.event_name,
          event_id: payload.event_id,
          event_time: payload.event_time,
          event_source_url: payload.event_source_url,
          user_data: userData,
          custom_data: payload.custom_data,
        },
      ],
      { eventSourceUrl: candidate },
    );

    return NextResponse.json(
      {
        received: result.sent,
        dedupId: result.dedupId,
        ...(result.skipped ? { skipped: result.skipped } : {}),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Meta CAPI relay error:", error);
    return NextResponse.json(
      { error: "Relay failed." },
      { status: 500, headers: NO_STORE },
    );
  }
}
