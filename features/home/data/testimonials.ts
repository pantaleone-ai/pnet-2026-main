// Hallmark gate 46 — honest copy. The previous version shipped five invented
// quotes (Sarah Chen, Michael Rodriguez, Jennifer Walsh, David Kim,
// Lisa Thompson) with identical placeholder avatars and url="#".
// Removed 2026-09. The eBay feedback export was reviewed: 907 rows of
// marketplace shipping/payment notes (median 40 chars), none describing AI
// consulting work, so none is ported here. This list stays empty until a
// real buyer provides a named, linkable quote.

const TESTIMONIALS: Array<{
  authorAvatar: string;
  authorName: string;
  authorBio: string;
  url: string;
  quote: string;
}> = [];

export default TESTIMONIALS;
