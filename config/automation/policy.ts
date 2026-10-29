/**
 * Shared automation policy configuration.
 * One place for thresholds, caps, and rule flags so every loop
 * (content, campaign, social) evaluates the same contract.
 * New auto-approval classes ship disabled-by-default.
 */
export const AUTOMATION_POLICY = {
  version: "2026-10-29.1",
  qa: {
    /** Score >= pass: eligible for normal approval evaluation. */
    pass: 80,
    /** Score >= reviseMin: revision required (needs_review), below = blocked. */
    reviseMin: 55,
  },
  social: {
    rules: {
      /** Rule 1: gallery-live catalog item may auto-approve. */
      galleryLive: true,
      /** Rule 2: synthetic-proof reshare may auto-approve (best-fit target). */
      syntheticProof: true,
    },
    /**
     * Social copy audit (budgets + voice + fidelity + anti-slop scan).
     * pass → proceed; warn → record, proceed; fail → needs_review, block
     * auto-approval and publication. Never rewrites. Kill switch: false.
     */
    audit: {
      enabled: true,
    },
    /**
     * Nightly synthetic.pics auto-posting (gallery poll -> issues -> packets
     * -> SYN_TIMING_WINDOWS slots -> FB native schedule / IG slot crons ->
     * Graph-verified audit-close). Kill switch: enabled=false (intake refuses
     * --apply; scheduled runs become read-only). intakeLimit caps new
     * artworks per night (FIFO oldest-first).
     */
    nightly: {
      enabled: true,
      intakeLimit: 10,
      mixphd: {
        enabled: true,
        intakeLimit: 2,
      },
    },
    /**
     * Advertising upgrade (2026-10-29): angle variants are advisory-only.
     * Rule 3 advertising-pass auto-allows packet-ready issues with
     * social-audit=pass across ALL apps (SYN+MIX first). Fail still blocks.
     * Paid requires explicit --paid + credentialed endpoint, never auto.
     */
    advertising: {
      anglesEnabled: true,
      autoAllowOnPass: true,
      paidEnabled: true,
      paidAutoApprove: false,
    },
    caps: {
      maxPerWeekCombined: 4,
      maxPerPlatformPerWeek: 2,
      minDelayHoursAfterSource: 48,
      minGapHoursBetweenReshares: 48,
    },
  },
  campaign: {
    /** Deterministic low-risk auto-promotion only; L1/L2 approval gates stay. */
    autoPromoteDeterministic: true,
    tickLimit: 25,
    maxAttempts: 3,
  },
  content: {
    /** Discovery guardrail: one run never floods the backlog. */
    maxNewTopicsPerRun: 5,
    staleClaimDays: 7,
  },
  watchdog: {
    needsScreenshotSlaHours: 72,
    backlogGrowthWarn: 40,
  },
} as const;

export type AutomationPolicy = typeof AUTOMATION_POLICY;
