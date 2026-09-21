/**
 * Layered text scanner.
 *  L1 deterministic lexical signals (contextualized, not banned)
 *  L2 rhetorical pattern matching
 *  L3 structural/style analysis
 *  L4 semantic heuristics (evidence, authority, repetition)
 *  L5 optional LLM critique hook (semantic judgment only)
 *  L6 final quality gate lives in quality-gate.ts
 */

import type { Finding, ScanOptions, Severity, VoiceProfile } from "../types.js";
import { protect } from "./protected.js";
import {
  CHATBOT_ARTIFACTS,
  CONTENT_RULES,
  LEXICAL_SIGNALS,
  RHETORICAL_PATTERNS,
  STYLE_RULES,
} from "../rules/text.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "…" : "");
}

/**
 * Tolerant habit matcher: flexible spaces/hyphens ("game-changer" also
 * matches "game changer") and straight/curly apostrophes. Single words get
 * letter-boundary lookarounds so "tap" never matches "tape" and "craft"
 * never matches "craftsmanship".
 */
function habitPattern(habit: string): RegExp {
  const words = habit
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]"));
  const body = words.join("[\\s-]+");
  const pat = words.length === 1 ? `(?<![A-Za-z])${body}(?![A-Za-z])` : body;
  return new RegExp(pat, "i");
}

function isAllowed(term: string, opts: ScanOptions): boolean {  const t = term.toLowerCase();
  const allow = [...(opts.projectProfile?.allowlist ?? [])];
  if (opts.voiceProfile?.vocabulary) allow.push(...opts.voiceProfile.vocabulary);
  if (opts.voiceProfile?.brandTerms) allow.push(...opts.voiceProfile.brandTerms);
  if (opts.projectProfile?.protectedTerms) allow.push(...opts.projectProfile.protectedTerms);
  if (opts.protectedTerms) allow.push(...opts.protectedTerms);
  return allow.some((a) => a.toLowerCase() === t);
}

/** L1: contextual lexical scan. Single use in a long doc stays low severity. */
function scanLexical(text: string, opts: ScanOptions, clusterBoost: Map<string, number>): Finding[] {
  const out: Finding[] = [];
  const words = text.split(/\s+/).length;
  for (const sig of LEXICAL_SIGNALS) {
    if (isAllowed(sig.term, opts)) continue;
    const esc = sig.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${esc}\\b`, "gi");
    const hits: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) hits.push(m.index);
    if (hits.length === 0) continue;

    // Context: literal-terrain use of "landscape" etc. downgraded when
    // surrounded by concrete nouns rather than abstract marketing nouns.
    let confidence = 0.45 + Math.min(0.3, hits.length * 0.1) + (sig.baseWeight - 1) * 0.05;
    if (hits.length === 1 && words > 400) confidence -= 0.2; // single use, long doc
    if (opts.voiceProfile?.formality !== undefined && opts.voiceProfile.formality > 0.7) confidence -= 0.1;
    const cluster = clusterBoost.get(sig.term) ?? 0;
    confidence = Math.min(0.95, Math.max(0.15, confidence + cluster));

    let severity: Severity = "low";
    if (confidence >= 0.75 || sig.baseWeight >= 4) severity = "high";
    else if (confidence >= 0.5 || sig.baseWeight >= 2) severity = "medium";

    out.push({
      id: nid("lex"),
      category: "lexical",
      severity,
      location: excerpt(text, hits[0]),
      pattern: `lexical-signal:${sig.term}`,
      explanation: `"${sig.term}" — ${sig.note}. Signal #${hits.length} in ~${words} words; context decides.`,
      suggested_action:
        hits.length > 2
          ? `Used ${hits.length}× — replace most occurrences with concrete language.`
          : "Fine if it is the exact word; otherwise swap for something concrete.",
      confidence: Math.round(confidence * 100) / 100,
      layer: 1,
      offset: hits[0],
    });
  }
  return out;
}

