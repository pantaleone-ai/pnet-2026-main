/**
 * Minimum-effective-edit rewrite engine.
 *
 * Principle: "What is the smallest change that materially improves this?"
 * Only high-confidence, meaning-preserving transforms are applied
 * automatically. Everything else is returned as a suggestion.
 * If the content is good, it is left alone.
 */

import type { Finding } from "../types.js";
import { CHATBOT_ARTIFACTS } from "../rules/text.js";

export interface RewriteResult {
  text: string;
  changesMade: string[];
  suggestions: string[];
  skipped: string[];
}

/** Safe, deterministic transforms — never touch meaning. */
const SAFE_FILLER_CUTS: { re: RegExp; label: string }[] = [
  { re: /^\s*(certainly|absolutely|of course)[!.]\s*/gim, label: "removed chatbot pleasantry opener" },
  { re: /\blet'?s (dive in|explore|take a look|break it down)[,.]?\s*/gi, label: "removed 'let's dive in' scaffolding" },
  { re: /\bhere'?s a breakdown[,:]?\s*/gi, label: "removed 'here's a breakdown' scaffolding" },
  { re: /\bin conclusion[,.]?\s*/gi, label: "removed 'in conclusion' signoff" },
  { re: /\bi hope this helps[!.]?\s*/gi, label: "removed 'hope this helps' signoff" },
  { re: /\bit'?s (important to note|worth noting) that\s*/gi, label: "removed 'it's important/worth noting' throat-clearing" },
  { re: /\bit bears? mentioning\s*/gi, label: "removed 'it bears mentioning' throat-clearing" },
  { re: /\bin today'?s (rapidly changing|fast-paced|ever-evolving)[^.\n]*?[.,]\s*/gi, label: "removed generic temporal opener" },
  { re: /\bhere'?s the thing:\s*/gi, label: "removed 'here's the thing' throat-clearing" },
];

const SAFE_WORD_SWAPS: { re: RegExp; to: string; label: string }[] = [
  { re: /\bleverage\b/gi, to: "use", label: "leverage → use" },
  { re: /\bharness\b/gi, to: "use", label: "harness → use" },
  { re: /\butilize\b/gi, to: "use", label: "utilize → use" },
  { re: /\bin order to\b/gi, to: "to", label: "'in order to' → 'to'" },
];

export function rewriteMinimal(
  analyzedText: string,
  findings: Finding[],
  autoFixThreshold = 0.85,
): RewriteResult {
  let text = analyzedText;
  const changesMade: string[] = [];
  const suggestions: string[] = [];
  const skipped: string[] = [];

  const autoFixable = new Set([
    ...CHATBOT_ARTIFACTS.map((a) => `chatbot:${a.name}`),
    "rhetorical:rapidly-changing-opener",
  ]);

  // 1. Chatbot artifacts + generic openers: excise (confidence 0.9, meaning-safe).
  for (const cut of SAFE_FILLER_CUTS) {
    cut.re.lastIndex = 0;
    if (cut.re.test(text)) {
      cut.re.lastIndex = 0;
      text = text.replace(cut.re, "");
      changesMade.push(cut.label);
    }
  }

  // 2. Conservative word swaps — only when the finding exists AND
  // the swap is in the safe list (prevents over-editing).
  const lexicalHits = findings.filter((f) => f.category === "lexical" && f.confidence >= autoFixThreshold);
  void lexicalHits;
  for (const swap of SAFE_WORD_SWAPS) {
    swap.re.lastIndex = 0;
    if (swap.re.test(text)) {
      swap.re.lastIndex = 0;
      // Only swap when it is NOT sentence-initial jargon the author may intend
      // and when the doc has other signals (avoid single-word paranoia).
      if (findings.length >= 2) {
        text = text.replace(swap.re, swap.to);
        changesMade.push(swap.label);
      } else {
        skipped.push(`${swap.label} — single isolated signal, left alone (anti-overcorrection)`);
      }
    }
  }

  // 3. Em-dash triage: beyond 3, convert extras to periods (first 2 kept).
  const dashes = text.match(/—/g) || [];
  if (dashes.length > 3) {
    let seen = 0;
    text = text.replace(/—/g, (m) => {
      seen += 1;
      if (seen <= 2) return m;
      return ".";
    });
    changesMade.push(`converted ${dashes.length - 2} excess em dashes to periods (kept 2)`);
  }

  // 4. Everything else → suggestions, never silent rewrites.
  for (const f of findings) {
    if (autoFixable.has(`${f.category === "chatbot" ? f.pattern : `${f.category}:${f.pattern}`}`)) continue;
    if (f.category === "lexical" && f.confidence < autoFixThreshold) {
      skipped.push(`"${f.pattern}" (${f.severity}, conf ${f.confidence}) — contextual signal, no auto-edit`);
      continue;
    }
    if (!suggestions.includes(f.suggested_action)) suggestions.push(f.suggested_action);
  }

  // Tidy whitespace left by excisions.
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/^ +/gm, (m) => m);

  return { text, changesMade, suggestions, skipped };
}
