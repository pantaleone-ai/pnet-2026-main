/**
 * Image/creative-prompt linter. Generic render-farming tokens
 * (cinematic, 8K, volumetric…) are contextual signals: allowed when
 * intentional, flagged when they substitute for art direction.
 */

import type { Finding } from "../types.js";

let seq = 0;
const nid = () => `img-${++seq}-${Date.now().toString(36)}`;

const GENERIC_TOKENS = [
  "cinematic", "ultra detailed", "ultra-detailed", "8k", "4k", "hyper realistic",
  "hyperrealistic", "dramatic lighting", "futuristic", "epic", "volumetric lighting",
  "glowing particles", "neon", "cyberpunk", "floating ui", "holographic",
  "trending on artstation", "octane render", "unreal engine",
];

/** Specificity anchors that prove intentional art direction. */
const ANCHORS = [
  /35mm|50mm|85mm|medium format|large format/i,                    // lens
  /rule of thirds|centered composition|dutch angle|aerial|eye-level/i, // composition
  /softbox|golden hour|overcast|tungsten|north light|rim light/i,  // lighting
  /brushed steel|matte ceramic|linen|concrete|glass|oak|denim/i,   // material
  /color palette|#[0-9a-f]{6}|pantone/i,                            // palette
  /brand|logo|style reference|moodboard|--sref/i,                   // references
  /shallow depth|f\/1\.\d|f\/8|long exposure|motion blur/i,         // exposure
];

export function analyzeImagePrompt(prompt: string): Finding[] {
  const out: Finding[] = [];
  const lower = prompt.toLowerCase();
  const hits = GENERIC_TOKENS.filter((t) => lower.includes(t));
  const anchorCount = ANCHORS.filter((re) => re.test(prompt)).length;
  const words = prompt.split(/\s+/).filter(Boolean).length;

  if (hits.length > 0) {
    // Intentional use with real art direction → low or no finding.
    if (anchorCount >= 2 && hits.length <= 2) {
      out.push({
        id: nid(), category: "image-prompt", severity: "low",
        location: hits.join(", "),
        pattern: "generic-render-tokens-intentional",
        explanation: `Generic tokens (${hits.join(", ")}) present but anchored by specific direction (${anchorCount} anchors) — likely intentional.`,
        suggested_action: "No change needed; keep the anchors.",
        confidence: 0.3, layer: 2,
      });
    } else {
      out.push({
        id: nid(), category: "image-prompt", severity: hits.length >= 4 ? "high" : "medium",
        location: hits.join(", "),
        pattern: "generic-render-tokens",
        explanation: `${hits.length} generic render-farming tokens (${hits.join(", ")}) with only ${anchorCount} specificity anchors — the prompt asks for "good image" instead of directing one.`,
        suggested_action: "Replace each generic token with a concrete choice: lens, composition, light source, material, palette, or reference.",
        confidence: Math.min(0.85, 0.5 + hits.length * 0.08 - anchorCount * 0.1), layer: 2,
      });
    }
  }

  if (words < 20 && hits.length > 0) {
    out.push({
      id: nid(), category: "image-prompt", severity: "medium",
      location: `prompt is ${words} words`,
      pattern: "prompt-too-thin",
      explanation: "Very short prompt leaning on generic tokens — under-directed generation.",
      suggested_action: "Add subject behavior, environment, composition, and one production constraint.",
      confidence: 0.65, layer: 3,
    });
  }

  // Blue/purple technology default.
  if (/blue|purple/.test(lower) && /technology|futuristic|ai|robot|digital/i.test(prompt) && anchorCount === 0) {
    out.push({
      id: nid(), category: "image-prompt", severity: "low",
      location: "blue/purple technology imagery",
      pattern: "default-tech-palette",
      explanation: "Default blue/purple 'technology' palette with no brand justification.",
      suggested_action: "Specify the brand palette or a motivated color story.",
      confidence: 0.55, layer: 2,
    });
  }

  return out;
}