/** L2: rhetorical frames. */
function scanRhetorical(text: string, opts: ScanOptions): Finding[] {
  const out: Finding[] = [];
  for (const p of RHETORICAL_PATTERNS) {
    if (opts.projectProfile?.allowlist?.includes(p.name)) continue;
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text)) !== null) {
      out.push({
        id: nid("rhe"),
        category: "rhetorical",
        severity: p.severity,
        location: excerpt(text, m.index),
        pattern: p.name,
        explanation: p.explanation,
        suggested_action: p.action,
        confidence: p.confidence,
        layer: 2,
        offset: m.index,
      });
      if (out.length > 40) return out;
    }
  }
  return out;
}

/** Chatbot artifacts — always high confidence, safe to auto-fix. */
function scanChatbot(text: string): Finding[] {
  const out: Finding[] = [];
  for (const a of CHATBOT_ARTIFACTS) {
    a.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = a.re.exec(text)) !== null) {
      out.push({
        id: nid("bot"),
        category: "chatbot",
        severity: "high",
        location: excerpt(text, m.index),
        pattern: `chatbot:${a.name}`,
        explanation: `Chatbot artifact ("${m[0].trim().slice(0, 40)}…") — assistant scaffolding leaked into shipped copy.`,
        suggested_action: a.action,
        confidence: 0.9,
        layer: 2,
        offset: m.index,
      });
    }
  }
  return out;
}

export interface TextScanResult {
  findings: Finding[];
  /** text with protected spans masked (what was actually analyzed) */
  analyzedText: string;
  restore: (s: string) => string;
  stats: { words: number; sentences: number; lexicalHits: number };
}

/** Run layers 1–4 deterministically. Layer 5 (LLM) applied by orchestrator. */
export function scanText(input: string, opts: ScanOptions = {}): TextScanResult {
  const allProtected = [...(opts.protectedTerms ?? []), ...(opts.projectProfile?.protectedTerms ?? [])];
  const doc = protect(input, allProtected);
  const text = doc.text;
  const restore = (s: string) => {
    let out = s;
    for (const [k, v] of doc.vault) out = out.split(k).join(v);
    return out;
  };

  // Cluster map: lexical signals co-occurring with rhetorical frames boost each other.
  const clusterBoost = new Map<string, number>();
  const rhetoricalHits = scanRhetorical(text, opts);
  if (rhetoricalHits.length >= 2) {
    for (const sig of LEXICAL_SIGNALS) clusterBoost.set(sig.term, 0.1);
  }

  const lexical = scanLexical(text, opts, clusterBoost);
  const chatbot = scanChatbot(text);
  const style = STYLE_RULES.flatMap((r) => {
    try {
      return r.check(text);
    } catch {
      return [];
    }
  });
  const content = CONTENT_RULES.flatMap((r) => {
    try {
      return r.check(text);
    } catch {
      return [];
    }
  });

  // Voice drift: flag habits the profile explicitly bans.
  const voice: Finding[] = [];
  const banned = opts.voiceProfile?.bannedStylisticHabits ?? [];
  const alternatives = opts.voiceProfile?.habitAlternatives ?? {};
  for (const habit of banned) {
    const m = habitPattern(habit).exec(text);
    if (m) {
      const alt = alternatives[habit.toLowerCase()] ?? alternatives[habit];
      voice.push({
        id: nid("voice"),
        category: "voice",
        severity: "medium",
        location: excerpt(text, m.index ?? 0),
        pattern: `voice-drift:${habit}`,
        explanation: `Violates the voice profile's banned habit: "${habit}".`,
        suggested_action: alt
          ? `Rewrite to match the voice profile — try "${alt}" instead of decorating the idea.`
          : "Rewrite to match the voice profile.",
        confidence: 0.8,
        layer: 4,
      });
    }
  }

  const findings = [...chatbot, ...lexical, ...rhetoricalHits, ...style, ...content, ...voice].sort(
    (a, b) => b.confidence - a.confidence,
  );
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    findings,
    analyzedText: text,
    restore,
    stats: {
      words,
      sentences: text.split(/(?<=[.!?])\s+/).length,
      lexicalHits: lexical.length,
    },
  };
}
