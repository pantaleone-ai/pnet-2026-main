/**
 * Single source of truth for Pantaleone Chat SaaS plans.
 *
 * The marketing page, onboarding, dashboard, billing, and enforcement code
 * all import from here — never hardcode plan names, limits, or prices in
 * UI or logic. Stripe price IDs are attached in P5 (billing); until then
 * `stripePriceId` stays null and checkout is disabled.
 *
 * Owner action before launch: confirm the limits and set launch prices.
 * Current numbers are early-access drafts, clearly labelled as such in UI.
 */
export type PlanId = "starter" | "growth" | "scale";

export interface ChatPlan {
  id: PlanId;
  name: string;
  /** Display price. Null = announced at launch (early access). */
  price: string | null;
  period: string;
  description: string;
  features: string[];
  cta: string;
  /** Signup handoff; scale routes to contact instead. */
  href: string;
  highlighted?: boolean;
  stripePriceId: string | null;
  limits: {
    /** Published chatbots per workspace. */
    chatbots: number;
    /** Visitor messages per month. */
    messagesPerMonth: number;
    /** Knowledge sources across the workspace. */
    knowledgeSources: number;
  };
}

export const CHAT_PLANS: ChatPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: null,
    period: "per month",
    description:
      "One assistant answering from your website. For small sites proving the concept.",
    features: [
      "1 published chatbot",
      "500 visitor messages per month",
      "1 knowledge source (website or files)",
      "Hosted chat page + embed snippet",
      "Lead capture (contact mode)",
      "Email support",
    ],
    cta: "Start early access",
    href: "/signup",
    stripePriceId: null,
    limits: { chatbots: 1, messagesPerMonth: 500, knowledgeSources: 1 },
  },
  {
    id: "growth",
    name: "Growth",
    price: null,
    period: "per month",
    description:
      "More bots, more sources, more conversations. For businesses running on inbound questions.",
    features: [
      "3 published chatbots",
      "5,000 visitor messages per month",
      "10 knowledge sources",
      "Everything in Starter",
      "Conversation history + search",
      "Lead inbox with CSV export",
      "Priority support",
    ],
    cta: "Start early access",
    href: "/signup",
    highlighted: true,
    stripePriceId: null,
    limits: { chatbots: 3, messagesPerMonth: 5000, knowledgeSources: 10 },
  },
  {
    id: "scale",
    name: "Scale",
    price: null,
    period: "custom",
    description:
      "High volume, multiple brands, or strict requirements. We scope it with you.",
    features: [
      "10 published chatbots",
      "25,000 visitor messages per month",
      "Unlimited knowledge sources",
      "Everything in Growth",
      "Custom retention + data controls",
      "Onboarding call",
    ],
    cta: "Talk to us",
    href: "/contact?enterprise=true",
    stripePriceId: null,
    limits: { chatbots: 10, messagesPerMonth: 25000, knowledgeSources: -1 },
  },
];

export function getChatPlan(id: PlanId): ChatPlan {
  const plan = CHAT_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown chat plan: ${id}`);
  return plan;
}
