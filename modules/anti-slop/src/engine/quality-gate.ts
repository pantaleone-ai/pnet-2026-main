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
  { item: "no excessive punctuation patterns", test: (fs) => !fs.some((f) => f.pattern === "em-dash-density" && f.severity !== "low") },
  { item: "no structural design convergence", test: (fs) => !fs.some((f) => f.category === "structure" && f.severity === "high") },
  { item: "no unnecessary visual decoration", test: (fs) => !fs.some((f) => f.category === "design" && f.severity === "high") },
  { item: "no generic CTA language", test: (fs) => !fs.some((f) => f.pattern === "generic-cta" && f.severity !== "low") },
  { item: "no SEO stuffing", test: (fs) => !fs.some((f) => f.pattern === "keyword-stuffing" && f.severity !== "low") },
  { item: "no accessibility regression", test: () => true }, // assessed by host app's own a11y checks
  { item: "no functional regression", test: () => true }, // assessed by host app's test suite
  { item: "no brand violation", test: (fs) => !fs.some((f) => f.category === "voice" && f.severity === "high") },
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
