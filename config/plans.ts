/**
 * Single source of truth for Pantaleone Chat SaaS plans.
 *
 * The landing page, onboarding, dashboard, billing, and enforcement code
 * all import from here — never hardcode plan names, limits, or prices in
 * UI or logic.
 *
 * Billing model (2026-11-26): monthly default; annual = 10x monthly
 * (2 months free). Stripe price IDs attach in P5 (billing) — until then
 * `stripePrices` stay null and checkout is disabled; CTAs route to
 * signup with `?plan=` + `?billing=` preserved for later handoff.
 *
 * Agency guardrail: client workspaces, white-labeling, per-client
 * permissions, and cross-client reporting are NOT implemented. They are
 * tracked here as `planned: true` for internal roadmap use only and must
 * never render on public marketing (see `isMarketable`).
 *
 * Add-ons (evaluated 2026-11-26, NOT offered until billing supports
 * entitlements — do not surface in UI yet):
 * - +1,000 AI replies $15/mo · +1 assistant $15/mo ·
 *   remove branding $19/mo · custom onboarding $299 one-time.
 */
export type PlanId = "starter" | "growth" | "pro" | "agency";
export type BillingPeriod = "monthly" | "annual";

/** Months free on annual billing (annual total = monthly × (12 - N)). */
export const ANNUAL_FREE_MONTHS = 2;

export interface ChatPlanFeature {
  label: string;
  /** True when the capability exists in the product today. */
  available: boolean;
  /** Internal note for planned-but-unbuilt capabilities. Never marketed. */
  planned?: boolean;
}

export interface ChatPlan {
  id: PlanId;
  name: string;
  /** Intended buyer, shown on the card. */
  buyer: string;
  /** Positioning line (outcome-led, no hype). */
  positioning: string;
  /** Monthly price in USD. */
  monthlyPrice: number;
  cta: string;
  /** Signup handoff; agency routes to contact until self-serve is ready. */
  href: string;
  highlighted?: boolean;
  /**
   * Stripe price IDs, attached in P5 when the owner creates products in
   * test mode first, then live. Null = checkout disabled for that
   * interval; CTAs keep routing to signup (early access).
   */
  stripePrices: { monthly: string | null; annual: string | null };
  limits: {
    assistants: number;
    domains: number;
    /** Included AI replies per month, pooled across assistants. */
    aiRepliesPerMonth: number;
    /** Indexed pages per assistant. */
    pagesPerAssistant: number;
    /** Knowledge sources per assistant. */
    sourcesPerAssistant: number;
    teamMembers: number;
    /** Conversation history retention in days. */
    historyDays: number;
  };
  features: ChatPlanFeature[];
}

function f(label: string, available = true, planned = false): ChatPlanFeature {
  return { label, available, planned };
}

