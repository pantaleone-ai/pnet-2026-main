/**
 * Text anti-slop rules — contextual SIGNALS, not banned-word lists.
 *
 * Each lexical signal has a base weight that the scanner attenuates using:
 *  - occurrence count vs document length (single use in a long doc ≈ fine)
 *  - allowlist / protected terms / voice profile vocabulary
 *  - co-occurrence with other signals (clusters = higher confidence)
 *
 * Concepts adapted from community anti-slop research (Studio-Groei/anti-slop,
 * hap-team/deslop, Nutlope/hallmark pattern taxonomies) — reimplemented
 * natively, no copied code.
 */

import type { Finding, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "…" : "");
}

export interface LexicalSignal {
  term: string;
  baseWeight: number; // 1..5
  note: string;
}

/** Signals — legitimate in context, suspicious in clusters. */
export const LEXICAL_SIGNALS: LexicalSignal[] = [
  { term: "delve", baseWeight: 3, note: "overused AI verb; 'examine' or a concrete verb is usually better" },
  { term: "tapestry", baseWeight: 5, note: "near-certain AI metaphor" },
  { term: "landscape", baseWeight: 2, note: "vague-metaphor use ('the X landscape'); fine as literal terrain" },
  { term: "realm", baseWeight: 3, note: "inflated diction; 'area'/'field' usually suffices" },
  { term: "unlock", baseWeight: 2, note: "marketing-verb inflation" },
  { term: "unleash", baseWeight: 3, note: "marketing-verb inflation" },
  { term: "elevate", baseWeight: 2, note: "empty enthusiasm verb" },
  { term: "empower", baseWeight: 2, note: "generic benefit verb" },
  { term: "transformative", baseWeight: 3, note: "significance inflation" },
  { term: "game-chang", baseWeight: 3, note: "unsupported superlative" },
  { term: "groundbreaking", baseWeight: 3, note: "unsupported superlative" },
  { term: "robust", baseWeight: 1, note: "filler adjective; fine in technical specs, weak elsewhere" },
  { term: "seamless", baseWeight: 2, note: "unverifiable smoothness claim" },
  { term: "cutting-edge", baseWeight: 2, note: "dates quickly; prefer a concrete capability" },
  { term: "revolutionary", baseWeight: 3, note: "unsupported superlative" },
  { term: "next-generation", baseWeight: 2, note: "empty positioning" },
  { term: "comprehensive", baseWeight: 1, note: "weak when unaccompanied by scope detail" },
  { term: "holistic", baseWeight: 2, note: "vague completeness claim" },
  { term: "dynamic", baseWeight: 1, note: "filler adjective" },
  { term: "innovative", baseWeight: 2, note: "self-praise; show the novelty instead" },
  { term: "exciting", baseWeight: 2, note: "manufactured enthusiasm" },
  { term: "powerful", baseWeight: 1, note: "filler intensifier" },
  { term: "compelling", baseWeight: 1, note: "telling instead of showing" },
  { term: "tailored", baseWeight: 1, note: "generic personalization claim" },
  { term: "leverage", baseWeight: 2, note: "'use' is almost always clearer" },
  { term: "harness", baseWeight: 2, note: "'use' is almost always clearer" },
  { term: "journey", baseWeight: 2, note: "metaphorical filler ('your X journey')" },
  { term: "ecosystem", baseWeight: 2, note: "jargon inflation unless a real platform graph exists" },
  { term: "paradigm", baseWeight: 3, note: "inflated framing" },
  { term: "pivotal", baseWeight: 2, note: "significance inflation" },
  { term: "vibrant", baseWeight: 2, note: "generic liveliness adjective" },
  { term: "thoughtfully", baseWeight: 1, note: "self-congratulation adverb" },
  { term: "meticulously", baseWeight: 2, note: "unverifiable care claim" },
  { term: "foster", baseWeight: 1, note: "vague facilitation verb" },
];

export interface RhetoricalPattern {
  name: string;
  re: RegExp;
  severity: Severity;
  confidence: number;
  explanation: string;
  action: string;
}

