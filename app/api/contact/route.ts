import { contactFormSchema } from "@/features/contact/helpers/validations";
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

// Rate limiter: 5 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const identifier = getIdentifier(request);
    try {
      await limiter.check(5, identifier); // 5 requests per minute
    } catch {
      logger.warn("Rate limit exceeded", {
        context: "contact-api",
        meta: { ip: identifier },
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const result = contactFormSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      logger.error("Validation error in contact form", result.error, {
        context: "contact-api",
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email, message, name } = result.data;

    logger.info("Processing contact form submission", {
      context: "contact-api",
      meta: { name, email },
    });

    // Sanitize user input to prevent XSS
    const sanitizedName = escape(name);
    const sanitizedEmail = escape(email);
    const sanitizedMessage = escape(message);

    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: CONTACT_TO_EMAILS,
      subject: `New Contact Form Submission from ${sanitizedName}`,
      replyTo: email,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
      `,
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
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
        { status: 500 },
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

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      id: data?.id,
    });
  } catch (error) {
    logger.error("Unexpected error in contact form", error, {
      context: "contact-api",
    });
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 },
    );
  }
}
