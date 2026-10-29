/**
 * Advertising adapter: maps upstream advertising-skills thinking
 * (skills/advertising/upstream/skills) to local social-growth contracts.
 *
 * Pure, no side effects. Never invents metrics, pricing, or testimonials.
 * All copy outputs must still pass COPY_BUDGETS + social-audit + editorial.
 */
import { strategyFor } from "@/config/social-growth/product-matrix";
import { COPY_BUDGETS, countWords } from "@/lib/social-growth/caption";

export type AwarenessStage =
  | "unaware"
  | "problem-aware"
  | "solution-aware"
  | "product-aware"
  | "most-aware";

export type AngleKind =
  | "pain"
  | "desire"
  | "proof"
  | "identity"
  | "contrarian";

export interface AvatarProfile {
  appId: string;
  audience: string;
  problem: string;
  valueProposition: string;
  primaryConversion: string;
  primaryCta: string;
}

export interface OfferProfile {
  appId: string;
  outcome: string;
  timeSaved: string;
  effortRemoved: string;
  riskReduced: string;
  whyNow: string;
}

/** avatar-extraction → grounded in product-matrix (no invented persona). */
export function avatarFor(appId: string): AvatarProfile | undefined {
  const s = strategyFor(appId);
  if (!s) return undefined;
  return {
    appId,
    audience: s.audience,
    problem: s.problem,
    valueProposition: s.valueProposition,
    primaryConversion: s.primaryConversion,
    primaryCta: s.primaryCta,
  };
}

/** offer-extraction → outcomes over features, specificity over hype. */
export function offerFor(appId: string): OfferProfile | undefined {
  const s = strategyFor(appId);
  if (!s) return undefined;
  return {
    appId,
    outcome: s.primaryConversion,
    timeSaved: s.valueProposition,
    effortRemoved: s.problem,
    riskReduced: `Start with ${s.secondaryConversion.toLowerCase()}`,
    whyNow: `New ${s.recurringThemes[0] ?? "drop"} is live`,
  };
}

/**
 * schwartz-awareness-mapper → cold surfaces get education,
 * warm surfaces get offer. Conservative by default.
 */
export function awarenessFor(
  platform: string,
  pillar: string,
): { stage: AwarenessStage; angleDirection: "education" | "offer" } {
  const coldPlatforms = new Set(["pinterest", "reddit", "tiktok"]);
  const proofPillars = new Set(["proof", "product", "comparison"]);
  if (coldPlatforms.has(platform)) {
    return { stage: "problem-aware", angleDirection: "education" };
  }
  if (proofPillars.has(pillar)) {
    return { stage: "solution-aware", angleDirection: "offer" };
  }
  return { stage: "problem-aware", angleDirection: "education" };
}

/** mechanism-builder → one-sentence why-it-works note (no hype). */
export function mechanismNote(appId: string): string {
  const s = strategyFor(appId);
  if (!s) return "";
  return `${s.valueProposition}. Starts with ${s.secondaryConversion.toLowerCase()}.`;
}

export interface AngleVariant {
  kind: AngleKind;
  hook: string;
  frameworkId: string;
}

/**
 * ad-angle-multiplier + headline-matrix → 5 budget-safe hook variants.
 * Each hook is truncated to COPY_BUDGETS (4–10 words target, 100ch hard max).
 * Callers must still run auditSocialCopy; this never auto-publishes.
 */
export function anglesFor(
  appId: string,
  seedHook: string,
  pillar = "discovery",
): AngleVariant[] {
  const s = strategyFor(appId);
  const cta = s?.primaryCta ?? "Learn more";
  const fit = (text: string): string => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sliced = words.slice(0, COPY_BUDGETS.hookTargetWords[1]).join(" ");
    return sliced.length > COPY_BUDGETS.hookMaxChars
      ? `${sliced.slice(0, COPY_BUDGETS.hookMaxChars - 1).trimEnd()}…`
      : sliced;
  };
  void pillar;
  void cta;
  const clean = seedHook.trim().replace(/\s+/g, " ");
  const candidates: AngleVariant[] = [
    { kind: "pain", hook: fit(clean), frameworkId: "problem-solution" },
    { kind: "desire", hook: fit(`For ${s?.audience ?? "you"}: ${clean}`), frameworkId: "use-case-demo" },
    { kind: "proof", hook: fit(`Measured: ${clean}`), frameworkId: "stateless-proof" },
    { kind: "identity", hook: fit(`Built for ${s?.audience ?? "makers"}: ${clean}`), frameworkId: "use-case-demo" },
    { kind: "contrarian", hook: fit(`Not hype, just ${clean}`), frameworkId: "myth-reality" },
  ];
  return candidates.filter((a) => countWords(a.hook) >= 2);
}

/** objection-crusher → FAQ-style answers (Reddit/LinkedIn only). */
export function objectionAnswers(appId: string): Array<{ objection: string; response: string }> {
  const s = strategyFor(appId);
  if (!s) return [];
  return [
    { objection: "Price", response: `Starts with ${s.secondaryConversion.toLowerCase()} — ${s.primaryCta.toLowerCase()} when ready.` },
    { objection: "Time", response: `One step in the app: ${s.valueProposition.toLowerCase()}.` },
    { objection: "Trust", response: `Real product output only — see ${s.domain}.` },
  ];
}

/** Paid objectives allowed for paid_social UTM (no new vendors). */
export const PAID_OBJECTIVES = ["traffic", "conversion", "retargeting"] as const;
export type PaidObjective = (typeof PAID_OBJECTIVES)[number];

/** Paid-ready platforms (gated by credentials at publish time). */
export const PAID_PLATFORMS = ["meta", "tiktok", "youtube"] as const;
export type PaidPlatform = (typeof PAID_PLATFORMS)[number];
