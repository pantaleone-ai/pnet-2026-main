/**
 * Social copy audit: pass | warn | fail with reasons. Never rewrites.
 *
 * Layers (deterministic):
 *  1. Hard budgets — hook >100 chars, CTA >4 words / empty, FB hashtags,
 *     IG >3 hashtags → fail.
 *  2. Brand voice — existing lintCaption banned phrases/hashtags → fail.
 *  3. Source fidelity — caption must match its source-asset descriptors
 *     (titleMatchesArtwork) when descriptors are provided → fail.
 *  4. Anti-slop engine — scanText + quality gate on "hook. body";
 *     hard failures → fail, other high-severity findings → warn.
 *     Engine dist missing (not built) → layer skipped, noted in reasons.
 *  5. Brevity targets — hook 4-10 words, body 6-14 words, total <=28 words
 *     (excl. URL/hashtags); hook ending in "?" → warn.
 *  6. Cross-post repetition — optional recentTexts (normalized hook+body of
 *     recent issues); shared 4+-word phrase → warn with match count.
 *  7. Awareness fit (advertising-skills schwartz-awareness-mapper, advisory):
 *     cold platforms (pinterest/reddit/tiktok) carrying Most-Aware offer copy
 *     ("buy now", "book a call", "limited") → warn, never fail.
 *
 * Enforcement: pass → proceed; warn → record, proceed; fail → needs_review,
 * block auto-approval and publication until corrected.
 */
import {
  COPY_BUDGETS,
  countWords,
  lintCaption,
} from "@/lib/social-growth/caption";
import { titleMatchesArtwork } from "@/lib/social-growth/media-registry";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
import { loadSlopEngine } from "@/lib/social-growth/slop-engine";

export type AuditVerdict = "pass" | "warn" | "fail";

export interface SocialAuditInput {
  hook: string;
  body: string;
  cta: string;
  platform: "instagram" | "facebook" | "pinterest" | "x" | "reddit" | "linkedin" | "youtube-shorts" | "tiktok";
  pillar?: string;
  hashtags?: string[];
  /** Raw **Source asset:** field; descriptors resolved via SYN_CATALOG. */
  sourceAsset?: string;
  /** Destination URL: passed as an engine protected span (never a finding). */
  destinationUrl?: string;
  /** Normalized recent hook+body strings for repetition detection. */
  recentTexts?: string[];
}

