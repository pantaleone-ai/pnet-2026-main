import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { chatbots, subscriptions } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getBillingConfig, isBillingLive } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Stripe Billing Portal session for self-serve plan management
 * (upgrade/downgrade/cancel/payment method). Owner-only, and only when
 * the org actually has a Stripe customer to manage.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const chatbotId = new URL(request.url).searchParams.get("chatbotId")?.trim() || "";
  if (!chatbotId) {
    return NextResponse.json({ error: "chatbotId is required." }, { status: 400, headers: NO_STORE });
  }

  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    BETTER_AUTH_URL?: string;
  };
  const db = getDb(e.CHAT_DB);

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
  if (!bot) {
    return NextResponse.json({ error: "Chatbot not found." }, { status: 404, headers: NO_STORE });
  }
  const membership = await requireOrgMembership(session.user.id, bot.organizationId);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only workspace owners can manage billing." }, { status: 403, headers: NO_STORE });
  }

  const cfg = getBillingConfig(e);
  if (!isBillingLive(cfg) || !cfg.stripeSecretKey) {
    return NextResponse.json(
      { error: "Billing is not live yet. Your workspace stays on early access — nothing is charged." },
      { status: 503, headers: NO_STORE },
    );
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, bot.organizationId))
    .limit(1);
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet. Choose a plan to start checkout." },
      { status: 404, headers: NO_STORE },
    );
  }

  try {
    const stripe = new Stripe(cfg.stripeSecretKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${cfg.appUrl}/dashboard`,
    });
    return NextResponse.json({ url: portal.url }, { headers: NO_STORE });
  } catch (err) {
    logger.error("Portal creation failed", err, { context: "billing" });
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500, headers: NO_STORE });
  }
}
