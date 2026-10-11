# Publish packet — syn-ig-compare-02 (Issue #141)

App: `synthetic-pics` / Platform: `instagram` / Type: `carousel` / Pillar: `comparison`

## Copy (paste to instagram)
Hook: Ochre vs smoke vs violet: which palette owns the room?
Body: Three color stories from the archive. Same wall, three temperatures. Vote with a save.
CTA: Explore the gallery
Framework: Problem to Solution (problem-solution) — Problem (1 line) -> fix (1 line) -> result (1 line)
Hashtags: #generativeart #abstractart #wallart #artvsart #designinspiration

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=instagram&utm_medium=organic_social&utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_TONE_CAR_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_TONE_CAR_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Creative spec (gallery-only)
- Format: carousel — Three color stories from the archive. Same wall, three temperatures. Vote with a save.
- Source asset: Gallery artworks: 2026-10-03-centered-ochre-marks-monochromatic-study-constellation-signs-90876461, 2026-10-03-smoke-square-generative-geometry-black-mass-2848948, 2026-09-30-layered-violet-forms-conceptual-minimalism-flowing-contours-26634661 (real asset only, no generated imagery)
- Platform format: Reel concept or carousel, first-frame hook, 1 CTA in caption
- CTA style: Link in bio / Try it / See the result
- Creative: 2-10 public JPEG/PNG, carousel or reel-concept, minimal text on image, alt text per card
- Media note: 3-card carousel, one palette per card

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to instagram with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Explore the gallery
- Destination + UTM: verified above
- Creative: carousel spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)
