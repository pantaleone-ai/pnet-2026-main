import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  getAudienceId,
  getResendClient,
  DEFAULT_FROM_EMAIL,
  parseRecipients,
} from "@/lib/resendClient";
import { escape } from "html-escaper";
import { NextResponse } from "next/server";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address.").max(254),
});

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: Request) {
  try {
    const identifier = getIdentifier(request);
    try {
      await limiter.check(5, identifier);
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const result = newsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 },
      );
    }

    const { email } = result.data;
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
            context: "newsletter-api",
          });
        }
      }
    }

    const { error } = await resend.emails.send({
      from: process.env.NEWSLETTER_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: parseRecipients(process.env.CONTACT_EMAIL, "contact@pantaleone.net"),
      subject: `New newsletter signup: ${escape(email)}`,
      replyTo: email,
      html: `<p><strong>New newsletter signup:</strong> ${escape(email)}</p>`,
      text: `New newsletter signup: ${email}`,
    });

    if (error) {
      logger.error("Resend API error", error, { context: "newsletter-api" });
      return NextResponse.json(
        { error: "Subscription failed. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Unexpected error in newsletter signup", error, {
      context: "newsletter-api",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
