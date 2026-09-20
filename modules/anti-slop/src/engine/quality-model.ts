/**
 * Internal text-quality model.
 * Optimizes for specificity/clarity/rhythm/originality — NOT detector avoidance.
 * Scores guide the agent (another pass needed?) and are never shown as
 * fake-precision marketing numbers.
 */

import type { Finding, QualityScore } from "../types.js";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function scoreText(text: string, findings: Finding[]): QualityScore {
  const words = text.split(/\s+/).filter(Boolean);
  const n = Math.max(1, words.length);
  const by = (pred: (f: Finding) => boolean) => findings.filter(pred);

  const density = (fs: Finding[]) => fs.reduce((a, f) => a + f.confidence, 0) / n;

  const aiPatterns = by((f) => ["lexical", "rhetorical", "chatbot"].includes(f.category));
  const promo = by((f) => ["content"].includes(f.category) && /superlative|inflation|promotional/i.test(f.explanation + f.pattern));
  const evidenceFails = by((f) => /fake-specificity|vague-authority|unsupported-superlative/.test(f.pattern));
  const redundancy = by((f) => /idea-repetition|sentence-opening-repetition|sentence-length-monotony/.test(f.pattern));
  const rhythmFails = by((f) => /monotony|repetition|rule-of-three|em-dash/.test(f.pattern));

  // Specificity: penalize vague-authority + fake-specificity + lexical vagueness.
  const specificity = clamp01(1 - density(evidenceFails) * 30 - density(by((f) => f.category === "lexical")) * 8);
  const clarity = clamp01(1 - density(by((f) => f.category === "chatbot")) * 40 - density(by((f) => /hedge/.test(f.pattern))) * 12);
  const naturalness = clamp01(1 - density(aiPatterns) * 10);
  const rhythm = clamp01(1 - density(rhythmFails) * 25);
  const originality = clamp01(1 - density(by((f) => f.category === "rhetorical")) * 18);
  const evidence = clamp01(1 - density(evidenceFails) * 30);
  const redundancyScore = clamp01(1 - density(redundancy) * 25);
  const promotional = clamp01(1 - density(promo) * 25);
  const aiDensity = clamp01(1 - density(aiPatterns) * 10);
  // Voice defaults to neutral-good unless explicit drift was found.
  const voiceDrift = by((f) => f.category === "voice").length;
  const voice = clamp01(1 - voiceDrift * 0.2);

  const dimensions = {
    specificity, clarity, naturalness, rhythm, originality,
    evidence, voice, redundancy: redundancyScore,
    promotional_density: promotional, ai_pattern_density: aiDensity,
  };
  const vals = Object.values(dimensions);
  const aggregate = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  const hardFails = findings.filter((f) => f.severity === "high" && f.confidence >= 0.7).length;
  return {
    dimensions,
    aggregate,
    needsAnotherPass: aggregate < 72 || hardFails > 0,
  };
}