export interface SocialAuditResult {
  verdict: AuditVerdict;
  reasons: string[];
  engineUsed: boolean;
  words: { hook: number; body: number; total: number };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sharedPhrase(a: string, b: string, minWords = 4): string | null {
  const aw = normalize(a).split(" ").filter(Boolean);
  const bset = new Set(
    Array.from(
      {
        length: Math.max(
          0,
          normalize(b).split(" ").filter(Boolean).length - minWords + 1,
        ),
      },
      (_, i) =>
        normalize(b)
          .split(" ")
          .filter(Boolean)
          .slice(i, i + minWords)
          .join(" "),
    ),
  );
  for (let i = 0; i <= aw.length - minWords; i += 1) {
    const phrase = aw.slice(i, i + minWords).join(" ");
    if (phrase.length >= 12 && bset.has(phrase)) return phrase;
  }
  return null;
}

/** Never-do openers (social-content-engine skill + voice profile). Warn level. */
const FORMULAIC_OPENERS = [
  "exciting news",
  "thrilled to announce",
  "we're thrilled",
  "we are thrilled",
  "excited to share",
  "excited to announce",
  "proud to announce",
  "big announcement",
  "introducing our",
  "introducing the",
];
export function parseSourceArtworkIds(sourceAsset: string): string[] {
  const ids = [...sourceAsset.matchAll(/20\d\d-\d\d-\d\d-[a-z0-9-]+/g)].map(
    (m) => m[0].trim(),
  );
  return [...new Set(ids)];
}

export function sourceDescriptors(sourceAsset: string): string[] {
  return parseSourceArtworkIds(sourceAsset).map((id) => {
    const hit = SYN_CATALOG.find((c) => c.id === id);
    return hit ? hit.descriptor : id.replace(/-/g, " ");
  });
}

export async function auditSocialCopy(
  input: SocialAuditInput,
): Promise<SocialAuditResult> {
  const fail: string[] = [];
  const warn: string[] = [];
  const hook = (input.hook ?? "").trim();
  const body = (input.body ?? "").trim();
  const cta = (input.cta ?? "").trim();
  const hookWords = countWords(hook);
  const bodyWords = countWords(body);
  const totalWords = hookWords + bodyWords + countWords(cta);
  const tags = input.hashtags ?? [];

  // Layer 1: hard budgets.
  if (!hook) fail.push("empty hook");
  if (hook.length > COPY_BUDGETS.hookMaxChars) {
    fail.push(
      `hook ${hook.length} chars exceeds hard max ${COPY_BUDGETS.hookMaxChars}`,
    );
  }
  if (!cta) fail.push("empty CTA");
  else if (countWords(cta) > COPY_BUDGETS.ctaMaxWords) {
    fail.push(`CTA "${cta}" exceeds ${COPY_BUDGETS.ctaMaxWords}-word rule`);
  }
  if (input.platform === "facebook" && tags.length > 0) {
    fail.push("facebook carries hashtags (must stay clean)");
  }
  if (
    input.platform === "instagram" &&
    tags.length > COPY_BUDGETS.instagramMaxTags
  ) {
    fail.push(
      `instagram has ${tags.length} hashtags (max ${COPY_BUDGETS.instagramMaxTags})`,
    );
  }

  // Layer 2: brand voice (existing rules).
  const lint = lintCaption([hook, "", body, "", `${cta}`].join("\n"), tags);
  for (const v of lint.violations) fail.push(`voice: ${v}`);

  // Layer 3: source fidelity.
  if (input.sourceAsset) {
    const descriptors = sourceDescriptors(input.sourceAsset);
    if (
      descriptors.length > 0 &&
      hook &&
      !titleMatchesArtwork(hook, descriptors)
    ) {
      fail.push(
        "caption does not match source asset (hook shares no vocabulary with artwork descriptors)",
      );
    }
  }

  // Layer 4: anti-slop engine (scan + gate, never rewrite).
  let engineUsed = false;
  try {
    const engine = await loadSlopEngine();
    if (engine) {
      engineUsed = true;
      const { findings } = engine.scanText(`${hook}. ${body}`, {
        protectedTerms: input.destinationUrl ? [input.destinationUrl] : [],
      });
      const gate = engine.runGate(findings);
      for (const f of gate.hardFailures as Array<{
        pattern?: string;
        category?: string;
      }>) {
        fail.push(
          `slop: ${String(f.pattern ?? "hard-gate")} (${String(f.category ?? "unknown")})`,
        );
      }
      const highs = (
        findings as Array<{ severity?: string; pattern?: string }>
      ).filter((f) => f.severity === "high");
      if (gate.hardFailures.length === 0 && highs.length > 0) {
        warn.push(
          `slop: ${highs.length} high-severity finding(s): ${highs
            .slice(0, 3)
            .map((f) => String(f.pattern ?? "?"))
            .join(", ")}`,
        );
      }
    } else {
      warn.push(
        "slop engine unavailable (dist not built) — engine layer skipped",
      );
    }
  } catch {
    warn.push("slop engine error — engine layer skipped");
  }

  // Layer 5: brevity targets (warn only).
  const [hookMin, hookMax] = COPY_BUDGETS.hookTargetWords;
  const [bodyMin, bodyMax] = COPY_BUDGETS.bodyTargetWords;
  if (hook && (hookWords < hookMin || hookWords > hookMax)) {
    warn.push(`hook ${hookWords} words (target ${hookMin}-${hookMax})`);
  }
  if (body && (bodyWords < bodyMin || bodyWords > bodyMax)) {
    warn.push(`body ${bodyWords} words (target ${bodyMin}-${bodyMax})`);
  }
  if (totalWords > COPY_BUDGETS.totalTargetWords) {
    warn.push(
      `total ${totalWords} words (target <= ${COPY_BUDGETS.totalTargetWords}, excl. URL/hashtags)`,
    );
  }
  if (/\?\s*$/.test(hook))
    warn.push(
      "hook ends with a question (forced questions read as engagement bait)",
    );
  const opener = FORMULAIC_OPENERS.find((o) => normalize(hook).startsWith(o));
  if (opener)
    warn.push(
      `hook opens with formulaic opener "${opener}" (open with the value instead)`,
    );

  // Layer 6: cross-post repetition (warn only).
  if (input.recentTexts && input.recentTexts.length > 0) {
    const mine = `${hook} ${body}`;
    let matches = 0;
    let example = "";
    for (const other of input.recentTexts) {
      if (!other || normalize(other) === normalize(mine)) continue;
      const phrase = sharedPhrase(mine, other);
      if (phrase) {
        matches += 1;
        if (!example) example = phrase;
      }
    }
    if (matches > 0) {
      warn.push(
        `repeated phrase across ${matches} recent post(s), e.g. "${example}"`,
      );
    }
  }

  // Layer 7: awareness fit (warn only, never fail).
  const coldPlatforms = new Set(["pinterest", "reddit", "tiktok"]);
  const hardOffer = /(buy now|book a call|limited time|act now|guaranteed)/i;
  if (
    coldPlatforms.has(input.platform as string) &&
    hardOffer.test(`${hook} ${body} ${cta}`)
  ) {
    warn.push(
      "awareness-mismatch: cold platform with hard-offer copy (educate first, offer later)",
    );
  }

  return {
    verdict: fail.length > 0 ? "fail" : warn.length > 0 ? "warn" : "pass",
    reasons: [
      ...fail.map((r) => `FAIL: ${r}`),
      ...warn.map((r) => `warn: ${r}`),
    ],
    engineUsed,
    words: { hook: hookWords, body: bodyWords, total: totalWords },
  };
}
