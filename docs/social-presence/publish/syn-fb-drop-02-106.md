# Publish packet — syn-fb-drop-02 (Issue #106)

App: `synthetic-pics` / Platform: `facebook` / Type: `facebook-post` / Pillar: `product`

## Copy (paste to facebook)
Hook: Weekend drop: 3 warm minimal pieces.
Body: Short notes on each. Links to all three artworks.
CTA: Explore the gallery
Framework: Did You Know Insight (did-you-know) — Fact -> why it matters -> where to see it
Hashtags: max 5 specific, no generic hype

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=facebook&utm_medium=organic_social&utm_campaign=SYN_FB_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_WARM_FB_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=facebook` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_FB_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_WARM_FB_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Creative spec (gallery-only)
- Format: facebook-post — Short notes on each. Links to all three artworks.
- Source asset: Gallery artworks (real asset only, no generated imagery)
- Platform format: Single visual plus short useful caption, link post
- CTA style: Learn more / Shop the product
- Creative: single visual + short caption, link post to Destination URL
- Media note: 3-up grid

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
