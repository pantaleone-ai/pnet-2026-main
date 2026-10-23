/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Runtime-only loader for the existing anti-slop engine (modules/anti-slop).
 * Dynamic import keeps tsc from pulling the excluded vendored sources into
 * the app's strict program; dist is gitignored so a missing build falls back
 * to local checks instead of failing. Never rewrites — scan + gate only.
 *
 * Voice profile mirrors lib/social-growth/caption.ts BANNED_PHRASES plus the
 * never-do openers from the social-content-engine skill (no "Exciting news",
 * no "We're thrilled", no invented claims). URLs/UTM params are protected
 * spans so tracking strings never count as findings.
 */
export interface SlopVoice {
  bannedStylisticHabits: string[];
}

export const SOCIAL_SLOP_VOICE = {
  name: "pantaleone-social",
  sentenceLengthPreference: "short",
  directness: 0.9,
  emotionalIntensity: 0.1,
  bannedStylisticHabits: [
    "future of",
    "revolutionizing",
    "game-changing",
    "cutting-edge",
    "unlock the",
    "like and share",
    "tag a friend",
    "comment below",
    "follow for more",
    "you won't believe",
    "exciting news",
    "thrilled to announce",
    "we're thrilled",
    "we are thrilled",
    "excited to share",
    "excited to announce",
    "proud to announce",
    "big announcement",
    "game changer",
    "next level",
    "elevate your",
    "supercharge",
  ],
};

export async function loadSlopEngine(): Promise<{
  scanText: (
    input: string,
    opts?: {
      voiceProfile?: unknown;
      protectedTerms?: string[];
      contentType?: string;
    },
  ) => {
    findings: Array<{
      pattern: string;
      category: string;
      severity: string;
      confidence: number;
    }>;
  };
  runGate: (findings: unknown[]) => {
    passed: boolean;
    hardFailures: unknown[];
    softWarnings: unknown[];
  };
} | null> {
  try {
    const [scanner, gate] = await Promise.all([
      import("../../modules/anti-slop/dist/engine/scanner.js"),
      import("../../modules/anti-slop/dist/engine/quality-gate.js"),
    ]);
    if (typeof scanner.scanText !== "function") return null;
    if (typeof gate.runQualityGate !== "function") return null;
    return {
      scanText: (input: string, opts?: object) =>
        scanner.scanText(input, {
          contentType: "prose",
          voiceProfile: SOCIAL_SLOP_VOICE,
          ...(opts ?? {}),
        }),
      runGate: (findings: unknown[]) => gate.runQualityGate(findings),
    };
  } catch {
    return null;
  }
}