export const CHAT_PLANS: ChatPlan[] = [
  {
    id: "starter",
    name: "Starter",
    buyer: "One website needs a chatbot.",
    positioning:
      "Give your website a useful assistant. Answer common questions and help visitors find the information they need.",
    monthlyPrice: 29,
    cta: "Start with Starter",
    href: "/signup",
    stripePrices: { monthly: null, annual: null },
    limits: {
      assistants: 1,
      domains: 1,
      aiRepliesPerMonth: 1000,
      pagesPerAssistant: 100,
      sourcesPerAssistant: 5,
      teamMembers: 1,
      historyDays: 30,
    },
    features: [
      f("1 assistant"),
      f("1 website / domain"),
      f("1,000 AI replies / month"),
      f("Up to 100 indexed pages"),
      f("Up to 5 knowledge sources"),
      f("1 team member"),
      f("30-day conversation history"),
      f("Basic lead capture"),
      f("Website embed"),
      f("Hosted chatbot page"),
      f("Pantaleone branding"),
      f("Email support"),
    ],
  },
  {
    id: "growth",
    name: "Growth",
    buyer: "A growing business wants more leads.",
    positioning:
      "Do more than answer questions. Capture leads, review conversations, and give your team a better way to follow up.",
    monthlyPrice: 79,
    cta: "Choose Growth",
    href: "/signup",
    highlighted: true,
    stripePrices: { monthly: null, annual: null },
    limits: {
      assistants: 3,
      domains: 3,
      aiRepliesPerMonth: 4000,
      pagesPerAssistant: 500,
      sourcesPerAssistant: 10,
      teamMembers: 3,
      historyDays: 90,
    },
    features: [
      f("3 assistants"),
      f("3 websites / domains"),
      f("4,000 AI replies / month"),
      f("Up to 500 indexed pages per assistant"),
      f("Up to 10 knowledge sources per assistant"),
      f("3 team members"),
      f("90-day conversation history"),
      f("Lead inbox and conversation search"),
      f("Standard analytics"),
      f("Website embed"),
      f("Hosted chatbot pages"),
      f("Priority email support"),
    ],
  },
  {
    id: "pro",
    name: "Pro",
    buyer: "One business, multiple assistants.",
    positioning:
      "Run multiple specialized assistants across your business. Manage conversations, review performance, and maintain control from one place.",
    monthlyPrice: 199,
    cta: "Choose Pro",
    href: "/signup",
    stripePrices: { monthly: null, annual: null },
    limits: {
      assistants: 10,
      domains: 10,
      aiRepliesPerMonth: 12000,
      pagesPerAssistant: 2000,
      sourcesPerAssistant: 25,
      teamMembers: 10,
      historyDays: 365,
    },
    features: [
      f("10 assistants"),
      f("10 websites / domains"),
      f("12,000 AI replies / month"),
      f("Up to 2,000 indexed pages per assistant"),
      f("Up to 25 knowledge sources per assistant"),
      f("10 team members"),
      f("1-year conversation history"),
      f("Advanced lead management"),
      f("Advanced analytics"),
      f("Branding controls"),
      f("Priority support"),
    ],
  },
  {
    id: "agency",
    name: "Agency",
    buyer: "Agencies deploying for clients.",
    positioning:
      "Deploy and manage business chatbots for multiple clients from one platform. Add a recurring service without building the technology yourself.",
    monthlyPrice: 499,
    cta: "Choose Agency",
    href: "/contact?enterprise=true",
    stripePrices: { monthly: null, annual: null },
    limits: {
      assistants: 25,
      domains: 25,
      aiRepliesPerMonth: 40000,
      pagesPerAssistant: 2000,
      sourcesPerAssistant: 25,
      teamMembers: 10,
      historyDays: 365,
    },
    features: [
      f("25 assistants"),
      f("25 websites / domains"),
      f("40,000 AI replies / month"),
      f("Up to 2,000 indexed pages per assistant"),
      f("Up to 25 knowledge sources per assistant"),
      f("10 team members"),
      f("1-year conversation history"),
      f("Priority support"),
      // Guardrail: kept in config for roadmap tracking, never marketed.
      f("Client-level management", false, true),
      f("Cross-client analytics", false, true),
      f("White-label deployment", false, true),
    ],
  },
];

export function getChatPlan(id: string): ChatPlan {
  const plan = CHAT_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown chat plan: ${id}`);
  return plan;
}

export function isValidPlanId(id: string | null | undefined): id is PlanId {
  return (
    id === "starter" || id === "growth" || id === "pro" || id === "agency"
  );
}

/** Marketable features only — planned-but-unbuilt items never reach the UI. */
export function marketableFeatures(plan: ChatPlan): ChatPlanFeature[] {
  return plan.features.filter((feat) => feat.available);
}

/** Annual total: 10x monthly (2 months free). */
export function annualPrice(plan: ChatPlan): number {
  return plan.monthlyPrice * (12 - ANNUAL_FREE_MONTHS);
}

/** Whole-dollar saving vs 12 months monthly. */
export function annualSavings(plan: ChatPlan): number {
  return plan.monthlyPrice * 12 - annualPrice(plan);
}

/** Effective monthly cost on the annual plan, for display ("$24/mo billed annually"). */
export function annualEffectiveMonthly(plan: ChatPlan): number {
  return annualPrice(plan) / 12;
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
}

export function signupHref(
  plan: ChatPlan,
  billing: BillingPeriod,
  website?: string,
): string {
  // Contact-routed plans (agency) keep their destination untouched —
  // plan/billing params only apply to the self-serve signup flow.
  if (!plan.href.startsWith("/signup")) return plan.href;
  const params = new URLSearchParams({ plan: plan.id, billing });
  if (website) params.set("website", website);
  return `/signup?${params.toString()}`;
}
