import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  getAudienceId,
  getResendClient,
  DEFAULT_FROM_EMAIL,
} from "@/lib/resendClient";
import { escape } from "html-escaper";
import { NextResponse } from "next/server";
import { z } from "zod";

const leadMagnetSchema = z.object({
  email: z.string().email("Please enter a valid email address.").max(254),
  guide: z.string().min(1).max(200).optional().default("guide"),
});

// Transactional POST-only API: per-request origin work, never CDN-shared.
// Explicit force-dynamic + no-store on every response keeps bot/abuse
// traffic from writing shared cache entries or triggering ISR bookkeeping.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
// Field caps (zod) bound legit bodies to <1KB; reject junk floods early.
const MAX_BODY_BYTES = 8 * 1024;

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

function bodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

// Non-POST methods are not supported; explicit 405 + no-store so misuse
// never writes a shared cache entry.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405, headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  try {
    const identifier = getIdentifier(request);
    try {
      await limiter.check(5, identifier);
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: NO_STORE },
      );
    }

    if (bodyTooLarge(request)) {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413, headers: NO_STORE },
      );
    }

    const body = await request.json();
    const result = leadMagnetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400, headers: NO_STORE },
      );
    }

    const { email, guide } = result.data;
    const resend = getResendClient();

    const audienceId = await getAudienceId();
    if (audienceId) {
      const { error: contactError } = await resend.contacts.create({
        audienceId,
        email,
      });
      if (contactError) {
        const alreadyExists =
          contactError.message?.toLowerCase().includes("already") ||
          contactError.message?.toLowerCase().includes("exists");
        if (!alreadyExists) {
          logger.error("Resend contacts error", contactError, {
            context: "lead-magnet-api",
          });
        }
      }
    }

    const downloadUrl =
      process.env.LEAD_MAGNET_DOWNLOAD_URL || "https://pantaleone.net";

    const { error } = await resend.emails.send({
      from: process.env.NEWSLETTER_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: email,
      subject: `Your ${guide} is ready`,
      html: `
        <p>Hi there,</p>
        <p>Thanks for requesting <strong>${escape(guide)}</strong>.</p>
        <p><a href="${escape(downloadUrl)}">Download it here</a>.</p>
        <p>Best regards,<br>Matt Pantaleone</p>
      `,
      text: `Thanks for requesting ${guide}. Download it here: ${downloadUrl}`,
    });

    if (error) {
      logger.error("Resend API error", error, { context: "lead-magnet-api" });
      return NextResponse.json(
        { error: "Delivery failed. Please try again later." },
        { status: 500, headers: NO_STORE },
      );
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    logger.error("Unexpected error in lead magnet", error, {
      context: "lead-magnet-api",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500, headers: NO_STORE },
    );
  }
}
