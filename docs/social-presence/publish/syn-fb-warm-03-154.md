# Publish packet — syn-fb-warm-03 (Issue #154)

App: `synthetic-pics` / Platform: `facebook` / Type: `facebook-post` / Pillar: `product`

## Copy (paste to facebook)
Hook: Ochre field: warmth for calm shelves.
Body: Branching filaments in ochre over warm ground. A quiet statement piece.
CTA: Explore the gallery
Framework: Did You Know Insight (did-you-know) — Fact -> why it matters -> where to see it
Hashtags: none (facebook stays clean)

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=facebook&utm_medium=organic_social&utm_campaign=SYN_FB_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_OCHRE_FB_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=facebook` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_FB_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_OCHRE_FB_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Creative spec (gallery-only)
- Format: facebook-post — Branching filaments in ochre over warm ground. A quiet statement piece.
- Source asset: Gallery artwork: 2026-09-11-ochre-field-architectural-abstraction-branching-filaments-42985404 (real asset only, no generated imagery)
- Platform format: Single visual plus short useful caption, link post
- CTA style: Learn more / Shop the product
- Creative: single visual + short caption, link post to Destination URL
- Media note: Single 1200x630 visual + short caption, photo post

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to facebook with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Explore the gallery
- Destination + UTM: verified above
- Creative: facebook-post spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)
