/**
 * Anti-slop orchestrator: DETECT → EXPLAIN → MINIMUM EFFECTIVE EDIT → RECHECK.
 * Max 2–3 automatic revision passes. LLM only via injected hook (layer 5).
 */

import type { AuditReport, Finding, ScanOptions } from "../types.js";
import { scanText } from "./scanner.js";
import { scoreText } from "./quality-model.js";
import { rewriteMinimal } from "./rewrite.js";
import { runQualityGate } from "./quality-gate.js";
import { analyzeSeo } from "../rules/seo.js";
import { analyzeDesign } from "../rules/design.js";
import { analyzeImagePrompt } from "../rules/image-prompt.js";
import { analyzeCode } from "../rules/code.js";
import { loadTasteMemory, applyTasteMemory } from "./taste-memory.js";

function partition(findings: Finding[]) {
  const pick = (...pats: string[]) =>
    findings.filter((f) => pats.some((p) => f.pattern.includes(p) || f.category === p));
  return {
    textIssues: pick("lexical", "rhetorical", "style", "content", "chatbot"),
    designIssues: findings.filter((f) => f.category === "design" || f.category === "code"),
    structuralIssues: findings.filter((f) => f.category === "structure"),
    seoIssues: findings.filter((f) => f.category === "seo"),
    voiceIssues: findings.filter((f) => f.category === "voice"),
  };
}

function summarize(findings: Finding[], gate: { passed: boolean }): string {
  const high = findings.filter((f) => f.severity === "high").length;
  const med = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;
  return `${findings.length} findings (${high} high, ${med} medium, ${low} low). Gate ${gate.passed ? "PASSED" : "FAILED"}.`;
}

export async function audit(input: string, opts: ScanOptions = {}): Promise<AuditReport> {
  const strict = opts.strictness === "strict";
  const maxPasses = opts.projectProfile?.maxAutoPasses ?? 2;

  // Taste memory: attenuate approved patterns, boost rejected ones.
  const memory = loadTasteMemory(opts.tasteMemoryPath);
  const adjust = (fs: Finding[]) => applyTasteMemory(fs, memory);

  let current = input;
  let allChanges: string[] = [];
  let pass = 0;
  let findings: Finding[] = [];
  let restore: (s: string) => string = (s) => s;

  // Content-type-specific analyzers run on the ORIGINAL (unprotected) input.
  const extra: Finding[] = [];
  const ct = opts.contentType ?? "prose";
  if (ct === "prose" || ct === "markdown" || ct === "seo") extra.push(...analyzeSeo(input));
  if (ct === "design") extra.push(...analyzeDesign({ source: input }));
  if (ct === "code") extra.push(...analyzeCode(input));
  if (ct === "image-prompt") extra.push(...analyzeImagePrompt(input));

  // Iterative text passes (prose-like types only).
  const isTextual = ct === "prose" || ct === "markdown" || ct === "seo";
  if (isTextual) {
    for (pass = 0; pass <= maxPasses; pass++) {
      const res = scanText(current, opts);
      restore = res.restore;
      let fs = adjust([...res.findings, ...extra]);

      // Layer 5: optional LLM critique (semantic judgment only).
      if (opts.llmCritique) {
        try {
          const llmFindings = await opts.llmCritique(current, fs);
          fs = [...fs, ...llmFindings.map((f) => ({ ...f, layer: 5 }))];
        } catch {
          /* LLM offline — deterministic layers stand alone */
        }
      }
      findings = fs;

      const quality = scoreText(current, findings);
      if (opts.mode === "scan" || pass === maxPasses || !quality.needsAnotherPass) break;

      // Rewrite pass (audit/rewrite/guard modes).
      if (opts.mode === "rewrite" || opts.mode === "audit" || opts.mode === "guard") {
        const threshold = opts.projectProfile?.autoFixThreshold ?? 0.85;
        const rw = rewriteMinimal(res.analyzedText, findings, threshold);
        if (rw.changesMade.length === 0) break; // nothing safe to change → stop (anti-loop)
        allChanges.push(...rw.changesMade);
        current = restore(rw.text);
      } else break;
    }
  } else {
    findings = adjust(extra);
  }

  const finalText = isTextual ? current : input;
  const finalFindings = isTextual
    ? adjust([...scanText(finalText, opts).findings, ...extra])
    : findings;

  const gate = runQualityGate(finalFindings, opts.projectProfile, strict);
  const quality = isTextual ? scoreText(finalText, finalFindings) : undefined;
  const parts = partition(finalFindings);

  const recommendedChanges = [...new Set(finalFindings.map((f) => f.suggested_action))].slice(0, 12);
  const remainingRisks = finalFindings
    .filter((f) => f.severity === "high" || (strict && f.severity === "medium"))
    .map((f) => `[${f.severity}] ${f.pattern}: ${f.explanation}`)
    .slice(0, 12);

  return {
    summary: summarize(finalFindings, gate),
    findings: finalFindings,
    ...parts,
    recommendedChanges,
    changesMade: allChanges,
    remainingRisks,
    qualityGate: gate,
    quality,
    rewritten: finalText !== input ? finalText : undefined,
  };
}

/** SCAN mode: detect + explain only, never rewrite. */
export async function scan(input: string, opts: ScanOptions = {}): Promise<AuditReport> {
  return audit(input, { ...opts, mode: "scan" });
}

/** GUARD mode: audit + enforce hard gates (for pipelines/CI). */
export async function guard(input: string, opts: ScanOptions = {}): Promise<AuditReport> {
  const report = await audit(input, { ...opts, mode: "guard" });
  if (!report.qualityGate.passed) {
    const msgs = report.qualityGate.hardFailures.map((f) => `${f.pattern}: ${f.location}`).join("\n");
    throw new Error(`Anti-slop guard blocked content:\n${msgs}`);
  }
  return report;
}
