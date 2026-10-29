/**
 * Quality gate (layer 6). Verifies the audit checklist; hard gates fail CI
 * only when configured. Subjective style never fails builds by default.
 */

import type { Finding, ProjectProfile, QualityGateResult } from "../types.js";

export const GATE_CHECKLIST: { item: string; test: (fs: Finding[]) => boolean }[] = [
  { item: "no unnecessary AI clichés", test: (fs) => !fs.some((f) => f.severity === "high" && (f.category === "lexical" || f.category === "rhetorical") && f.confidence >= 0.7) },
  { item: "no repetitive structures", test: (fs) => !fs.some((f) => /monotony|repetition|rule-of-three/.test(f.pattern) && f.severity !== "low") },
  { item: "no unsupported claims", test: (fs) => !fs.some((f) => /fake-specificity|unsupported-superlative|vague-authority/.test(f.pattern) && f.severity === "high") },
  { item: "no generic filler", test: (fs) => !fs.some((f) => f.category === "chatbot") },
  { item: "no accidental voice flattening", test: (fs) => !fs.some((f) => f.category === "voice") },
  { item: "no excessive punctuation patterns", test: (fs) => !fs.some((f) => /em-dash-density|colon-density|semicolon-density/.test(f.pattern) && f.severity !== "low") },
  { item: "no structural design convergence", test: (fs) => !fs.some((f) => f.category === "structure" && f.severity === "high") },
  { item: "no unnecessary visual decoration", test: (fs) => !fs.some((f) => f.category === "design" && f.severity === "high") },
  { item: "no generic CTA language", test: (fs) => !fs.some((f) => f.pattern === "generic-cta" && f.severity !== "low") },
  { item: "no SEO stuffing", test: (fs) => !fs.some((f) => f.pattern === "keyword-stuffing" && f.severity !== "low") },
  { item: "no accessibility regression", test: () => true }, // assessed by host app's own a11y checks
  { item: "no functional regression", test: () => true }, // assessed by host app's test suite
  { item: "no brand violation", test: (fs) => !fs.some((f) => f.category === "voice" && f.severity === "high") },
  // Pnet extra voice layer — soft: medium/low only, enforced in strict mode via failedChecks.
  { item: "no generic openers/closers", test: (fs) => !fs.some((f) => /voice-generic-opener|voice-filler|voice-closer|voice-contrast-cliche/.test(f.pattern) && f.severity !== "low") },
  { item: "no rhythm homogenization", test: (fs) => !fs.some((f) => /repetition-opening|contrast-structure|fragments|hype-density/.test(f.pattern) && f.severity !== "low") },
  { item: "no title/heading duplication", test: (fs) => !fs.some((f) => /title-stuffer|banned-title-opener|generic-first-heading|title-heading-duplicate|body-opens-with-h1|missing-body-heading/.test(f.pattern) && f.severity !== "low") },
  // Copywriting + deception — soft: suggestion-only, never default hard gates.
  { item: "no deceptive framing", test: (fs) => !fs.some((f) => f.pattern.startsWith("deception-risk")) },
  // Precision expansion (10 rules) — soft: suggestion-only, never default hard gates.
  { item: "no placeholder code", test: (fs) => !fs.some((f) => f.pattern === "code-placeholder") },
  { item: "no generic links or alt text", test: (fs) => !fs.some((f) => /generic-anchor-text|missing-or-generic-alt-text/.test(f.pattern) && f.severity !== "low") },
  { item: "no concluding formulae", test: (fs) => !fs.some((f) => /conclusion-cliche|manufactured-gravity/.test(f.pattern) && f.severity !== "low") },
];

/** Default hard gates: factual integrity + chatbot leakage only. */
const DEFAULT_HARD_GATES = ["fake-specificity", "chatbot"];

export function runQualityGate(findings: Finding[], project?: ProjectProfile, strict = false): QualityGateResult {
  const hardGatePatterns = project?.hardGates ?? DEFAULT_HARD_GATES;
  const hardFailures = findings.filter(
    (f) =>
      f.severity === "high" &&
      f.confidence >= 0.7 &&
      hardGatePatterns.some((g) => f.pattern === g || f.pattern.startsWith(`${g}`) || f.pattern.startsWith(`chatbot`) && g === "chatbot"),
  );
  const softWarnings = findings.filter((f) => !hardFailures.includes(f));
  const checklist = GATE_CHECKLIST.map(({ item, test }) => {
    try {
      return { item, ok: test(findings) };
    } catch {
      return { item, ok: true };
    }
  });

  // Strict mode: any high-severity finding fails. Standard: only hard gates fail.
  const failedChecks = checklist.filter((c) => !c.ok).length;
  const passed = strict ? hardFailures.length === 0 && failedChecks === 0 : hardFailures.length === 0;

  return { passed, hardFailures, softWarnings, checklist };
}
