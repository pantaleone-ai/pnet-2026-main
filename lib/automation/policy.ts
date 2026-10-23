/**
 * Shared automation policy evaluator (deterministic, no LLM).
 * Decides allow | deny | needs_review | retry_later for content, campaign,
 * and social operations using existing issue metadata, QA results, approval
 * state, credentials, caps, and evidence.
 *
 * A passing QA score never overrides a hard failure. L1/L2 approval
 * semantics from modules/campaign-os/src/autonomy.ts are preserved:
 * requiresApproval(level<=2) without an approval present => needs_review.
 */
import { AUTOMATION_POLICY } from "@/config/automation/policy";

export type PolicyDecisionKind =
  | "allow"
  | "deny"
  | "needs_review"
  | "retry_later";

export interface PolicyCheck {
  /** Stable check id, e.g. "issue-open", "qa-threshold", "creds-present". */
  id: string;
  /** true = pass, false = fail, null = unknown / cannot verify. */
  ok: boolean | null;
  /** Hard gates deny (or needs_review when unknown); soft gates retry_later. */
  hard: boolean;
  detail?: string;
}

export interface PolicyInput {
  system: "social" | "campaign" | "content";
  channel?: string;
  rule?:
    | "gallery-live"
    | "synthetic-proof"
    | "campaign-promote"
    | "content-discover"
    | "other";
  autonomyLevel?: 1 | 2 | 3 | 4;
  approvalPresent?: boolean;
  checks: PolicyCheck[];
}

export interface PolicyDecision {
  decision: PolicyDecisionKind;
  reasonCodes: string[];
  policy: string;
  target: { system: PolicyInput["system"]; channel?: string; rule?: string };
  autonomyLevel?: number;
  evaluatedAt: string;
  retryEligible: boolean;
}

function codesFor(input: PolicyInput): {
  deny: string[];
  review: string[];
  retry: string[];
} {
  const deny: string[] = [];
  const review: string[] = [];
  const retry: string[] = [];
  for (const c of input.checks) {
    if (c.ok === true) continue;
    if (c.ok === null) {
      // Unknown on a hard gate => needs_review; on a soft gate => retry_later.
      if (c.hard) review.push(`${c.id}:unknown`);
      else retry.push(`${c.id}:unknown`);
      continue;
    }
    if (c.hard) deny.push(`${c.id}:fail`);
    else retry.push(`${c.id}:fail`);
  }
  // Autonomy gate: L1/L2 require approval; without it, needs_review (never allow).
  const level = input.autonomyLevel ?? 2;
  if (level <= 2 && !input.approvalPresent) {
    // Campaign/social flows that already carry an explicit approval label set
    // approvalPresent=true; absence means a human (or Rule 1/2 auto-label) must act.
    review.push("approval:absent-l1l2");
  }
  return { deny, review, retry };
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const { deny, review, retry } = codesFor(input);
  let decision: PolicyDecisionKind = "allow";
  if (deny.length > 0) decision = "deny";
  else if (review.length > 0) decision = "needs_review";
  else if (retry.length > 0) decision = "retry_later";
  return {
    decision,
    reasonCodes: [...deny, ...review, ...retry],
    policy: AUTOMATION_POLICY.version,
    target: { system: input.system, channel: input.channel, rule: input.rule },
    autonomyLevel: input.autonomyLevel,
    evaluatedAt: new Date().toISOString(),
    retryEligible: decision === "retry_later",
  };
}

/** QA check helper preserving thresholds (>=80 pass, 55-79 revise, <55 block). */
export function qaCheck(score: number | null): PolicyCheck {
  if (score === null || Number.isNaN(score)) {
    return { id: "qa-threshold", ok: null, hard: true, detail: "no score" };
  }
  if (score >= AUTOMATION_POLICY.qa.pass)
    return {
      id: "qa-threshold",
      ok: true,
      hard: true,
      detail: `score=${score}`,
    };
  if (score >= AUTOMATION_POLICY.qa.reviseMin) {
    return {
      id: "qa-threshold",
      ok: null,
      hard: true,
      detail: `score=${score} needs revision`,
    };
  }
  return {
    id: "qa-threshold",
    ok: false,
    hard: true,
    detail: `score=${score} blocked`,
  };
}

/** Common social hard-gate checks from publish-due / approval guards. */
export function socialChecks(opts: {
  open: boolean | null;
  packetReady: boolean | null;
  proofPresent: boolean | null;
  credsPresent: boolean | null;
  imagesPresent: boolean | null;
  mediaConflict: boolean | null;
  capReached: boolean | null;
  duplicateInProgress: boolean | null;
}): PolicyCheck[] {
  return [
    { id: "issue-open", ok: opts.open, hard: true },
    { id: "packet-ready", ok: opts.packetReady, hard: true },
    {
      id: "no-proof",
      ok: opts.proofPresent === null ? null : !opts.proofPresent,
      hard: true,
      detail: "proof-present guard",
    },
    { id: "creds-present", ok: opts.credsPresent, hard: true },
    { id: "images-present", ok: opts.imagesPresent, hard: true },
    {
      id: "media-dedupe",
      ok: opts.mediaConflict === null ? null : !opts.mediaConflict,
      hard: true,
    },
    {
      id: "cap-limit",
      ok: opts.capReached === null ? null : !opts.capReached,
      hard: false,
    },
    {
      id: "no-conflicting-job",
      ok: opts.duplicateInProgress === null ? null : !opts.duplicateInProgress,
      hard: false,
    },
  ];
}
