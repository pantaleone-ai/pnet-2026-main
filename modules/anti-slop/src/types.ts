/**
 * @forwardos/anti-slop — shared types.
 *
 * Design rule: findings are contextual signals, never absolute bans.
 * Every finding carries a confidence so the orchestrator can decide
 * between auto-edit (minimum effective edit) and suggestion-only.
 */

export type Severity = "low" | "medium" | "high";
export type Category =
  | "lexical"
  | "rhetorical"
  | "style"
  | "content"
  | "chatbot"
  | "seo"
  | "design"
  | "structure"
  | "image-prompt"
  | "code"
  | "voice";

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  /** short excerpt showing the location */
  location: string;
  /** machine-readable pattern name, e.g. "generic-contrast" */
  pattern: string;
  explanation: string;
  suggested_action: string;
  /** 0..1 — auto-edit only when >= autoFixThreshold */
  confidence: number;
  /** which detection layer produced this (1-6) */
  layer: number;
  /** character offset in the (unprotected) source, when known */
  offset?: number;
}

export interface QualityDimensions {
  specificity: number;
  clarity: number;
  naturalness: number;
  rhythm: number;
  originality: number;
  evidence: number;
  voice: number;
  redundancy: number; // higher = less redundant (better)
  promotional_density: number; // higher = less promotional (better)
  ai_pattern_density: number; // higher = fewer AI patterns (better)
}

/** Internal-only score. Never presented as fake-precision marketing. */
export interface QualityScore {
  dimensions: QualityDimensions;
  /** rough 0..100 aggregate for gate decisions only */
  aggregate: number;
  needsAnotherPass: boolean;
}

export interface VoiceProfile {
  name: string;
  sentenceLengthPreference?: "short" | "mixed" | "long";
  vocabulary?: string[];
  formality?: number; // 0 (casual) .. 1 (formal)
  directness?: number;
  humor?: number;
  technicalDensity?: number;
  emotionalIntensity?: number;
  pointOfView?: "first" | "second" | "third" | "mixed";
  preferredPunctuation?: string[];
  bannedStylisticHabits?: string[];
  /** concrete replacements keyed by banned habit, e.g. { leverage: "use" } */
  habitAlternatives?: Record<string, string>;
  brandTerms?: string[];
  audience?: string;
  approvedExamples?: string[];
  /**
   * Pnet extra voice layer (ported from config/voice/anti-patterns.json).
   * May live inline here OR in that file — loader merges both.
   * All soft signals: suggestions only, never hard gates by default.
   */
  genericOpeners?: string[];
  fillerTransitions?: string[];
  contrastCliches?: string[];
  rhetoricalClosers?: string[];
  marketingHype?: string[];
  hedgeSuperlatives?: string[];
  /** per-article-type voice guidance (EDITORIAL V2), informational only */
  articleVoices?: Record<string, string>;
  restraintRule?: string;
  boundaries?: string[];
}

/** Pnet anti-patterns file shape (config/voice/anti-patterns.json). */
export interface VoiceExtras {
  note?: string;
  marketing_hype?: string[];
  generic_openers?: string[];
  filler_transitions?: string[];
  contrast_cliches?: string[];
  rhetorical_closers?: string[];
  hedge_superlatives?: string[];
}

export interface TitleRules {
  stuffers?: string[];
  openerBan?: string[];
  genericHeadings?: string[];
  /** title/heading word-overlap threshold (default 0.8) */
  maxSimilarity?: number;
}

export interface RhythmLimits {
  /** very short lines threshold (default 8) */
  maxShortParas?: number;
  /** punct uses per word (default 0.015) */
  maxPunctDensity?: number;
  /** not-X-but-Y structures (default 3) */
  maxContrast?: number;
  /** repeated 3-word opening (default 4) */
  maxRepeatOpening?: number;
  /** hype terms per word (default 0.01) */
  maxHypeDensity?: number;
}

export interface DesignProfile {
  name: string;
  visualDirection?: string;
  typography?: string[];
  palette?: string[];
  density?: "compact" | "balanced" | "airy";
  shapeLanguage?: string;
  imageTreatment?: string;
  illustrationStyle?: string;
  motionLanguage?: string;
  layoutPrinciples?: string[];
}

export interface ProjectProfile {
  name: string;
  strictness?: "lenient" | "standard" | "strict";
  /** patterns this project intentionally uses — never flag */
  allowlist?: string[];
  /** extra terms treated as protected (product names, trademarks…) */
  protectedTerms?: string[];
  /** hard gates that fail CI when violated */
  hardGates?: string[];
  maxAutoPasses?: number;
  autoFixThreshold?: number;
  /** Pnet editorial title rules (soft by default) */
  titleRules?: TitleRules;
  /** Pnet rhythm limits (soft by default) */
  rhythmLimits?: RhythmLimits;
  /** length budgets, e.g. { description: [12, 25] } — soft warnings only */
  budgets?: Record<string, [number, number]>;
}

export type ContentType = "prose" | "markdown" | "code" | "design" | "seo" | "image-prompt";

export interface ScanOptions {
  contentType?: ContentType;
  mode?: "scan" | "audit" | "rewrite" | "guard";
  voiceProfile?: VoiceProfile;
  designProfile?: DesignProfile;
  projectProfile?: ProjectProfile;
  protectedTerms?: string[];
  strictness?: "lenient" | "standard" | "strict";
  /** optional LLM critique hook (layer 5). Sync or async. */
  llmCritique?: (text: string, findings: Finding[]) => Promise<Finding[]> | Finding[];
  tasteMemoryPath?: string;
  /**
   * Pnet voice extras override. When omitted, loader reads
   * <projectRoot>/config/voice/anti-patterns.json (kept canonical)
   * and merges with voiceProfile inline arrays.
   */
  voiceExtras?: VoiceExtras;
}

export interface AuditReport {
  summary: string;
  findings: Finding[];
  textIssues: Finding[];
  designIssues: Finding[];
  structuralIssues: Finding[];
  seoIssues: Finding[];
  voiceIssues: Finding[];
  recommendedChanges: string[];
  changesMade: string[];
  remainingRisks: string[];
  qualityGate: QualityGateResult;
  quality?: QualityScore;
  rewritten?: string;
}

export interface QualityGateResult {
  passed: boolean;
  hardFailures: Finding[];
  softWarnings: Finding[];
  checklist: { item: string; ok: boolean }[];
}

export interface TasteFeedback {
  kind: "approve" | "reject" | "edit" | "mark-good" | "mark-slop";
  pattern: string;
  note?: string;
  at: string;
}
