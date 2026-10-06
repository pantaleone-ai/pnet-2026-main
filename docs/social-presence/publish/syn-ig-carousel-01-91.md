# Publish packet — syn-ig-carousel-01 (Issue #91)

App: `synthetic-pics` / Platform: `instagram` / Type: `carousel` / Pillar: `comparison`

## Copy (paste to Instagram)
Hook: Same prompt family, 3 directions. Which fits your wall?
Body: Swipe for warm, cool, and monochrome takes. Links to each artwork.
CTA: Explore the gallery
Hashtags: max 5 specific, e.g. #generativeart #abstractart #wallart

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=instagram&utm_medium=organic_social&utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_STYLE_CAR_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_STYLE_CAR_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/portfolio.ts`)

## Creative spec
- Format: 3-card carousel, one style per card (warm / cool / monochrome)
- Source asset: Gallery artworks (real artwork only, no generic AI imagery)
- Native Instagram carousel dimensions, minimal text on image
- Alt text per card describing style + link to artwork

## Manual publish steps (owner)
1. Build 3 cards from live gallery pieces in same prompt family.
2. Post as Instagram carousel with copy above, link-in-bio / sticker to destination URL.
3. Screenshot published post + save post URL.
4. Report back: reach / profile visits / gallery clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Explore the gallery
- Destination + UTM: verified above
- Creative: 3-card spec + source asset noted
- Platform screenshot note: to be added after manual post (see steps 3-4)
