# Publish packet — syn-ig-room-01 (Issue #140)

App: `synthetic-pics` / Platform: `instagram` / Type: `carousel` / Pillar: `use-case`

## Copy (paste to instagram)
Hook: Calm walls: three pieces for quiet rooms.
Body: Nested squares, vaulted arches, concentric arcs — large-scale calm for hallways and bedrooms.
CTA: Save this artwork
Framework: Use Case Demo (use-case-demo) — Scenario -> demo -> outcome
Hashtags: #interiorart #homedecor #gallerywall #officedecor #artstyling

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=instagram&utm_medium=organic_social&utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_CALM_CAR_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_CALM_CAR_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Creative spec (gallery-only)
- Format: carousel — Nested squares, vaulted arches, concentric arcs — large-scale calm for hallways and bedrooms.
- Source asset: Gallery artworks: 2026-10-08-surface-spatial-abstraction-nested-squares-47845650, 2026-10-08-mineral-color-field-vaulted-arches-31694839, 2026-10-08-concrete-material-study-concentric-arcs-86044994 (real asset only, no generated imagery)
- Platform format: Reel concept or carousel, first-frame hook, 1 CTA in caption
- CTA style: Link in bio / Try it / See the result
- Creative: 2-10 public JPEG/PNG, carousel or reel-concept, minimal text on image, alt text per card
- Media note: 3-card carousel, one calming piece per card

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to instagram with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Save this artwork
- Destination + UTM: verified above
- Creative: carousel spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)

## Builder warnings
- hook does not match source artwork (surface spatial abstraction nested squares | mineral color field vaulted arches | concrete material study concentric arcs) — retitle to the actual piece
