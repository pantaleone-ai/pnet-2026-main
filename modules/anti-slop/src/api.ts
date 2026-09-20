/**
 * @forwardos/anti-slop — programmatic API.
 * Callable from any site/app pipeline: content in → audit report out.
 */

import type { AuditReport, ContentType, ScanOptions } from "./types.js";
import { audit, guard, scan } from "./engine/orchestrator.js";
import { analyzeDesign } from "./rules/design.js";
import { analyzeImagePrompt } from "./rules/image-prompt.js";
import { analyzeSeo } from "./rules/seo.js";
import { analyzeCode } from "./rules/code.js";
import { runQualityGate } from "./engine/quality-gate.js";
import {
  loadDesignProfile,
  loadProjectProfile,
  loadProtectedTerms,
  loadVoiceProfile,
} from "./profiles.js";

export interface ApiRequest {
  content: string | string[];
  contentType?: ContentType;
  mode?: ScanOptions["mode"];
  voiceProfile?: ScanOptions["voiceProfile"];
  projectProfile?: ScanOptions["projectProfile"];
  designProfile?: ScanOptions["designProfile"];
  protectedTerms?: string[];
  strictness?: ScanOptions["strictness"];
}

function withDefaults(req: ApiRequest, projectRoot?: string): ScanOptions {
  return {
    contentType: req.contentType ?? "prose",
    mode: req.mode ?? "audit",
    voiceProfile: req.voiceProfile ?? loadVoiceProfile(projectRoot),
    designProfile: req.designProfile ?? loadDesignProfile(projectRoot),
    projectProfile: req.projectProfile ?? loadProjectProfile(projectRoot),
    protectedTerms: [...(req.protectedTerms ?? []), ...loadProtectedTerms(projectRoot)],
    strictness: req.strictness ?? req.projectProfile?.strictness ?? "standard",
  };
}

export async function handleScan(req: ApiRequest, projectRoot?: string): Promise<AuditReport> {
  const text = Array.isArray(req.content) ? req.content.join("\n\n") : req.content;
  return scan(text, withDefaults({ ...req, mode: "scan" }, projectRoot));
}

export async function handleAudit(req: ApiRequest, projectRoot?: string): Promise<AuditReport> {
  const text = Array.isArray(req.content) ? req.content.join("\n\n") : req.content;
  return audit(text, withDefaults({ ...req, mode: "audit" }, projectRoot));
}

export async function handleRewrite(req: ApiRequest, projectRoot?: string): Promise<AuditReport> {
  const text = Array.isArray(req.content) ? req.content.join("\n\n") : req.content;
  return audit(text, withDefaults({ ...req, mode: "rewrite" }, projectRoot));
}

export async function handleDesign(req: ApiRequest, projectRoot?: string): Promise<AuditReport> {
  const src = Array.isArray(req.content) ? req.content.join("\n") : req.content;
  const opts = withDefaults({ ...req, contentType: "design", mode: "scan" }, projectRoot);
  const findings = analyzeDesign({ source: src });
  return {
    summary: `${findings.length} design findings. Gate ${runQualityGate(findings, opts.projectProfile, opts.strictness === "strict").passed ? "PASSED" : "FAILED"}.`,
    findings,
    textIssues: [],
    designIssues: findings.filter((f) => f.category === "design" || f.category === "code"),
    structuralIssues: findings.filter((f) => f.category === "structure"),
    seoIssues: [],
    voiceIssues: [],
    recommendedChanges: [...new Set(findings.map((f) => f.suggested_action))],
    changesMade: [],
    remainingRisks: findings.filter((f) => f.severity === "high").map((f) => f.explanation),
    qualityGate: runQualityGate(findings, opts.projectProfile, opts.strictness === "strict"),
  };
}

export async function handleImagePrompt(req: ApiRequest): Promise<AuditReport> {
  const prompt = Array.isArray(req.content) ? req.content.join(" ") : req.content;
  const findings = analyzeImagePrompt(prompt);
  return {
    summary: `${findings.length} image-prompt findings.`,
    findings,
    textIssues: [],
    designIssues: [],
    structuralIssues: [],
    seoIssues: [],
    voiceIssues: [],
    recommendedChanges: [...new Set(findings.map((f) => f.suggested_action))],
    changesMade: [],
    remainingRisks: findings.filter((f) => f.severity === "high").map((f) => f.explanation),
    qualityGate: runQualityGate(findings, undefined, false),
  };
}

export async function handleSeo(req: ApiRequest): Promise<AuditReport> {
  const text = Array.isArray(req.content) ? req.content.join("\n\n") : req.content;
  const findings = analyzeSeo(text);
  return {
    summary: `${findings.length} SEO findings.`,
    findings,
    textIssues: [],
    designIssues: [],
    structuralIssues: [],
    seoIssues: findings,
    voiceIssues: [],
    recommendedChanges: [...new Set(findings.map((f) => f.suggested_action))],
    changesMade: [],
    remainingRisks: findings.filter((f) => f.severity === "high").map((f) => f.explanation),
    qualityGate: runQualityGate(findings, undefined, false),
  };
}

export async function handleCode(req: ApiRequest): Promise<AuditReport> {
  const src = Array.isArray(req.content) ? req.content.join("\n") : req.content;
  const findings = analyzeCode(src);
  return {
    summary: `${findings.length} code/UI findings.`,
    findings,
    textIssues: [],
    designIssues: findings,
    structuralIssues: [],
    seoIssues: [],
    voiceIssues: [],
    recommendedChanges: [...new Set(findings.map((f) => f.suggested_action))],
    changesMade: [],
    remainingRisks: findings.filter((f) => f.severity === "high").map((f) => f.explanation),
    qualityGate: runQualityGate(findings, undefined, false),
  };
}

export async function handleBatch(reqs: ApiRequest[], projectRoot?: string): Promise<AuditReport[]> {
  const out: AuditReport[] = [];
  for (const r of reqs) {
    const mode = r.mode ?? "audit";
    if (r.contentType === "design") out.push(await handleDesign({ ...r, mode }, projectRoot));
    else if (r.contentType === "image-prompt") out.push(await handleImagePrompt(r));
    else if (r.contentType === "seo") out.push(await handleSeo(r));
    else if (r.contentType === "code") out.push(await handleCode(r));
    else if (mode === "scan") out.push(await handleScan(r, projectRoot));
    else if (mode === "guard") out.push(await guard(Array.isArray(r.content) ? r.content.join("\n\n") : r.content, withDefaults(r, projectRoot)));
    else out.push(await handleAudit(r, projectRoot));
  }
  return out;
}

export { scan, audit, guard };
