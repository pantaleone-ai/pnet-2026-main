/**
 * Billing + entitlements (P5). Stripe is only touched when the owner has
 * provided keys AND price IDs (billing live). Until then every gate
 * stays open (early access) and checkout/portal return 503 — never a
 * silent half-enforcement.
 */
import { and, eq, gte } from "drizzle-orm";

import { subscriptions, usageEvents } from "@/drizzle/schema";
import type { ChatDatabase } from "@/lib/db";
import { CHAT_PLANS, getChatPlan, isValidPlanId, type BillingPeriod, type PlanId } from "@/config/plans";

export interface BillingEnv {
  stripeSecretKey?: string;
  webhookSecret?: string;
  appUrl: string;
}

export function getBillingConfig(env: {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_BASE_URL?: string;
}): BillingEnv {
  return {
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    appUrl:
      env.BETTER_AUTH_URL ??
      env.NEXT_PUBLIC_BASE_URL ??
      "https://www.pantaleone.net",
  };
}

export function priceIdFor(planId: PlanId, billing: BillingPeriod): string | null {
  const plan = getChatPlan(planId);
  return billing === "annual" ? plan.stripePrices.annual : plan.stripePrices.monthly;
}

/** Billing is live only when keys AND at least one price exist. */
export function isBillingLive(cfg: BillingEnv): boolean {
  if (!cfg.stripeSecretKey || !cfg.webhookSecret) return false;
  return CHAT_PLANS.some((p) => p.stripePrices.monthly || p.stripePrices.annual);
}

export interface Entitlement {
  planId: PlanId;
  status: string;
  aiRepliesPerMonth: number;
  assistants: number;
  sourcesPerAssistant: number;
  subscriptionId: string;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** Derive the org's effective entitlements, or null when none apply. */
export async function getEntitlement(
  db: ChatDatabase,
  organizationId: string,
): Promise<Entitlement | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  if (!sub || !ACTIVE_STATUSES.has(sub.status) || !sub.planId) return null;
  if (!isValidPlanId(sub.planId)) return null;
  const plan = getChatPlan(sub.planId);
  return {
    planId: plan.id,
    status: sub.status,
    aiRepliesPerMonth: plan.limits.aiRepliesPerMonth,
    assistants: plan.limits.assistants,
    sourcesPerAssistant: plan.limits.sourcesPerAssistant,
    subscriptionId: sub.id,
  };
}

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** AI replies consumed by the org since the start of the calendar month. */
export async function countMonthlyReplies(
  db: ChatDatabase,
  organizationId: string,
): Promise<number> {
  const rows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.organizationId, organizationId),
        eq(usageEvents.eventType, "message"),
        gte(usageEvents.createdAt, monthStart()),
      ),
    );
  return rows.length;
}

export interface Allowance {
  allowed: boolean;
  used: number;
  limit: number;
  planId: PlanId | null;
}

/**
 * Message allowance check. Billing not live → always allowed (early
 * access). Billing live but no subscription → not allowed (upgrade path
 * in the message). Billing live + subscription → enforce the plan cap.
 */
export async function checkMessageAllowance(
  db: ChatDatabase,
  cfg: BillingEnv,
  organizationId: string,
): Promise<Allowance> {
  if (!isBillingLive(cfg)) {
    return { allowed: true, used: 0, limit: Number.POSITIVE_INFINITY, planId: null };
  }
  const entitlement = await getEntitlement(db, organizationId);
  if (!entitlement) {
    return { allowed: false, used: 0, limit: 0, planId: null };
  }
  const used = await countMonthlyReplies(db, organizationId);
  return {
    allowed: used < entitlement.aiRepliesPerMonth,
    used,
    limit: entitlement.aiRepliesPerMonth,
    planId: entitlement.planId,
  };
}
