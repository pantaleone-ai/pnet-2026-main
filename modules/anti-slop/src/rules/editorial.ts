/**
 * Editorial title/heading rules — full port of scripts/editorial-audit.py
 * structural checks (titles, first-heading rule). Operates on ORIGINAL markdown
 * (frontmatter intact), not the protected analyzed text.
 *
 * All findings soft (medium/low): title/heading issues never fail standard
 * builds; strict mode may fail via the quality-gate checklist.
 */

import type { Finding, ProjectProfile, Severity } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function edFinding(
  pattern: string,
  severity: Severity,
  confidence: number,
  location: string,
  explanation: string,
  action: string,
): Finding {
  return {
    id: nid("ed"),
    category: "structure",
    severity,
    location,
    pattern,
    explanation,
    suggested_action: action,
    confidence,
    layer: 3,
  };
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[*_`#]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function headingSimilarity(title: string, heading: string): number {
  const t = normalizeHeading(title);
  const h = normalizeHeading(heading);
  if (!t || !h) return 0;
  if (t === h) return 1;
  if (h.startsWith(t) || t.startsWith(h)) return 1;
  const titleWords = new Set(t.split(" "));
  const headingWords = h.split(" ");
  if (headingWords.length === 0) return 0;
  const overlap = headingWords.filter((w) => titleWords.has(w)).length;
  return overlap / headingWords.length;
}

function parseFrontmatter(input: string): { title?: string; description?: string; body: string } {
  const m = /^---\n([\s\S]*?)\n---/.exec(input);
  if (!m) return { body: input };
  const fm = m[1];
  const body = input.slice(m[0].length);
  const pick = (key: string): string | undefined => {
    const mm = new RegExp(`^${key}:\\s*(.+?)(?=\\n\\w|$)`, "ms").exec(fm + "\n");
    if (!mm) return undefined;
    return mm[1].trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
  };
  return { title: pick("title"), description: pick("description"), body };
}

function firstBodyHeading(body: string): { level: "#" | "##" | "###" | null; heading: string | null } {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  for (const line of stripped.split("\n")) {
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (m) return { level: m[1] as "#" | "##" | "###", heading: m[2] };
  }
  return { level: null, heading: null };
}

export function analyzeEditorial(input: string, project?: ProjectProfile): Finding[] {
  const out: Finding[] = [];
  const allow = new Set((project?.allowlist ?? []).map((a) => a.toLowerCase()));
  const titleRules = {
    stuffers: project?.titleRules?.stuffers ?? ["free ", "ultimate", "modern ", "official", "production-ready"],
    openerBan: project?.titleRules?.openerBan ?? ["the ultimate", "the complete", "a comprehensive", "the definitive", "everything you need to know"],
    genericHeadings: project?.titleRules?.genericHeadings ?? ["introduction", "overview", "summary", "conclusion", "background", "preface"],
    maxSimilarity: project?.titleRules?.maxSimilarity ?? 0.8,
  };

  const { title, description, body } = parseFrontmatter(input);
  // Only run title/heading checks when frontmatter exists (markdown posts).
  if (!title && !description) return out;

  if (title) {
    const low = title.toLowerCase();
    if (!allow.has("title-stuffer")) {
      for (const st of titleRules.stuffers) {
        if (low.includes(st.toLowerCase())) {
          out.push(edFinding(
            "title-stuffer", "medium", 0.65, `title: "${title.slice(0, 80)}"`,
            `Title stuffs "${st.trim()}" — stack keyword that weakens the title.`,
            "Use the actual product/post name; move stack terms to metadata.",
          ));
          break;
        }
      }
    }
    if (!allow.has("banned-title-opener")) {
      for (const op of titleRules.openerBan) {
        if (low.startsWith(op.toLowerCase())) {
          out.push(edFinding(
            "banned-title-opener", "medium", 0.7, `title: "${title.slice(0, 80)}"`,
            `Title opens with banned "${op}" — listicle/SEO-farm framing.`,
            "Rewrite specific and direct: subject + useful angle.",
          ));
          break;
        }
      }
    }
  }

  if (description && project?.budgets?.description && !allow.has("description-budget")) {
    const [min, max] = project.budgets.description;
    const n = description.split(/\s+/).filter(Boolean).length;
    if (n < min || n > max) {
      out.push(edFinding(
        "description-budget", "low", 0.55, `description: ${n} words (budget ${min}–${max})`,
        `Excerpt is ${n} words; budget is ${min}–${max}.`,
        n < min ? "Add one concrete detail (outcome, scope, or reader)." : "Cut to one specific promise plus scope.",
      ));
    }
  }

  // First-body-heading rule (blog posts): distinct ##, not H1/generic/duplicate.
  if (title) {
    const { level, heading } = firstBodyHeading(body);
    if (!heading || !level) {
      if (!allow.has("missing-body-heading")) {
        out.push(edFinding(
          "missing-body-heading", "medium", 0.6, `title: "${title.slice(0, 80)}"`,
          "No body heading found — the body must open with a distinct ##.",
          "Open the body with a distinct ## that builds on the title (new angle, outcome, or scope).",
        ));
      }
    } else {
      if (level === "#" && !allow.has("body-opens-with-h1")) {
        out.push(edFinding(
          "body-opens-with-h1", "medium", 0.6, `heading: "${heading.slice(0, 80)}"`,
          "Body opens with # but the frontmatter title already renders as the page H1.",
          "Demote to ## and make it build on the title.",
        ));
      }
      if (titleRules.genericHeadings.includes(normalizeHeading(heading)) && !allow.has("generic-first-heading")) {
        out.push(edFinding(
          "generic-first-heading", "medium", 0.6, `heading: "${heading.slice(0, 80)}"`,
          `Generic first heading "${heading.trim()}" adds no information.`,
          "Write a specific ## that builds on the title.",
        ));
      }
      if (headingSimilarity(title, heading) >= titleRules.maxSimilarity && !allow.has("title-heading-duplicate")) {
        out.push(edFinding(
          "title-heading-duplicate", "medium", 0.65, `title: "${title.slice(0, 60)}" / heading: "${heading.slice(0, 60)}"`,
          "First heading repeats the title instead of building on it.",
          "Rewrite the ## with a new angle, outcome, or scope.",
        ));
      }
    }
  }

  return out;
}
