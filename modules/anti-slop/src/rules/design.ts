/**
 * Design anti-slop analyzer. Detects STRUCTURAL convergence
 * (template SaaS sequences, card-grid monotony), not just colors/fonts.
 * Never prescribes "replace purple with teal" — density + context decide.
 */

import type { Finding, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;
const mk = (pattern: string, severity: Severity, confidence: number, location: string, explanation: string, action: string, layer = 3): Finding => ({
  id: nid("des"), category: pattern.startsWith("sequence") || pattern.startsWith("section-rhythm") ? "structure" : "design",
  severity, location, pattern, explanation, suggested_action: action, confidence, layer,
});

export interface DesignInput {
  /** raw source (tsx/html/css) or a structural outline */
  source: string;
  /** optional ordered section names, e.g. ["hero","features","testimonials",...] */
  sections?: string[];
}

const TEMPLATE_SEQUENCE = ["hero", "features", "benefits", "testimonials", "pricing", "faq", "cta"];

function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) || []).length;
}

export function analyzeDesign(input: DesignInput): Finding[] {
  const out: Finding[] = [];
  const src = input.source;
  const loc = src.length; // chars as file-size proxy
  const perKloc = (n: number) => (n / Math.max(1, loc / 1000));

  // --- Surface pattern densities (contextual: per 1k chars) ---
  const densities: { name: string; re: RegExp; threshold: number; explanation: string; action: string }[] = [
    {
      name: "gradient-overuse", re: /gradient|bg-gradient|from-(purple|indigo|violet|fuchsia)/gi, threshold: 6,
      explanation: "Gradient-heavy styling incl. purple/indigo defaults — the most common AI-interface tell.",
      action: "Use one restrained gradient or flat color tied to the brand palette; delete decorative ones.",
    },
    {
      name: "glassmorphism", re: /backdrop-blur|bg-white\/\d+|bg-opacity|glass/gi, threshold: 4,
      explanation: "Repeated glassmorphism without a readability reason.",
      action: "Keep glass only where layered content requires it; otherwise use solid surfaces.",
    },
    {
      name: "rounded-everything", re: /rounded-(xl|2xl|3xl|full)/gi, threshold: 8,
      explanation: "Rounded-everything shape language — default AI softness.",
      action: "Define one radius scale in the design profile and apply it deliberately.",
    },
    {
      name: "shadow-stack", re: /shadow-(lg|xl|2xl)|drop-shadow/gi, threshold: 5,
      explanation: "Excessive large shadows / floating-card depth.",
      action: "Flatten non-interactive surfaces; reserve elevation for overlays.",
    },
    {
      name: "pill-excess", re: /rounded-full[^;]{0,80}(px-\d|badge|pill)|<Badge|<Pill/gi, threshold: 6,
      explanation: "Pill/badge proliferation.",
      action: "Use pills for status only, not decoration.",
    },
    {
      name: "icon-container", re: /icon.*(wrapper|container|bg-.*rounded)|rounded.*(icon|lucide)/gi, threshold: 4,
      explanation: "Generic icon-in-rounded-container motif repeated.",
      action: "Vary the motif or drop containers where icons read fine alone.",
    },
    {
      name: "animation-everywhere", re: /animate-|motion\.|framer-motion|whileInView|transition-all|duration-\d+/gi, threshold: 8,
      explanation: "Scroll/animation classes on nearly everything.",
      action: "Animate only state changes and the primary narrative beat.",
    },
    {
      name: "orb-blob", re: /blur-(2xl|3xl)|radial|orb|blob|glow(ing)?-(orb|effect|particles)/gi, threshold: 2,
      explanation: "Decorative glowing orbs / blobs with no information.",
      action: "Remove; add visual interest through layout or real imagery.",
    },
    {
      name: "gradient-text", re: /bg-clip-text|text-transparent.*gradient|gradient.*text/gi, threshold: 2,
      explanation: "Gradient headline text — AI-hero cliché.",
      action: "Use solid ink color; earn emphasis with words, not rainbows.",
    },
  ];

  for (const d of densities) {
    const n = countRe(src, d.re);
    if (n >= d.threshold && perKloc(n) > 0.4) {
      out.push(mk(d.name, n >= d.threshold * 2 ? "high" : "medium", 0.6, `${n} matches in ~${loc} chars`, d.explanation, d.action));
    }
  }

  // Generic SaaS hero: centered headline + subhead + two buttons.
  if (/<[Hh]ero|hero/gi.test(src) || /text-center[^>]{0,300}button/gi.test(src)) {
    const buttons = countRe(src, /<[Bb]utton|btn/gi);
    if (/text-center/.test(src) && buttons >= 2) {
      out.push(mk(
        "generic-saas-hero", "medium", 0.55, `centered hero + ${buttons} buttons`,
        "Centered headline + subheadline + two-button hero — the default AI SaaS opening.",
        "Justify the structure by the visitor's task, or try a product-first / editorial opening.",
      ));
    }
  }

  // Three identical feature cards / repeated card grids.
  const cards = countRe(src, /<[Cc]ard|feature-card|className="[^"]*card/gi);
  if (cards >= 3) {
    const grid3 = /grid[^>]{0,120}cols-3|md:grid-cols-3/.test(src);
    if (grid3 || cards >= 6) {
      out.push(mk(
        "card-grid-monotony", cards >= 6 ? "high" : "medium", 0.6, `${cards} card instances`,
        "Repeated identical cards in a grid — template convergence, not information hierarchy.",
        "Differentiate: vary card weight by importance, or replace one row with a narrative/specimen block.",
      ));
    }
  }

  // Fake social proof: testimonials + logo soup.
  if (/(testimonial|loved by|trusted by)[\s\S]{0,400}(logo|avatar|stars|★★★★★)/gi.test(src)) {
    out.push(mk(
      "proof-soup", "low", 0.5, "testimonial + logo cluster",
      "Testimonial section and/or logo soup without verifiable attribution.",
      "Attribute real customers with checkable quotes, or cut the section.",
    ));
  }

  // --- Structural sequence analysis ---
  const sections = (input.sections ?? detectSections(src)).map((s) => s.toLowerCase());
  if (sections.length >= 4) {
    const templateHits = sections.filter((s) => TEMPLATE_SEQUENCE.includes(s));
    const inOrder = longestOrderedSubsequence(sections, TEMPLATE_SEQUENCE);
    if (inOrder >= 5 && templateHits.length / sections.length >= 0.7) {
      out.push(mk(
        "sequence-template-saas", "high", 0.7, sections.join(" → "),
        "Page follows the canonical Hero→Features→Benefits→Testimonials→Pricing→FAQ→CTA template in order.",
        "Ask: is this sequence justified by the user's task? Consider editorial, product-first, utility-first, or docs-first structures.",
        4,
      ));
    }
    // Identical section rhythm: every section has heading+card+cta.
    const rhythmic = countRe(src, /<section/gi);
    if (rhythmic >= 4 && cards >= rhythmic * 2) {
      out.push(mk(
        "section-rhythm-identical", "medium", 0.55, `${rhythmic} <section> blocks, ${cards} cards`,
        "Every section follows the same heading→cards→CTA rhythm.",
        "Break the rhythm once: a full-bleed specimen, a data table, or a quiet text-only section.",
        4,
      ));
    }
  }

  return out;
}

