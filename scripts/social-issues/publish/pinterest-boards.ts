// Synthetic.pics Pinterest board map (public boards, created 2026-10-29).
// Commercial strategy: sell art (boards 1-2), inspire creation (3-6),
// establish visual identity (7-8). Products board (PROTECTED, pre-existing)
// stays untouched — catalog/shopping surface, not organic distribution.
export interface PinterestBoard {
  key: string;
  id: string;
  name: string;
}

export const SYNTHETIC_PINTEREST_BOARDS: PinterestBoard[] = [
  { key: "generative", id: "1099089552752760024", name: "Generative Art & Abstract Art" },
  { key: "decor", id: "1099089552752760025", name: "Modern Wall Art & Home Decor" },
  { key: "monochrome", id: "1099089552752760026", name: "Minimalist & Monochrome Art" },
  { key: "surreal", id: "1099089552752760027", name: "Surreal & Experimental Digital Art" },
  { key: "moodboards", id: "1099089552752760028", name: "Art Inspiration & Creative Moodboards" },
  { key: "motion", id: "1099089552752760029", name: "AI Art & Image-to-Video Experiments" },
  { key: "custom", id: "1099089552752760030", name: "Custom Art Galleries & Collections" },
  { key: "editions", id: "1099089552752760031", name: "Synthetic.pics Exhibitions & Artist Editions" },
];

/** Pillar -> board fallback for site:synthetic-pics (explicit Board/CLI/env wins). */
export function boardForPillar(pillar: string): string {
  const p = pillar.trim().toLowerCase();
  if (p === "use-case") return "1099089552752760025";
  if (p === "discovery") return "1099089552752760028";
  if (p === "social-proof") return "1099089552752760031";
  return "1099089552752760024";
}
