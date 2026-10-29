/**
 * Copywriting-pack analyzer — Tier 1 core markers + Tier 3 long-tail lexicon.
 *
 * Data lives in config/copywriting/pack.json (CSVs ingested via
 * scripts/build-pack.mjs), never hardcoded here. Severity mapping (deliberate
 * downgrades from CSV severities, see COPYWRITING.md):
 *   Tier 1 markers -> medium 0.7 (phrase 0.8, formal register low 0.5)
 *   Tier 3 long-tail -> low, frequency-scaled 0.45–0.65, domain-filtered
 * Both are suggestion-only. Runs on protected analyzed text.
 */

import type { CopywritingMarker, CopywritingPack, CopywritingPackEntry, Finding, ScanOptions } from "../types.js";
import { LEXICAL_SIGNALS } from "./text.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e > text.length ? "…" : "");
}

/** Tech-writing defaults: generic + marketing + SaaS-adjacent buckets only. */
export const DEFAULT_TIER3_CATEGORIES = [
  "Generic AI slop",
  "Marketing and brand language",
  "Content and SEO clichés",
  "Business jargon",
  "Assistant-style and generic SaaS phrases",
  "Consulting and corporate strategy",
];

/** Dual-use technical verbs — suggestion-only, never medium. */
const DUAL_USE = new Set(
  ["optimize", "transform", "mitigate", "facilitate", "valuable", "boast", "boasts", "bolster", "garner", "compel", "safeguard", "safeguards", "poised", "endeavor", "endeavors", "endeavoring"],
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function wordIn(hay: string, needle: string): boolean {
  return new RegExp(`(?<![A-Za-z])${esc(needle)}(?![A-Za-z])`, "i").test(hay);
}

/** Terms the engine already flags — pack must not double-fire on them. */
function buildSkipSet(opts: ScanOptions): Set<string> {
  const skip = new Set<string>();
  for (const h of opts.voiceProfile?.bannedStylisticHabits ?? []) skip.add(h.toLowerCase());
  for (const s of LEXICAL_SIGNALS) skip.add(s.term.toLowerCase());
  for (const t of [...(opts.voiceProfile?.vocabulary ?? []), ...(opts.voiceProfile?.brandTerms ?? [])]) skip.add(t.toLowerCase());
  for (const t of [...(opts.projectProfile?.allowlist ?? []), ...(opts.projectProfile?.protectedTerms ?? []), ...(opts.protectedTerms ?? [])]) skip.add(t.toLowerCase());
  return skip;
}

/** A pack term is covered if any skip term occurs as a whole word inside it. */
function isCovered(term: string, skip: Set<string>): boolean {
  const words = term.toLowerCase().split(/[\s-]+/).filter(Boolean);
  return words.some((w) => skip.has(w));
}

interface Compiled {
  re: RegExp;
  meta: Map<string, { why: string; repair: string; extra: Record<string, unknown> }>;
}

const cache = new WeakMap<object, Compiled>();

function compile(terms: { term: string; why: string; repair: string; extra?: Record<string, unknown> }[]): Compiled | undefined {
  const uniq = new Map<string, { why: string; repair: string; extra: Record<string, unknown> }>();
  for (const t of terms) {
    const k = t.term.toLowerCase();
    if (!uniq.has(k)) uniq.set(k, { why: t.why, repair: t.repair, extra: t.extra ?? {} });
  }
  if (uniq.size === 0) return undefined;
  const sorted = [...uniq.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![A-Za-z])(${sorted.map(esc).join("|")})(?![A-Za-z])`, "gi");
  return { re, meta: uniq };
}

function compileCached(pack: object, terms: { term: string; why: string; repair: string; extra?: Record<string, unknown> }[]): Compiled | undefined {
  const hit = cache.get(pack);
  if (hit) return hit;
  const c = compile(terms);
  if (c) cache.set(pack, c);
  return c;
}

export function analyzeCopywriting(text: string, opts: ScanOptions = {}): Finding[] {
  const out: Finding[] = [];
  const pack = opts.copywritingPack;
  if (!pack) return out;
  const allow = new Set((opts.projectProfile?.allowlist ?? []).map((a) => a.toLowerCase()));
  const skip = buildSkipSet(opts);

  // ---- Tier 1 core markers (always on unless allowlisted) ----
  const markers = allow.has("copywriting-marker")
    ? []
    : (pack.tier1Markers ?? []).filter((m) => m.term && !isCovered(m.term, skip));
  const compiled1 = markers.length > 0 ? compile(markers.map((m) => ({ term: m.term, why: m.why, repair: m.repair, extra: { register: m.register } }))) : undefined;
  const emitted = new Set<string>();
  if (compiled1) {
    compiled1.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = compiled1.re.exec(text)) !== null) {
      const key = m[0].toLowerCase();
      if (emitted.has(key)) continue;
      emitted.add(key);
      const meta = compiled1.meta.get(key);
      const formal = meta?.extra.register === "formal";
      const dual = DUAL_USE.has(key);
      const phrase = key.includes(" ") || key.includes("-");
      out.push({
        id: nid("cpw"),
        category: "lexical",
        severity: formal || dual ? "low" : "medium",
        location: excerpt(text, m.index),
        pattern: `copywriting-marker:${key.slice(0, 48)}`,
        explanation: meta?.why ? `${meta.why}` : `Core AI marker "${m[0].trim().slice(0, 50)}" — stock phrasing.`,
        suggested_action: meta?.repair ? `${meta.repair}` : "Swap for concrete language.",
        confidence: formal || dual ? 0.5 : phrase ? 0.8 : 0.7,
        layer: 1,
        offset: m.index,
      });
      if (out.length > 40) break;
    }
  }

  // ---- Tier 3 long-tail (domain-filtered, low, frequency-scaled) ----
  if (allow.has("copywriting-pack")) return out.sort((a, b) => b.confidence - a.confidence);
  const cats = new Set(opts.projectProfile?.copywritingCategories ?? DEFAULT_TIER3_CATEGORIES);
  const longtail = (pack.tier3 ?? []).filter(
    (e) => e.term && cats.has(e.category) && !isCovered(e.term, skip) && !emitted.has(e.term.toLowerCase()),
  );
  if (longtail.length > 0) {
    const compiled3 = compileCached(pack, longtail.map((e) => ({ term: e.term, why: e.why, repair: e.repair, extra: {} })));
    if (compiled3) {
      const words = Math.max(1, text.split(/\s+/).filter(Boolean).length);
      const hits = new Map<string, { count: number; first: number; phrase: boolean }>();
      compiled3.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = compiled3.re.exec(text)) !== null) {
        const key = m[0].toLowerCase();
        const h = hits.get(key) ?? { count: 0, first: m.index, phrase: /[\s-]/.test(key) };
        h.count++;
        hits.set(key, h);
      }
      // Single-word long-tail terms fire only on repetition: one "solution"
      // or "reliable" in a long doc is ordinary vocabulary, not a signal.
      // Multi-word phrases are specific enough to flag on first use.
      for (const [key, h] of [...hits.keys()].map((k) => [k, hits.get(k)!] as const)) {
        if (!h.phrase && h.count < 2) hits.delete(key);
      }
      for (const [key, h] of hits) {
        const meta = compiled3.meta.get(key);
        // Frequency-scaled confidence: isolated single use in a long doc stays a whisper.
        let conf = 0.45 + Math.min(0.2, h.count * 0.05);
        if (h.count === 1 && words > 400) conf -= 0.1;
        conf = Math.round(Math.min(0.65, Math.max(0.3, conf)) * 100) / 100;
        out.push({
          id: nid("cpw"),
          category: "lexical",
          severity: "low",
          location: excerpt(text, h.first),
          pattern: `copywriting-pack:${key.slice(0, 48)}`,
          explanation: meta?.why
            ? `${meta.why} (Signal #${h.count} in ~${words} words; context decides.)`
            : `Corporate-fluff signal "${key.slice(0, 50)}" (#${h.count} in ~${words} words).`,
          suggested_action: meta?.repair ? `${meta.repair}` : "Swap for concrete language.",
          confidence: conf,
          layer: 1,
          offset: h.first,
        });
        if (out.length > 70) break;
      }
    }
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}
