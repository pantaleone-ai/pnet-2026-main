/**
 * Caption optimizer for synthetic.pics Meta publishing (pure, extractable).
 *
 * Conventions (from docs/social-presence/_system.md):
 * - Hashtags: 0-5, specific, never generic hype.
 * - No engagement bait, no invented claims, artwork stays the hero.
 * - One CTA per post; CTA style comes from the platform matrix.
 */

export type CaptionPlatform = "instagram" | "facebook";

const MAX_HASHTAGS = 5;

/** Platform CTA styles (mirrors config/social-growth/platform-matrix.ts). */
export const PLATFORM_CTA_STYLE: Record<CaptionPlatform, string[]> = {
  instagram: [
    "Explore the gallery",
    "Save this artwork",
    "See the result",
    "Try it",
  ],
  facebook: ["Explore the gallery", "Learn more", "Shop the product"],
};

/** Pillar -> specific hashtag pool. Curated, art-led, no generic hype. */
export const HASHTAG_POOLS: Record<string, string[]> = {
  discovery: [
    "generativeart",
    "abstractart",
    "wallart",
    "artcollectors",
    "contemporaryart",
  ],
  comparison: [
    "generativeart",
    "abstractart",
    "wallart",
    "artvsart",
    "designinspiration",
  ],
  portfolio: [
    "generativeart",
    "artgallery",
    "wallart",
    "interiorart",
    "artforsale",
  ],
  education: [
    "arttips",
    "generativeart",
    "artprocess",
    "learnart",
    "creativetools",
  ],
  "how-to": ["arttips", "artprocess", "printmaking", "generativeart", "diyart"],
  product: ["artprint", "homedecor", "wallart", "giftideas", "artforsale"],
  proof: [
    "artcollectors",
    "gallerywall",
    "interiorart",
    "artforsale",
    "testimonialfree",
  ],
  insight: [
    "artmarket",
    "generativeart",
    "arttrends",
    "collectorscorner",
    "artresearch",
  ],
  "use-case": [
    "interiorart",
    "homedecor",
    "gallerywall",
    "officedecor",
    "artstyling",
  ],
  build: [
    "artprocess",
    "behindthescenes",
    "generativeart",
    "creativecoding",
    "workinprogress",
  ],
  default: [
    "generativeart",
    "abstractart",
    "wallart",
    "artgallery",
    "contemporaryart",
  ],
};

/** Banned: generic hype (voice rules) + engagement bait. Case-insensitive. */
export const BANNED_PHRASES: string[] = [
  "future of",
  "revolutionizing",
  "game-changing",
  "cutting-edge",
  "unlock the",
  "like and share",
  "tag a friend",
  "tag someone",
  "comment below",
  "follow for more",
  "viral",
  "everyone is talking",
  "you won't believe",
];

/** Banned hashtags (generic / bait / overused). */
export const BANNED_HASHTAGS = new Set([
  "art",
  "love",
  "instagood",
  "photooftheday",
  "viral",
  "follow",
  "like4like",
  "ai",
  "aiart",
]);

export interface CaptionInput {
  hook: string;
  body: string;
  cta: string;
  destinationUrl: string;
  platform: CaptionPlatform;
  pillar?: string;
  hashtags?: string[];
}

export interface CaptionLint {
  ok: boolean;
  violations: string[];
}

/** Suggest up to 5 specific hashtags for a pillar. Falls back to default pool. */
export function suggestHashtags(
  pillar: string | undefined,
  wanted?: string[],
): string[] {
  const pool: string[] =
    HASHTAG_POOLS[pillar ?? ""] ?? HASHTAG_POOLS.default ?? [];
  const picks = (wanted ?? [])
    .map((t) => t.replace(/^#/, "").toLowerCase())
    .filter(Boolean);
  const tags: string[] = [];
  for (const tag of [...picks, ...pool]) {
    const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!clean || BANNED_HASHTAGS.has(clean) || tags.includes(clean)) continue;
    tags.push(clean);
    if (tags.length >= MAX_HASHTAGS) break;
  }
  return tags;
}

/** Lint caption text + tags against voice/quality rules. */
export function lintCaption(text: string, hashtags: string[]): CaptionLint {
  const violations: string[] = [];
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) violations.push(`banned phrase: "${phrase}"`);
  }
  if (hashtags.length > MAX_HASHTAGS)
    violations.push(
      `too many hashtags: ${hashtags.length} (max ${MAX_HASHTAGS})`,
    );
  for (const tag of hashtags) {
    if (BANNED_HASHTAGS.has(tag.toLowerCase()))
      violations.push(`banned hashtag: #${tag}`);
  }
  if (!text.trim()) violations.push("empty caption");
  return { ok: violations.length === 0, violations };
}

/**
 * Build the post caption: hook, body, CTA + destination, hashtags last.
 * Instagram gets hashtags (discovery surface); Facebook stays clean + link.
 */
export function buildCaption(input: CaptionInput): {
  text: string;
  hashtags: string[];
  lint: CaptionLint;
} {
  const tags =
    input.platform === "instagram"
      ? suggestHashtags(input.pillar, input.hashtags)
      : [];
  const lines = [
    input.hook,
    "",
    input.body,
    "",
    `${input.cta}: ${input.destinationUrl}`,
  ];
  if (tags.length > 0) lines.push("", tags.map((t) => `#${t}`).join(" "));
  const text = lines.join("\n");
  return { text, hashtags: tags, lint: lintCaption(text, tags) };
}
