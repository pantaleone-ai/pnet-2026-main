/**
 * Profile + config loader. Resolution order:
 *  1. explicit options passed programmatically
 *  2. ./config/anti-slop/*.json (project overrides)
 *  3. bundled defaults in this package's config/anti-slop/
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignProfile, ProjectProfile, VoiceExtras, VoiceProfile } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundledDir = resolve(here, "../config/anti-slop");

function readJson<T>(path: string): T | undefined {
  try {
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

/**
 * Pnet extra voice layer — canonical file stays at
 * <projectRoot>/config/voice/anti-patterns.json (never moved into
 * config/anti-slop/, so scripts/language-gate.py keeps working).
 * Returns {} when absent so the engine works standalone.
 */
export function loadVoiceExtras(projectRoot = process.cwd()): VoiceExtras {
  return (
    readJson<VoiceExtras>(join(resolve(projectRoot), "config/voice/anti-patterns.json")) ?? {}
  );
}

/** Merge inline voiceProfile arrays with the canonical anti-patterns file. File wins on conflicts. */
export function mergeVoiceExtras(voice: VoiceProfile, extras: VoiceExtras): VoiceProfile {
  if (!extras || Object.keys(extras).length === 0) return voice;
  const merge = (a?: string[], b?: string[]): string[] | undefined => {
    if (!a && !b) return undefined;
    return [...new Set([...(a ?? []), ...(b ?? [])])];
  };
  return {
    ...voice,
    genericOpeners: merge(voice.genericOpeners, extras.generic_openers),
    fillerTransitions: merge(voice.fillerTransitions, extras.filler_transitions),
    contrastCliches: merge(voice.contrastCliches, extras.contrast_cliches),
    rhetoricalClosers: merge(voice.rhetoricalClosers, extras.rhetorical_closers),
    marketingHype: merge(voice.marketingHype, extras.marketing_hype),
    hedgeSuperlatives: merge(voice.hedgeSuperlatives, extras.hedge_superlatives),
  };
}

export function loadVoiceProfile(projectRoot = process.cwd()): VoiceProfile {
  const base =
    readJson<VoiceProfile>(join(resolve(projectRoot), "config/anti-slop/voice.json")) ??
    readJson<VoiceProfile>(join(bundledDir, "voice.json")) ?? { name: "default" };
  return mergeVoiceExtras(base, loadVoiceExtras(projectRoot));
}

export function loadDesignProfile(projectRoot = process.cwd()): DesignProfile {
  return (
    readJson<DesignProfile>(join(resolve(projectRoot), "config/anti-slop/design.json")) ??
    readJson<DesignProfile>(join(bundledDir, "design.json")) ?? { name: "default" }
  );
}

const DEFAULT_TITLE_RULES: NonNullable<ProjectProfile["titleRules"]> = {
  stuffers: ["free ", "ultimate", "modern ", "official", "production-ready"],
  openerBan: ["the ultimate", "the complete", "a comprehensive", "the definitive", "everything you need to know"],
  genericHeadings: ["introduction", "overview", "summary", "conclusion", "background", "preface"],
  maxSimilarity: 0.8,
};

const DEFAULT_RHYTHM_LIMITS: NonNullable<ProjectProfile["rhythmLimits"]> = {
  maxShortParas: 8,
  maxPunctDensity: 0.015,
  maxContrast: 3,
  maxRepeatOpening: 4,
  maxHypeDensity: 0.01,
};

export function loadProjectProfile(projectRoot = process.cwd()): ProjectProfile {
  const base =
    readJson<ProjectProfile>(join(resolve(projectRoot), "config/anti-slop/rules.json")) ??
    readJson<ProjectProfile>(join(bundledDir, "rules.json")) ?? { name: "default" };
  return {
    ...base,
    titleRules: { ...DEFAULT_TITLE_RULES, ...(base.titleRules ?? {}) },
    rhythmLimits: { ...DEFAULT_RHYTHM_LIMITS, ...(base.rhythmLimits ?? {}) },
  };
}

export function loadProtectedTerms(projectRoot = process.cwd()): string[] {
  const local = readJson<{ terms?: string[] } | string[]>(join(resolve(projectRoot), "config/anti-slop/protected-terms.json"));
  const bundled = readJson<{ terms?: string[] } | string[]>(join(bundledDir, "protected-terms.json"));
  const norm = (v: { terms?: string[] } | string[] | undefined): string[] =>
    Array.isArray(v) ? v : (v?.terms ?? []);
  return [...norm(bundled), ...norm(local)];
}