export const RHETORICAL_PATTERNS: RhetoricalPattern[] = [
  {
    name: "generic-contrast",
    re: /\bnot just ([^,.!?;]{2,60}),?\s+but ([^,.!?;]{2,60})/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'Not just X, but Y' contrast frame — a top AI-generation tell.",
    action: "State the concrete distinction directly without the contrast frame.",
  },
  {
    name: "whether-you-are",
    re: /\bwhether you(?:'re| are) [^,.!?;]{2,80} or [^,.!?;]{2,80}/gi,
    severity: "medium",
    confidence: 0.75,
    explanation: "Generic dual-audience address ('whether you're X or Y').",
    action: "Address the actual reader, or drop the address line.",
  },
  {
    name: "from-x-to-y",
    re: /\bfrom [a-z][^,.!?;]{1,40} to [a-z][^,.!?;]{1,40}\b/gi,
    severity: "low",
    confidence: 0.35,
    explanation: "'From X to Y' range construction — common AI scaffolding; often fine.",
    action: "Keep only if the range carries real information.",
  },
  {
    name: "rapidly-changing-opener",
    re: /\bin today'?s (rapidly changing|fast-paced|ever-evolving)[^.\n]{0,80}/gi,
    severity: "high",
    confidence: 0.9,
    explanation: "Generic temporal opener with zero information content.",
    action: "Delete the opener; start with the point.",
  },
  {
    name: "more-than",
    re: /\bit'?s more than ([^,.!?;]{2,60})/gi,
    severity: "medium",
    confidence: 0.65,
    explanation: "'It's more than…' profundity frame.",
    action: "Say what it is, concretely.",
  },
  {
    name: "isnt-just",
    re: /\bthis (isn'?t|is not) just ([^,.!?;]{2,60})/gi,
    severity: "medium",
    confidence: 0.65,
    explanation: "'This isn't just…' profundity frame.",
    action: "Say what it is, concretely.",
  },
  {
    name: "future-of",
    re: /\bthe future of [a-z][^,.!?;]{1,60}/gi,
    severity: "low",
    confidence: 0.4,
    explanation: "'The future of X' grandiosity — fine if the piece earns it.",
    action: "Keep only with evidence; otherwise specify what changes.",
  },
  {
    name: "intersection-of",
    re: /\bat the intersection of [^.\n]{2,100}/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'At the intersection of…' prestige frame.",
    action: "Name the concrete combination instead.",
  },
  {
    name: "new-era",
    re: /\ba new era of [^.\n]{2,80}/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'A new era of…' epoch framing without evidence.",
    action: "Specify what changed and when.",
  },
  {
    name: "heres-the-thing",
    re: /\bhere'?s the thing\b/gi,
    severity: "low",
    confidence: 0.55,
    explanation: "Conversational throat-clearing.",
    action: "Delete; say the thing.",
  },
  {
    name: "why-it-matters",
    re: /^#{1,4}\s*why it matters\s*$/gim,
    severity: "low",
    confidence: 0.5,
    explanation: "Generic 'Why it matters' section — often filler around an absent insight.",
    action: "Fold the significance into the claim itself, or cut.",
  },
  {
    name: "grand-enabler",
    re: /\bplays? a (crucial|pivotal|vital|key|central|critical) role in\b[^.\n]{0,80}/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'Plays a crucial role in…' — the grand enabler: importance asserted, never shown.",
    action: "Describe what it actually does; let the reader judge the importance.",
  },
  {
    name: "navigating-abstract",
    re: /\bnavigating the (intricacies|complexities|nuances|landscape)\b[^.\n]{0,60}/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'Navigating the intricacies of…' — vague abstract that names no actual difficulty.",
    action: "Name the concrete difficulty being navigated.",
  },
  {
    name: "myriad-plethora",
    re: /\ba (myriad|plethora) of\b/gi,
    severity: "medium",
    confidence: 0.65,
    explanation: "'A myriad/plethora of…' — scope inflation instead of a count or an example.",
    action: "Give the number, or name three real ones.",
  },
  {
    name: "kicker-family",
    re: /\bhere'?s (where it gets interesting|what most people miss|the starting point|the deal|the kicker)\b/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "False-suspense transition manufacturing drama before an unremarkable point.",
    action: "Delete the buildup; state the observation.",
  },
  {
    name: "imagine-world",
    re: /\bimagine (a world|a future) (where|in which)\b[^.\n]{0,100}/gi,
    severity: "medium",
    confidence: 0.7,
    explanation: "'Imagine a world where…' — futurist invitation selling agreement instead of arguing it.",
    action: "Argue the claim directly with evidence.",
  },
  {
    name: "patronizing-analogy",
    re: /\bthink of it (as|like)\b[^.\n]{0,80}/gi,
    severity: "medium",
    confidence: 0.65,
    explanation: "'Think of it as…' — patronizing analogy that assumes the reader needs a metaphor.",
    action: "Explain the thing itself; add an analogy only if the concept stays unclear.",
  },
  {
    name: "truth-is-simple",
    re: /\b(the truth|the reality) is (simple|clear|obvious|unambiguous|straightforward)\b/gi,
    severity: "low",
    confidence: 0.55,
    explanation: "Asserting obviousness instead of proving the point.",
    action: "Prove it; cut the assertion of clarity.",
  },
];

export const CHATBOT_ARTIFACTS: { name: string; re: RegExp; action: string }[] = [
  { name: "certainly", re: /^\s*(certainly|absolutely|of course)[!.]\s*/gim, action: "Delete the pleasantry; start with the answer." },
  { name: "lets-dive", re: /\blet'?s (dive in|explore|take a look|break (it|this) down)[,.]?\s*/gi, action: "Delete; begin the content." },
  { name: "breakdown", re: /\bhere'?s a breakdown\b/gi, action: "Delete; present the content." },
  { name: "in-conclusion-signoff", re: /\bin conclusion[,.]?\s*/gi, action: "Delete; the reader knows it is the end." },
  { name: "hope-this-helps", re: /\bi hope this helps[!.]?\s*/gi, action: "Delete the signoff." },
  { name: "self-reference", re: /\bas an ai\b[^.\n]{0,120}/gi, action: "Delete assistant self-reference." },
  { name: "disclaimer-filler", re: /\bit'?s (important|worth noting) to note that\s*/gi, action: "Delete; just say it." },
  { name: "worth-noting", re: /\bit'?s worth noting that\s*/gi, action: "Delete; just say it." },
  { name: "bears-mentioning", re: /\bit bears? mentioning\s*/gi, action: "Delete; just say it." },
];

export interface StyleRule {
  name: string;
  check: (text: string) => Finding[];
}

const styleFinding = (
  name: string,
  severity: Severity,
  confidence: number,
  location: string,
  explanation: string,
  action: string,
): Finding => ({
  id: nid("style"),
  category: "style",
  severity,
  location,
  pattern: name,
  explanation,
  suggested_action: action,
  confidence,
  layer: 3,
});

function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9“"(\[])/).filter((s) => s.trim().length > 0);
}

export const STYLE_RULES: StyleRule[] = [
  {
    name: "em-dash-density",
    check: (text) => {
      const count = (text.match(/—/g) || []).length;
      const words = text.split(/\s+/).length;
      const per1k = words ? (count / words) * 1000 : 0;
      if (per1k > 6 && count >= 3) {
        return [
          styleFinding(
            "em-dash-density", "medium", 0.65,
            `${count} em dashes in ~${words} words`,
            "Em-dash density far above natural prose; a known AI-rhythm tell.",
            "Keep at most 1–2; convert the rest to periods, commas, or colons.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "sentence-length-monotony",
    check: (text) => {
      const ss = sentences(text);
      if (ss.length < 6) return [];
      const lens = ss.map((s) => s.split(/\s+/).length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
      const sd = Math.sqrt(variance);
      if (sd < 4 && mean > 8) {
        return [
          styleFinding(
            "sentence-length-monotony", "medium", 0.6,
            `${ss.length} sentences, mean ${mean.toFixed(1)} words, sd ${sd.toFixed(1)}`,
            "Sentence lengths are unnaturally uniform — metronomic AI rhythm.",
            "Vary deliberately: a short sentence after a long one.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "sentence-opening-repetition",
    check: (text) => {
      const ss = sentences(text);
      if (ss.length < 5) return [];
      const opens = ss.map((s) => s.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase());
      const counts = new Map<string, number>();
      for (const o of opens) counts.set(o, (counts.get(o) ?? 0) + 1);
      const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (worst && worst[1] >= 3 && worst[1] / ss.length >= 0.35) {
        return [
          styleFinding(
            "sentence-opening-repetition", "medium", 0.6,
            `"${worst[0]}…" opens ${worst[1]}/${ss.length} sentences`,
            "Repetitive sentence openings flatten rhythm.",
            "Reorder clauses or merge sentences to vary openings.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "rule-of-three",
    check: (text) => {
      const triples = text.match(/^(\s*[-*] .+\n){3}(?!\s*[-*] )/gm);
      const inline = text.match(/\b([a-z]+),\s+([a-z]+),\s+and\s+([a-z]+)\b/gi) || [];
      if ((triples && triples.length >= 2) || inline.length >= 4) {
        return [
          styleFinding(
            "rule-of-three", "low", 0.5,
            `${triples?.length ?? 0} triple-bullet blocks, ${inline.length} inline triples`,
            "Repeated rule-of-three constructions — symmetrical AI cadence.",
            "Break one triple: merge two items or expand one with a concrete detail.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "hedge-stack",
    check: (text) => {
      const hedges = text.match(/\b(may|might|could|perhaps|possibly|generally|typically|often|various|certain|somewhat|relatively)\b/gi) || [];
      const words = text.split(/\s+/).length;
      const ratio = words ? hedges.length / words : 0;
      if (hedges.length >= 6 && ratio > 0.03) {
        return [
          styleFinding(
            "hedge-stack", "low", 0.5,
            `${hedges.length} hedges in ~${words} words`,
            "Hedge stacking drains conviction; some hedging is honest, this much is fog.",
            "Commit where evidence allows; qualify only the genuinely uncertain claim.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "bold-everything",
    check: (text) => {
      const bolds = text.match(/\*\*[^*\n]+\*\*/g) || [];
      const words = text.split(/\s+/).length;
      if (bolds.length >= 6 && words < 1200) {
        return [
          styleFinding(
            "bold-everything", "low", 0.55,
            `${bolds.length} bold spans in ~${words} words`,
            "Excessive bolding — AI emphasis pattern; nothing stands out when everything does.",
            "Keep bold for 1–2 load-bearing terms per screen.",
          ),
        ];
      }
      return [];
    },
  },
  {
    name: "title-case-headings",
    check: (text) => {
      const heads = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim());
      if (heads.length < 2) return [];
      const titleCased = heads.filter((h) => {
        const words = h.split(/\s+/).filter((w) => w.length > 3);
        return words.length >= 3 && words.every((w) => /^[A-Z]/.test(w));
      });
      if (titleCased.length >= 2 && titleCased.length / heads.length >= 0.6) {
        return [
          styleFinding(
            "title-case-headings", "low", 0.5,
            `${titleCased.length}/${heads.length} headings in Title Case`,
            "Title-Case-Everything headings read as template output.",
            "Use sentence case unless the brand style guide mandates otherwise.",
          ),
        ];
      }
      return [];
    },
  },
  {
    // "Not a bug. Not a feature. A design flaw." — countdown negation.
    name: "countdown-negation",
    check: (text) => {
      const m = text.match(/(?:^|[.!?]\s+)(not [^.!?\n]{1,60}[.!?]\s+){2,}/gim);
      if (m && m.length >= 1) {
        return [
          styleFinding(
            "countdown-negation", "medium", 0.6,
            `${m.length} countdown sequence(s): "${m[0].trim().slice(0, 80)}…"`,
            "Dramatic countdown ('Not X. Not Y.') manufactures tension instead of narrowing to truth.",
            "State the point directly; keep at most one negation per piece.",
          ),
        ];
      }
      return [];
    },
  },
  {
    // "The result? Devastating." — self-posed question answered immediately.
    name: "self-answered-q",
    check: (text) => {
      const hits = [...text.matchAll(/^(the|a) [^?\n]{2,60}\?\s+[A-Z][^.\n]{1,80}[.!?]/gim)];
      if (hits.length >= 1) {
        return [
          styleFinding(
            "self-answered-q", "medium", 0.6,
            `"${hits[0][0].trim().slice(0, 80)}…"`,
            "Self-posed rhetorical question answered immediately — drama nobody asked for.",
            "Delete the question; keep the answer as a statement.",
          ),
        ];
      }
      return [];
    },
  },
  {
    // "- **Security**: ..." ×3 — bold-first bullet symmetry.
    name: "symmetric-bold-bullets",
    check: (text) => {
      const hits = text.match(/^(\s*[-*] +\*\*[^*\n]+\*\*:)/gm) || [];
      if (hits.length >= 3) {
        return [
          styleFinding(
            "symmetric-bold-bullets", "medium", 0.6,
            `${hits.length} bullets in Bold Word: explanation format`,
            "Every bullet starts with a bold keyword + colon — the default AI-markdown layout.",
            "Vary the format: plain bullets, a table, or short prose for at least one item.",
          ),
        ];
      }
      return [];
    },
  },
  {
    // "The first wall… The second wall…" — listicle in a trench coat.
    name: "listicle-trench-coat",
    check: (text) => {
      const hits = [...text.matchAll(/\bthe (first|second|third|fourth) (wall|takeaway|reason|point|step|thing|pillar)\b/gi)];
      const distinct = new Set(hits.map((h) => h[1].toLowerCase()));
      if (distinct.size >= 2) {
        return [
          styleFinding(
            "listicle-trench-coat", "low", 0.55,
            `"The ${[...distinct].join('/the ')}…" sequence`,
            "Numbered list disguised as prose ('The first… The second…').",
            "Either use a real list or write continuous argument without the scaffolding.",
          ),
        ];
      }
      return [];
    },
  },
];

export interface ContentRule {
  name: string;
  check: (text: string) => Finding[];
}

const contentFinding = (
  name: string, severity: Severity, confidence: number, location: string,
  explanation: string, action: string,
): Finding => ({
  id: nid("content"), category: "content", severity, location,
  pattern: name, explanation, suggested_action: action, confidence, layer: 4,
});

export const CONTENT_RULES: ContentRule[] = [
  {
    // Numbers/percentages with no source, method, or date nearby.
    name: "fake-specificity",
    check: (text) => {
      const out: Finding[] = [];
      const re = /\b(\d{2,3}%|\d+\s?(?:million|billion|thousand)|\d+x\b)[^.\n]{0,120}/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const ctx = m[0];
        // Markdown table cells (retry counts, version matrices) are
        // structured data, not prose claims — skip.
        const lineStart = text.lastIndexOf("\n", m.index);
        const lineEnd = text.indexOf("\n", m.index + m[0].length);
        const line = text.slice(lineStart + 1, lineEnd === -1 ? undefined : lineEnd);
        if ((line.match(/\|/g) || []).length >= 2) continue;
        if (/study|survey|report|source|census|according to|\(20\d\d\)|20\d\d|n\s*=\s*\d+/i.test(ctx + text.slice(Math.max(0, m.index - 120), m.index))) continue;
        out.push(contentFinding(
          "fake-specificity", "high", 0.7, excerpt(text, m.index),
          `Quantified claim ("${ctx.trim().slice(0, 60)}…") with no visible source, date, or method.`,
          "Add the source and date, soften to an attributed claim, or remove the number.",
        ));
        if (out.length >= 5) break;
      }
      return out;
    },
  },
  {
    name: "unsupported-superlative",
    check: (text) => {
      const out: Finding[] = [];
      const re = /\b(best|first|only|fastest|most (?:advanced|powerful|comprehensive|innovative)|#1|number one|world-class|industry-leading|state-of-the-art)\b[^.\n]{0,100}/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const ctx = text.slice(Math.max(0, m.index - 80), m.index + 80);
        if (/benchmark|award|rated|certified|measured|tested|according to/i.test(ctx)) continue;
        out.push(contentFinding(
          "unsupported-superlative", "medium", 0.6, excerpt(text, m.index),
          `Superlative ("${m[1]}") with no evidence in the surrounding context.`,
          "Attach proof (benchmark, award, measurement) or downgrade to a verifiable claim.",
        ));
        if (out.length >= 5) break;
      }
      return out;
    },
  },
  {
    name: "vague-authority",
    check: (text) => {
      const out: Finding[] = [];
      const re = /\b(experts (say|agree|believe)|studies show|research shows|it is (widely )?(known|accepted|believed)|many (people|users|companies))\b[^.\n]{0,100}/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        out.push(contentFinding(
          "vague-authority", "medium", 0.65, excerpt(text, m.index),
          `Vague authority ("${m[0].trim().slice(0, 50)}…") — attribution without a source.`,
          "Name the expert/study or cut the appeal to authority.",
        ));
        if (out.length >= 5) break;
      }
      return out;
    },
  },
  {
    name: "idea-repetition",
    check: (text) => {      // Same content word (8+ chars) dominating across sentences = restated idea.
      const words = (text.toLowerCase().match(/\b[a-z]{8,}\b/g) || [])
        .filter((w) => !/^(because|however|through|between|without|within|across|about|while|after|before|under|over|with|from|that|this|these|those|they|them|their|your|will|would|should|could|have|has|been|more|most|very|just|also|only|into|when|what|which|where|there|here)$/.test(w));
      const counts = new Map<string, number>();
      for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
      const total = words.length || 1;
      const out: Finding[] = [];
      for (const [w, c] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
        if (c >= 5 && c / total > 0.04) {
          out.push(contentFinding(
            "idea-repetition", "low", 0.5, `"${w}" ×${c}`,
            `The same long word recurs ${c}× — often the same idea restated with synonyms.`,
            "Check whether paragraphs repeat one idea; merge or add a new one.",
          ));
        }
      }
      return out;
    },
  },
  {
    // "the supervision paradox", "acceleration trap" — invented concept labels.
    name: "invented-concept-label",
    check: (text) => {
      const out: Finding[] = [];
      const re = /\b([a-z]{4,}) (paradox|trap|creep|divide|vacuum|inversion)\b/gi;
      const legit = new Set(["poverty", "liquidity", "middle", "digital", "thucydides"]);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (legit.has(m[1].toLowerCase())) continue;
        out.push(contentFinding(
          "invented-concept-label", "low", 0.5, excerpt(text, m.index),
          `Compound label ("${m[0]}") used as if established — name a thing, skip the argument.`,
          "Either define the term rigorously or argue the point without the label.",
        ));
        if (out.length >= 4) break;
      }
      return out;
    },
  },
  {
    // "Apple didn't build Uber. Facebook didn't…" — historical analogy stacking.
    name: "historical-analogy-stacking",
    check: (text) => {
      const names = ["apple", "facebook", "meta", "uber", "airbnb", "spotify", "shopify", "stripe", "aws", "discord", "netflix", "google"];
      const hits: number[] = [];
      const re = new RegExp(`\\b(${names.join("|")})\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) hits.push(m.index);
      for (let i = 0; i < hits.length; i++) {
        const window = hits.filter((h) => h >= hits[i] && h <= hits[i] + 400);
        const distinct = new Set(window.map((h) => text.slice(h, h + 20).toLowerCase().split(/\W/)[0]));
        if (distinct.size >= 4) {
          return [contentFinding(
            "historical-analogy-stacking", "medium", 0.6, excerpt(text, hits[i]),
            `${distinct.size} tech giants invoked in one breath — rapid-fire analogy building false authority.`,
            "Keep at most one analogy, and only if the parallel is exact.",
          )];
        }
      }
      return [];
    },
  },
];
