import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { chatbots } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getBillingConfig, isBillingLive, priceIdFor } from "@/lib/billing";
import { isValidPlanId, type BillingPeriod } from "@/config/plans";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const checkoutSchema = z.object({
  chatbotId: z.string().trim().min(1).max(128),
  planId: z.string().trim().min(1).max(32),
  billing: z.enum(["monthly", "annual"]),
});

/**
 * Create a Stripe Checkout Session (subscription mode). Only when billing
 * is live (keys + price IDs); otherwise 503 with a plain-English reason —
 * early-access users must never see a broken paywall.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!isValidPlanId(parsed.data.planId)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400, headers: NO_STORE });
  }
  const billing = parsed.data.billing as BillingPeriod;

  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    BETTER_AUTH_URL?: string;
    NEXT_PUBLIC_BASE_URL?: string;
  };
  const db = getDb(e.CHAT_DB);

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, parsed.data.chatbotId)).limit(1);
  if (!bot) {
    return NextResponse.json({ error: "Chatbot not found." }, { status: 404, headers: NO_STORE });
  }
  const membership = await requireOrgMembership(session.user.id, bot.organizationId);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only workspace owners can manage billing." }, { status: 403, headers: NO_STORE });
  }

  const cfg = getBillingConfig(e);
  const priceId = priceIdFor(parsed.data.planId, billing);
  if (!isBillingLive(cfg) || !priceId || !cfg.stripeSecretKey) {
    return NextResponse.json(
      { error: "Billing is not live yet. Your workspace stays on early access — nothing is charged." },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const stripe = new Stripe(cfg.stripeSecretKey);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        organization_id: bot.organizationId,
        chatbot_id: bot.id,
        plan_id: parsed.data.planId,
        billing,
      },
      subscription_data: {
        metadata: {
          organization_id: bot.organizationId,
          plan_id: parsed.data.planId,
          billing,
        },
      },
      success_url: `${cfg.appUrl}/dashboard?checkout=success`,
      cancel_url: `${cfg.appUrl}/dashboard?checkout=cancelled`,
    });
    if (!checkout.url) throw new Error("Checkout session has no URL.");
    return NextResponse.json({ url: checkout.url }, { headers: NO_STORE });
  } catch (err) {
    logger.error("Checkout creation failed", err, { context: "billing" });
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500, headers: NO_STORE });
  }
}