function detectSections(src: string): string[] {
  // Pass 1: explicit section identifiers (most reliable).
  const ids: string[] = [];
  const idRe = /(?:id|data-section|aria-label)=["']([a-zA-Z-]+)["']/g;
  let im: RegExpExecArray | null;
  while ((im = idRe.exec(src)) !== null) {
    const name = im[1].trim().toLowerCase().replace(/\s+/g, "-");
    if (name && !["container", "wrapper", "section", "main", "root", "app"].includes(name)) ids.push(name);
    if (ids.length > 20) break;
  }
  if (ids.length >= 2) return ids;

  // Pass 2: structural <section> blocks with leading heading text.
  const out: string[] = [];
  const re = /<section[^>]*>\s*(?:<[A-Za-z]+[^>]*>)?\s*([A-Za-z ]{3,20})?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const name = (m[1] ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (name) out.push(name);
    if (out.length > 20) break;
  }
  // Fallback: heading-text heuristics.
  if (out.length === 0) {
    const heads = [...src.matchAll(/<(?:h1|h2)[^>]*>([^<]{3,40})<\//gi)].map((x) => x[1].trim().toLowerCase());
    for (const h of heads) {
      if (/price|plan/.test(h)) out.push("pricing");
      else if (/testimonial|review|love|customer/.test(h)) out.push("testimonials");
      else if (/feature|everything you/.test(h)) out.push("features");
      else if (/faq|question/.test(h)) out.push("faq");
      else if (/start|try|get started|cta/.test(h)) out.push("cta");
      else if (/hero|welcome|introducing/.test(h)) out.push("hero");
      else out.push("custom");
    }
  }
  return out;
}

function longestOrderedSubsequence(sections: string[], template: string[]): number {
  let ti = 0;
  let best = 0;
  let cur = 0;
  for (const s of sections) {
    const idx = template.indexOf(s, ti);
    if (idx !== -1) {
      cur += 1;
      ti = idx + 1;
      best = Math.max(best, cur);
    } else {
      const restart = template.indexOf(s);
      if (restart !== -1) {
        cur = 1;
        ti = restart + 1;
      } else cur = 0;
    }
  }
  return best;
}
