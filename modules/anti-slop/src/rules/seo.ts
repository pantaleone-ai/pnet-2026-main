/**
 * SEO anti-slop analyzer. Preserves useful SEO information; flags
 * search-engine-first prose: stuffing, empty definitional sections,
 * repetitive FAQ blocks, semantic repetition across headings.
 */

import type { Finding, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;
const mk = (pattern: string, severity: Severity, confidence: number, location: string, explanation: string, action: string): Finding => ({
  id: nid("seo"), category: "seo", severity, location, pattern,
  explanation, suggested_action: action, confidence, layer: 3,
});

export function analyzeSeo(text: string): Finding[] {
  const out: Finding[] = [];
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  const total = Math.max(1, words.length);
  const stop = new Set("the,and,for,are,but,not,you,all,can,had,her,was,one,our,out,has,have,will,with,from,that,this,these,those,they,them,their,your,when,what,which,where,there,about,into,more,most,very,just,also,only,than,its,as,was,were,been,being,over,under,while,after,before,between,across,through,within,without,because,however,often,each,every,other,such,than,then,them,they,this,will,would,should,could,your,yours".split(","));
  const counts = new Map<string, number>();
  for (const w of words) {
    if (stop.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Keyword stuffing: top content term > 3.5% of words in docs > 300 words.
  if (total > 300) {
    for (const [w, c] of top.slice(0, 2)) {
      const ratio = c / total;
      if (ratio > 0.035 && c >= 8) {
        out.push(mk(
          "keyword-stuffing", ratio > 0.06 ? "high" : "medium", 0.65,
          `"${w}" ×${c} (${(ratio * 100).toFixed(1)}% of words)`,
          `Top term "${w}" is over-represented — reads as keyword stuffing, not natural coverage.`,
          "Use pronouns, synonyms with distinct meaning, or cut repetitions; keep the term where it earns its place.",
        ));
        break;
      }
    }
  }

  // Empty "what is X?" definitional sections (<40 words before next heading).
  const sections = text.split(/(?=^#{1,4}\s+)/m);
  for (const s of sections) {
    const head = s.match(/^#{1,4}\s*(.+)/)?.[1]?.trim() ?? "";
    if (/^what is\b/i.test(head)) {
      const bodyWords = s.replace(/^#{1,4}\s*.+\n?/, "").split(/\s+/).filter(Boolean).length;
      if (bodyWords < 40) {
        out.push(mk(
          "empty-definition", "medium", 0.6, `Section "${head.slice(0, 60)}" (${bodyWords} words)`,
          "Empty 'What is X?' section — search-engine-first scaffolding with no information gain.",
          "Either write a definition that adds something the reader lacks, or delete the section.",
        ));
      }
    }
    // Generic conclusions.
    if (/^(conclusion|final thoughts|wrapping up|in summary)/i.test(head)) {
      const body = s.replace(/^#{1,4}\s*.+\n?/, "").trim();
      if (/in conclusion|to summarize|overall,/.test(body) || body.split(/\s+/).filter(Boolean).length < 30) {
        out.push(mk(
          "generic-conclusion", "low", 0.55, `Section "${head.slice(0, 60)}"`,
          "Generic conclusion restating the intro instead of adding a next step or verdict.",
          "Replace with a decision, recommendation, or concrete next action — or cut it.",
        ));
      }
    }
  }

  // Repetitive FAQ blocks: 4+ questions with near-identical openers.
  const questions = [...text.matchAll(/^#{1,4}\s*(.+\?)\s*$/gm)].map((m) => m[1].trim());
  if (questions.length >= 4) {
    const openers = questions.map((q) => q.split(/\s+/).slice(0, 3).join(" ").toLowerCase());
    const uniq = new Set(openers);
    if (uniq.size <= Math.ceil(openers.length / 2)) {
      out.push(mk(
        "repetitive-faq", "medium", 0.6, `${questions.length} FAQ questions, ${uniq.size} distinct openers`,
        "FAQ block with templated questions — targets query variants, not reader doubts.",
        "Keep only questions real users ask; rewrite each in the user's own words.",
      ));
    }
  }

  // Semantic repetition across headings: same 4+ word n-gram in 2+ headings.
  const heads = [...text.matchAll(/^#{1,4}\s*(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  if (heads.length >= 3) {
    const grams = new Map<string, number>();
    for (const h of heads) {
      const ws = h.split(/\s+/);
      for (let i = 0; i + 3 < ws.length; i++) {
        const g = ws.slice(i, i + 4).join(" ");
        grams.set(g, (grams.get(g) ?? 0) + 1);
      }
    }
    const rep = [...grams.entries()].find(([, c]) => c >= 2);
    if (rep) {
      out.push(mk(
        "heading-repetition", "low", 0.5, `4-gram "${rep[0]}" in ${rep[1]} headings`,
        "Same phrase repeated across headings — semantic repetition, not hierarchy.",
        "Differentiate the headings so each promises distinct information.",
      ));
    }
  }

  return out;
}
