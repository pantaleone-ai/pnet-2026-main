/**
 * Rhythm / homogenization rules — full port of scripts/language-gate.py.
 *
 * Report-only signals (soft): repetition, fragments, punctuation density,
 * contrast-structure density, hype density. Never auto-fixed; suggestions only.
 * Skips code fences, blockquotes, tables, frontmatter (caller passes analyzed
 * text), plus URL/JSON lines mirrored from the Python strip_protected().
 */

import type { Finding, ProjectProfile, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function rhythmFinding(
  pattern: string,
  severity: Severity,
  confidence: number,
  location: string,
  explanation: string,
  action: string,
): Finding {
  return {
    id: nid("rhythm"),
    category: "style",
    severity,
    location,
    pattern,
    explanation,
    suggested_action: action,
    confidence,
    layer: 3,
  };
}

/** Mirror language-gate.py strip_protected() for lines surviving protect(). */
function proseLines(text: string): string[] {
  return text.split("\n").filter((ln) => {
    if (/^\s*(>\s|.*\|.*\|)/.test(ln)) return false;
    if (ln.includes("http") || ln.includes("\\{")) return false;
    return true;
  });
}

export function analyzeRhythm(text: string, project?: ProjectProfile): Finding[] {
  const out: Finding[] = [];
  const limits = {
    maxShortParas: project?.rhythmLimits?.maxShortParas ?? 8,
    maxPunctDensity: project?.rhythmLimits?.maxPunctDensity ?? 0.015,
    maxContrast: project?.rhythmLimits?.maxContrast ?? 3,
    maxRepeatOpening: project?.rhythmLimits?.maxRepeatOpening ?? 4,
    maxHypeDensity: project?.rhythmLimits?.maxHypeDensity ?? 0.01,
  };
  const allow = new Set((project?.allowlist ?? []).map((a) => a.toLowerCase()));
  if (allow.has("repetition-opening") && allow.has("fragments") && allow.has("punctuation-density")
    && allow.has("contrast-structure") && allow.has("hype-density")) return out;

  const lines = proseLines(text);
  const prose = lines.join("\n");
  const low = prose.toLowerCase();
  const words = prose.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

  // 1. Repeated sentence openings (first 3 words), port of analyze().
  if (!allow.has("repetition-opening")) {
    const opens = new Map<string, number>();
    for (const ln of lines) {
      for (const s of ln.split(/(?<=[.!?])\s+/)) {
        const w = s.trim().split(/\s+/).slice(0, 3);
        if (w.length === 3 && s.trim().length > 20) {
          const key = w.join(" ").toLowerCase();
          opens.set(key, (opens.get(key) ?? 0) + 1);
        }
      }
    }
    for (const [k, c] of opens) {
      if (c >= limits.maxRepeatOpening) {
        out.push(rhythmFinding(
          "repetition-opening", "medium", 0.6,
          `opening '${k}...' x${c}`,
          `The same 3-word opening recurs ${c}x — formulaic rhythm that reads synthetic.`,
          "Reorder clauses or merge sentences to vary openings.",
        ));
      }
    }
  }

  // 2. Contrast-structure density: "is not/isn't/aren't/don't/stop X … it is/it's/they are/do Y".
  if (!allow.has("contrast-structure")) {
    const contrast = (low.match(/(is not|isn't|aren't|don't|stop \w+).{0,60}?(it is|it['’]s|they are|do \w+)/g) || []).length;
    if (contrast >= limits.maxContrast) {
      out.push(rhythmFinding(
        "contrast-structure", "medium", 0.6,
        `${contrast} not-X-but-Y structures`,
        `${contrast} "X is not Y. It is Z" contrast frames — the Pnet homogenization tell.`,
        "State the concrete distinction directly in at least half the cases.",
      ));
    }
  }

  // 3. Slogan fragments: many very short paragraphs.
  if (!allow.has("fragments")) {
    const shortParas = lines.filter((ln) => {
      const n = ln.trim().split(/\s+/).filter(Boolean).length;
      return n > 0 && n <= 6;
    }).length;
    if (shortParas >= limits.maxShortParas) {
      out.push(rhythmFinding(
        "fragments", "low", 0.55,
        `${shortParas} very short lines`,
        `${shortParas} slogan-fragment lines (<=6 words) — staccato feed voice, not technical prose.`,
        "Merge fragments into full sentences carrying evidence or a decision.",
      ));
    }
  }

  // 4. Punctuation density per character class.
  if (!allow.has("punctuation-density")) {
    const defs: [string, string, string][] = [
      ["—", "em-dash-density", "Em-dash"],
      [":", "colon-density", "Colon"],
      [";", "semicolon-density", "Semicolon"],
    ];
    for (const [char, pattern, label] of defs) {
      const c = prose.split(char).length - 1;
      if (c / wordCount > limits.maxPunctDensity) {
        out.push(rhythmFinding(
          pattern, "low", 0.55,
          `${c} ${label.toLowerCase()} uses in ${wordCount} words`,
          `${label} density far above natural prose — AI-rhythm tell.`,
          char === "—"
            ? "Keep at most 1–2; convert the rest to periods or commas."
            : `Cut ${label.toLowerCase()} scaffolding; use short sentences.`,
        ));
      }
    }
  }

  // 5. Hype / abstraction density (informational; lexical rules carry the detail).
  if (!allow.has("hype-density")) {
    const hypeTerms = ["transformational", "revolutionary", "game-changing", "groundbreaking", "cutting-edge", "next-generation", "unprecedented", "seamless", "robust", "comprehensive", "definitive", "ultimate", "unlock", "harness", "leverage", "supercharge", "elevate", "frictionless", "future-proof", "mission-critical", "best-in-class", "world-class", "state-of-the-art"];
    let hits = 0;
    for (const t of hypeTerms) {
      const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      hits += (low.match(re) || []).length;
    }
    if (hits / wordCount > limits.maxHypeDensity) {
      out.push(rhythmFinding(
        "hype-density", "low", 0.55,
        `${hits} hype terms in ${wordCount} words`,
        "Hype-term density above technical-prose budget — reads as marketing, not evidence.",
        "Swap each hype term for the concrete capability or cut it.",
      ));
    }
  }

  return out;
}
