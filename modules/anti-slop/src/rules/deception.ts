/**
 * Deception-pattern detectors — deterministic subset of the Tier-1 CRITICAL
 * copywriting rules (pack.json tier1Critical). Severity is HIGH because
 * deceptive framing is factual-integrity class, but findings are SOFT:
 * never added to default hardGates (promotion requires explicit approval).
 *
 * The non-deterministic CRITICAL rows (fabricated experience/testimonials/
 * case studies, citation mismatch, trimmed quotes, disclaimer excuses,
 * typo/slang-voice) cannot be judged without semantic evidence and live as
 * Layer-5 LLM-critique prompts (see COPYWRITING.md) — never as regexes that
 * would false-positive on honest prose.
 */

import type { Finding, ScanOptions } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e > text.length ? "…" : "");
}

function mk(pattern: string, severity: "high" | "medium", confidence: number, location: string, explanation: string, action: string, layer: number, offset?: number): Finding {
  return { id: nid("decept"), category: "content", severity, location, pattern, explanation, suggested_action: action, confidence, layer, offset };
}

function allowed(opts: ScanOptions, pattern: string): boolean {
  return (opts.projectProfile?.allowlist ?? []).some((a) => a.toLowerCase() === pattern.toLowerCase());
}

/** Nearby-context check: does `re` match within `radius` chars of `idx`? */
function nearby(text: string, idx: number, len: number, re: RegExp, radius = 200): boolean {
  const s = Math.max(0, idx - radius);
  const e = Math.min(text.length, idx + len + radius);
  re.lastIndex = 0;
  return re.test(text.slice(s, e));
}

const TERMS_NEARBY = /(terms|conditions|warranty|refund|guarantee (terms|policy)|\b\d+\s*(day|days|month|months|year)s?\b|money[-\s]back)/i;
const FREE_CONDITIONS = /(\b[Tt]erms (and )?conditions\b|conditions apply|payment method|credit card|card (details|on file)|bills?\s+(monthly|annually|weekly|yearly)|with (any |a )?(purchase|plan|subscription)|requires? (a |the )?(plan|subscription|purchase)|trial[^\n]{0,40}(then|converts|charged)|after trial|with purchase|\bfree\*(?!\*))/i;
const FREE_IDIOM_TAIL = /(break|set|feel|run|think)\s+$/i;
const BASELINE_NEARBY = /(baseline|compared? (to|with)|versus|vs\.? |control( group)?|from .{1,30} to |starting point)/i;
const KNOWLEDGE_NEARBY = /(training data|trained (on|with)|weights|fine-tun|dataset|gradient|retrieval|grounded|RAG)/i;
const PERMISSION_NEARBY = /(permission|scope|approval|human-in-the-loop|oversight|guardrail|constraint|bounded|policy|review)/i;

