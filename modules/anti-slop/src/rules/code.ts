/**
 * Code/UI slop detector for React/Next.js/Tailwind/Markdown sources.
 * Analyzes density and context — no class is banned globally.
 */

import type { Finding, Severity } from "../types.js";

let seq = 0;
const nid = () => `code-${++seq}-${Date.now().toString(36)}`;
const mk = (pattern: string, severity: Severity, confidence: number, location: string, explanation: string, action: string): Finding => ({
  id: nid(), category: "code", severity, location, pattern,
  explanation, suggested_action: action, confidence, layer: 3,
});

const countRe = (src: string, re: RegExp) => (src.match(re) || []).length;

export function analyzeCode(source: string, fileLabel = "source"): Finding[] {
  const out: Finding[] = [];
  const lines = source.split("\n").length;
  const per100 = (n: number) => (n / Math.max(1, lines / 100)); // per 100 lines

  const densities: { name: string; re: RegExp; threshold: number; per100min: number; explanation: string; action: string }[] = [
    {
      name: "rounded-xl-density", re: /rounded-(xl|2xl|3xl)/g, threshold: 10, per100min: 4,
      explanation: "rounded-xl/2xl/3xl on a large share of elements — default AI softness in code.",
      action: "Introduce a radius scale: one radius for cards, smaller for controls, none for dividers.",
    },
    {
      name: "shadow-density", re: /shadow-(md|lg|xl|2xl)|drop-shadow-/g, threshold: 8, per100min: 3,
      explanation: "Shadow utilities scattered across components.",
      action: "Restrict elevation tokens to overlays and raised interactive elements.",
    },
    {
      name: "gradient-classes", re: /bg-gradient-to|from-[a-z]+-\d+|via-[a-z]+-\d+/g, threshold: 6, per100min: 2,
      explanation: "Gradient utilities repeated across the file.",
      action: "Consolidate into a theme token or remove decorative gradients.",
    },
    {
      name: "animate-classes", re: /animate-[a-z]+|transition-all|duration-\d+|whileHover|whileInView/g, threshold: 10, per100min: 4,
      explanation: "Animation/transition utilities on many elements.",
      action: "Animate purposefully; remove ambient motion that carries no state information.",
    },
  ];

  for (const d of densities) {
    const n = countRe(source, d.re);
    if (n >= d.threshold && per100(n) >= d.per100min) {
      out.push(mk(d.name, n >= d.threshold * 2 ? "high" : "medium", 0.6, `${n} matches in ${lines} lines of ${fileLabel}`, d.explanation, d.action));
    }
  }

  // Repeated identical CTA labels.
  const ctas = [...source.matchAll(/>(Get Started|Learn More|Try (It|Now|Free)|Start Free|Discover More|Explore Now)<\//gi)].map((m) => m[1].toLowerCase());
  const ctaCounts = new Map<string, number>();
  for (const c of ctas) ctaCounts.set(c, (ctaCounts.get(c) ?? 0) + 1);
  for (const [label, n] of ctaCounts) {
    if (n >= 3) {
      out.push(mk(
        "generic-cta", "medium", 0.6, `"${label}" ×${n} in ${fileLabel}`,
        `Generic CTA "${label}" repeated ${n}× — template conversion language.`,
        "Write CTAs as the user's next action in context ('Mint your first token', 'Read the deployment guide').",
      ));
    }
  }

  // Duplicate layout: same grid-cols pattern 3+ times in one file.
  const grids = countRe(source, /grid-cols-3|md:grid-cols-3/g);
  if (grids >= 3) {
    out.push(mk(
      "duplicate-grid-layout", "medium", 0.55, `${grids} identical 3-col grids in ${fileLabel}`,
      "Same 3-column grid repeated — sections are interchangeable templates.",
      "Vary one section's layout (list, split, specimen) to reflect its content.",
    ));
  }

  // Markdown/MDX: heading + bullet-list monotony.
  if (/^#{1,4}\s+/m.test(source)) {
    const heads = countRe(source, /^#{1,4}\s+/gm);
    const bullets = countRe(source, /^\s*[-*]\s+/gm);
    if (heads >= 4 && bullets / heads >= 4) {
      out.push(mk(
        "md-list-monotony", "low", 0.5, `${heads} headings, ${bullets} bullets in ${fileLabel}`,
        "Every section dissolves into bullet lists — outline-shaped filler.",
        "Convert the most important section to prose with a concrete example.",
      ));
    }
  }

  return out;
}
