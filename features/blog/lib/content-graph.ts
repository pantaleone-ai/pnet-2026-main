import { getInventory } from "@/config/content/inventory";
import type { BlogPostType } from "@/features/blog/types/BlogPostType";

type Scored = { post: BlogPostType; score: number };

function score(current: BlogPostType, candidate: BlogPostType): number {
  if (candidate.slug === current.slug) return -1;
  let s = 0;
  const a = getInventory(current.slug);
  const b = getInventory(candidate.slug);
  // Same cluster is the strongest signal.
  if (a && b && a.cluster === b.cluster) s += 5;
  // Same pillar next.
  if (a && b && a.pillar === b.pillar) s += 3;
  // Shared tags / category as fallback for posts missing inventory rows.
  const aTags = new Set([...(current.tags ?? []), current.category ?? ""].map((t) => t.toLowerCase()));
  for (const t of [...(candidate.tags ?? []), candidate.category ?? ""]) {
    if (t && aTags.has(t.toLowerCase())) s += 1;
  }
  // Prefer evergreen/supporting over news for related slots.
  if (b && (b.class === "core-authority" || b.class === "supporting")) s += 1;
  return s;
}

/**
 * Contextual related posts. No link-count stuffing:
 * callers cap at 3-5 and render only when score > 0.
 */
export function getRelatedPosts(current: BlogPostType, all: BlogPostType[], limit = 4): BlogPostType[] {
  return (all.map((post) => ({ post, score: score(current, post) })) as Scored[])
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((s) => s.post);
}

/** One logical next step: best same-pillar post not in related set. */
export function getContinueReading(
  current: BlogPostType,
  all: BlogPostType[],
  excludeSlugs: string[] = [],
): BlogPostType | undefined {
  const excluded = new Set([current.slug, ...excludeSlugs]);
  const a = getInventory(current.slug);
  const ranked = all
    .filter((p) => !excluded.has(p.slug))
    .map((post) => ({ post, score: score(current, post) }) as Scored)
    .sort((x, y) => y.score - x.score);
  if (a) {
    const samePillar = ranked.find((r) => getInventory(r.post.slug)?.pillar === a.pillar);
    if (samePillar) return samePillar.post;
  }
  return ranked[0]?.post;
}