export function analyzeDeception(text: string, opts: ScanOptions = {}): Finding[] {
  const out: Finding[] = [];

  // AS-1919: "guaranteed" without enforceable terms.
  if (!allowed(opts, "deception-risk:guarantee-without-terms")) {
    const META_DISCUSSION = /(manipulat|scam|avoid|don't|never|beware|dark pattern|against|tactics that promise)/i;
    const re = /\bguarantee[sd]?\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (nearby(text, m.index, m[0].length, TERMS_NEARBY)) continue;
      // Negation ("not a guarantee") and meta-discussion ("tactics that
      // promise guaranteed X") describe or condemn — not the claim itself.
      const before = text.slice(Math.max(0, m.index - 24), m.index);
      if (/(not|n't|no|without)(\s+\w+)?\s*$/i.test(before)) continue;
      if (nearby(text, m.index, m[0].length, META_DISCUSSION, 150)) continue;
      out.push(mk(
        "deception-risk:guarantee-without-terms", "high", 0.9,
        excerpt(text, m.index),
        `Guarantee language ("${m[0]}") with no enforceable terms nearby — guarantees are consequential claims.`,
        "Name the terms, duration, and remedy — or remove the guarantee.",
        4, m.index,
      ));
      if (out.filter((f) => f.pattern === "deception-risk:guarantee-without-terms").length >= 3) break;
    }
  }

  // AS-1920: "free" with mandatory conditions hidden in the SAME sentence.
  // Cross-sentence conditioning needs coreference (LLM territory) — the
  // deterministic rule only fires when offer and condition share a sentence.
  // Excludes hyphenated compounds (free-form, duty-free) and idioms
  // (break/set/feel free), which are never offers.
  if (!allowed(opts, "deception-risk:free-with-hidden-conditions")) {
    const sentences: { start: number; text: string }[] = [];
    const sentRe = /[^.!?;]+[.!?;]+|[^.!?;]+$/g;
    let s: RegExpExecArray | null;
    while ((s = sentRe.exec(text)) !== null) sentences.push({ start: s.index, text: s[0] });
    const re = /(?<!-)\b[Ff]ree\b(?!-)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 12), m.index);
      if (FREE_IDIOM_TAIL.test(before)) continue;
      const sent = sentences.find((x) => m && m.index >= x.start && m.index < x.start + x.text.length);
      FREE_CONDITIONS.lastIndex = 0;
      if (!sent || !FREE_CONDITIONS.test(sent.text)) continue;
      out.push(mk(
        "deception-risk:free-with-hidden-conditions", "high", 0.85,
        excerpt(text, m.index),
        `“Free” appears alongside conditions (asterisk, required purchase/plan, trial conversion) — the label must match the real offer.`,
        "Disclose the condition in the same sentence, or drop “free”.",
        4, m.index,
      ));
      if (out.filter((f) => f.pattern === "deception-risk:free-with-hidden-conditions").length >= 3) break;
    }
  }

  // AS-1923: before/after claim using different baselines.
  if (!allowed(opts, "deception-risk:before-after-baseline")) {
    const re = /\bbefore[- ]and[- ]after\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (nearby(text, m.index, m[0].length, /(%|\d+x|\d+%|uplift|\blift\b|faster|improvement|reduction)/i) && !nearby(text, m.index, m[0].length, BASELINE_NEARBY, 300)) {
        out.push(mk(
          "deception-risk:before-after-baseline", "medium", 0.78,
          excerpt(text, m.index),
          "Before/after framing with measured claims but no shared baseline stated — false comparison creates misleading uplift.",
          "State the baseline both sides share (same workload, same period, same metric).",
          4, m.index,
        ));
      }
      if (out.filter((f) => f.pattern === "deception-risk:before-after-baseline").length >= 3) break;
    }
  }

  // Tier-4 governance: a claim that a system "understands/knows" without data.
  if (!allowed(opts, "deception-risk:anthropomorphic-knowing")) {
    const re = /\b(model|models|ai|agent|agents|system|llm)\s+(understands?|knows?|believes?|thinks?)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (nearby(text, m.index, m[0].length, KNOWLEDGE_NEARBY)) continue;
      out.push(mk(
        "deception-risk:anthropomorphic-knowing", "high", 0.8,
        excerpt(text, m.index),
        `Knowing-claim ("${m[0].trim().slice(0, 50)}") with no data mechanism nearby — understanding claims need a data story.`,
        "Say what data/training grounds the claim, or downgrade to what the system outputs.",
        4, m.index,
      ));
      if (out.filter((f) => f.pattern === "deception-risk:anthropomorphic-knowing").length >= 3) break;
    }
  }

  // Tier-4 governance: autonomy claim without permissions described.
  if (!allowed(opts, "deception-risk:autonomy-without-permissions")) {
    const re = /\b(fully autonomous|autonomous(ly)? (agent|system|workflow)s?)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (nearby(text, m.index, m[0].length, PERMISSION_NEARBY)) continue;
      out.push(mk(
        "deception-risk:autonomy-without-permissions", "high", 0.8,
        excerpt(text, m.index),
        `Autonomy claim ("${m[0].trim().slice(0, 50)}") with no permissions/scope described.`,
        "Name the permissions, scope limits, and human checkpoints — autonomy is a scope claim.",
        4, m.index,
      ));
      if (out.filter((f) => f.pattern === "deception-risk:autonomy-without-permissions").length >= 3) break;
    }
  }

  return out;
}
