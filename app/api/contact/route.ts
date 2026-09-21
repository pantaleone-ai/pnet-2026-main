import {
  HONEYPOT_FIELD,
  MIN_SUBMIT_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  contactPayloadSchema,
  isHoneypotFilled,
} from "@/lib/validations/contact";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { escape } from "html-escaper";
import { NextResponse } from "next/server";
import {
  getResendClient,
  DEFAULT_FROM_EMAIL,
  parseRecipients,
} from "@/lib/resendClient";
import { randomUUID } from "crypto";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const GA_API_SECRET =
  process.env.GOOGLE_ANALYTICS_API_SECRET || process.env.GA_API_SECRET;
// Admin recipients for contact submissions. Supports a comma-separated list
// so mail can go to a deliverable inbox while the domain mailbox is set up.
// NOTE: pantaleone.net currently has no MX records, so any @pantaleone.net
// address alone cannot receive mail. Set CONTACT_EMAIL to a working inbox.
const CONTACT_TO_EMAILS = parseRecipients(
  process.env.CONTACT_EMAIL,
  "contact@pantaleone.net",
);

// Transactional POST-only API: per-request origin work, never CDN-shared.
// Explicit force-dynamic + no-store on every response keeps bot/abuse
// traffic from writing shared cache entries or triggering ISR bookkeeping.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
// Field caps (zod) bound legit bodies to ~6KB; reject junk floods early.
const MAX_BODY_BYTES = 20 * 1024;

const SUCCESS_MESSAGE = "Message sent successfully";

/**
 * Edge rate-limiting stub: 5 submissions per 15 minutes per IP.
 * Backed by an in-memory LRU on a single instance; replace with
 * Upstash/Vercel KV for multi-instance production enforcement.
 */
const limiter = rateLimit({
  interval: RATE_LIMIT_WINDOW_MS,
  uniqueTokenPerInterval: 1000,
});

function bodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

/** Silent-drop response: identical shape to a real success so bots learn nothing. */
function falsePositiveSuccess() {
  return NextResponse.json(
    { success: true, message: SUCCESS_MESSAGE },
    { headers: NO_STORE },
  );
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
    // 1. Rate limiting check (per IP)
    const identifier = getIdentifier(request);
    try {
      await limiter.check(RATE_LIMIT_MAX, identifier);
    } catch {
      logger.warn("Rate limit exceeded", {
        context: "contact-api",
        meta: { ip: identifier },
      });
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

    // 2. Honeypot check FIRST: silent drop with a false-positive 200.
    // Never send email, never trigger alerts, never reveal detection.
    if (isHoneypotFilled(body?.[HONEYPOT_FIELD])) {
      logger.warn("Honeypot triggered, dropping silently", {
        context: "contact-api",
        meta: { ip: identifier },
      });
      return falsePositiveSuccess();
    }

    // 3. Validate + tolerantly clean inputs (trimming happens in the schema).
    const result = contactPayloadSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      logger.error("Validation error in contact form", result.error, {
        context: "contact-api",
      });
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: NO_STORE },
      );
    }

    const { email, message, name, inquiryType, mountedAt } = result.data;

    // 4. Time-delta entropy check: flag sub-human submissions for review
    // but NEVER block — autofill + fast humans can legitimately beat it.
    const dwellMs =
      typeof mountedAt === "number" ? Date.now() - mountedAt : null;
    const suspectedBot = dwellMs !== null && dwellMs < MIN_SUBMIT_MS;
    if (suspectedBot) {
      logger.warn("Suspected bot timing, queuing separately", {
        context: "contact-api",
        meta: { ip: identifier, dwellMs, inquiryType },
      });
    }

    logger.info("Processing contact form submission", {
      context: "contact-api",
      meta: { name, email, inquiryType, suspectedBot },
    });

    // 5. Strict server-side sanitization before forwarding downstream.
    const sanitizedName = escape(name);
    const sanitizedEmail = escape(email);
    const sanitizedInquiry = escape(inquiryType);
    const sanitizedMessage = escape(message);

    const resend = getResendClient();
    const subjectPrefix = suspectedBot ? "[REVIEW] " : "";
    const { data, error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: CONTACT_TO_EMAILS,
      subject: `${subjectPrefix}New Contact Form Submission from ${sanitizedName} — ${sanitizedInquiry}`,
      replyTo: email,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Inquiry type:</strong> ${sanitizedInquiry}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
      `,
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nInquiry type: ${inquiryType}\n\n${message}`,
    });

    if (error) {
      logger.error("Resend API error", error, { context: "contact-api" });
      const isDomainError =
        error.message?.toLowerCase().includes("domain") ||
        error.message?.toLowerCase().includes("verify");
      return NextResponse.json(
        {
          error: isDomainError
            ? "Email service is misconfigured. Please try again later."
            : "Failed to send email. Please try again later.",
          details: error.message,
        },
        { status: 500, headers: NO_STORE },
      );
    }

    logger.info("Email sent successfully", {
      context: "contact-api",
      meta: { id: data?.id, to: CONTACT_TO_EMAILS },
    });

    // Track contact form submission in analytics (server-side GA4 MP only;
    // client PostHog/gtag tracking happens in the browser)
    if (GA_MEASUREMENT_ID && GA_API_SECRET) {
      // Server-side GA4 Measurement Protocol (requires client_id)
      fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: randomUUID(),
            events: [
              {
                name: "generate_lead",
                params: {
                  form_name: "contact",
                  success: true,
                },
              },
            ],
          }),
        },
      ).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: SUCCESS_MESSAGE,
        id: data?.id,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    logger.error("Unexpected error in contact form", error, {
      context: "contact-api",
    });
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again later.",
      },
      { status: 500, headers: NO_STORE },
    );
  }
}
