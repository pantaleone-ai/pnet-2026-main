import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { subscriptions, webhookEvents } from "@/drizzle/schema";
import { getDb, isUniqueViolation, type ChatDatabase } from "@/lib/db";
import { getBillingConfig } from "@/lib/billing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function randomId(): string {
  return crypto.randomUUID();
}

function toDateOrNull(value: number | null | undefined): Date | null {
  if (typeof value !== "number") return null;
  return new Date(value * 1000);
}

/**
 * Stripe webhook (signature-verified, idempotent). Handles subscription
 * lifecycle only — one row per organization, updated in place. Unknown
 * event types are recorded (for idempotency) and ignored.
 */
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  };
  const cfg = getBillingConfig(e as { STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; BETTER_AUTH_URL?: string });
  if (!cfg.stripeSecretKey || !cfg.webhookSecret) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503, headers: NO_STORE });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400, headers: NO_STORE });
  }
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = new Stripe(cfg.stripeSecretKey);
    // NOTE: the sync constructEvent uses SubtleCrypto synchronously, which
    // Workers does not allow — the async variant is required here (and
    // works everywhere, including Node).
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, cfg.webhookSecret);
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", {
      context: "billing",
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400, headers: NO_STORE });
  }

  const db = getDb(e.CHAT_DB);
  // Idempotency: apply first, journal second. Every handler below is an
  // idempotent upsert keyed by org or event id, so a crash between apply
  // and journaling is safe (retry re-applies the same values, then hits
  // the UNIQUE row). Journal-first would be wrong here: a failed apply
  // must stay retryable, not skipped as "duplicate".
  try {
    await applyEvent(db, event);
  } catch (err) {
    logger.error("Stripe webhook apply failed", err, {
      context: "billing",
      meta: { eventId: event.id, type: event.type },
    });
    return NextResponse.json({ error: "Handler failed." }, { status: 500, headers: NO_STORE });
  }
  try {
    await db.insert(webhookEvents).values({ stripeEventId: event.id, type: event.type });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Lost a race with a concurrent delivery of the same event after
      // a successful apply — already handled.
      return NextResponse.json({ received: true, duplicate: true }, { headers: NO_STORE });
    }
    throw err;
  }
  return NextResponse.json({ received: true }, { headers: NO_STORE });
}

async function upsertSubscription(
  db: ChatDatabase,
  organizationId: string,
  data: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    planId?: string | null;
    status: string;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  },
): Promise<void> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  if (existing) {
    await db
      .update(subscriptions)
      .set({
        ...(data.stripeCustomerId !== undefined ? { stripeCustomerId: data.stripeCustomerId } : {}),
        ...(data.stripeSubscriptionId !== undefined ? { stripeSubscriptionId: data.stripeSubscriptionId } : {}),
        ...(data.stripePriceId !== undefined ? { stripePriceId: data.stripePriceId } : {}),
        ...(data.planId !== undefined ? { planId: data.planId } : {}),
        status: data.status,
        ...(data.currentPeriodEnd !== undefined ? { currentPeriodEnd: data.currentPeriodEnd } : {}),
        ...(data.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: data.cancelAtPeriodEnd } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
    return;
  }
  await db.insert(subscriptions).values({
    id: randomId(),
    organizationId,
    stripeCustomerId: data.stripeCustomerId ?? null,
    stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    stripePriceId: data.stripePriceId ?? null,
    planId: data.planId ?? null,
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  });
}

function firstItem(sub: Stripe.Subscription): Stripe.SubscriptionItem | null {
  const item = sub.items?.data?.[0];
  return item && typeof item === "object" && "id" in item ? (item as Stripe.SubscriptionItem) : null;
}

function priceOf(sub: Stripe.Subscription): string | null {
  const price = firstItem(sub)?.price;
  return typeof price?.id === "string" ? price.id : null;
}

function periodEndOf(sub: Stripe.Subscription): number | null {
  const end = firstItem(sub)?.current_period_end;
  return typeof end === "number" ? end : null;
}

async function applyEvent(db: ChatDatabase, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;
      if (!organizationId) return;
      // The subscription object may not be expanded — fetch is avoided on
      // purpose (webhook must stay fast); the subscription.* event that
      // follows carries the authoritative state.
      if (typeof session.subscription === "string") {
        await upsertSubscription(db, organizationId, {
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: session.subscription,
          planId: session.metadata?.plan_id ?? null,
          status: "incomplete",
        });
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const organizationId =
        sub.metadata?.organization_id ??
        (await findOrgByCustomer(db, typeof sub.customer === "string" ? sub.customer : null));
      if (!organizationId) return;
      await upsertSubscription(db, organizationId, {
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceOf(sub),
        planId: sub.metadata?.plan_id ?? null,
        status: sub.status,
        currentPeriodEnd: toDateOrNull(periodEndOf(sub)),
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      });
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const organizationId =
        sub.metadata?.organization_id ??
        (await findOrgByCustomer(db, typeof sub.customer === "string" ? sub.customer : null));
      if (!organizationId) return;
      await upsertSubscription(db, organizationId, {
        stripeSubscriptionId: sub.id,
        status: "canceled",
        cancelAtPeriodEnd: false,
      });
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      const organizationId = await findOrgByCustomer(db, customerId);
      if (!organizationId) return;
      await upsertSubscription(db, organizationId, { status: "past_due" });
      return;
    }
    default:
      return;
  }
}

async function findOrgByCustomer(
  db: ChatDatabase,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const [sub] = await db
    .select({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  if (sub) return sub.organizationId;
  // Fallback: match by customer email is unavailable here (no customer
  // object on the event) — leave unknown rather than guessing.
  return null;
}
