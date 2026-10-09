# Publish packet — syn-pin-drop-01 (Issue #86)

App: `synthetic-pics` / Platform: `pinterest` / Type: `pin` / Pillar: `discovery`

## Copy (paste to pinterest)
Hook: New drop: deep indigo abstract for calm rooms.
Body: Human-guided generative piece. See detail crops and room context in the gallery.
CTA: Explore the gallery
Framework: Interesting Result Why (result-why) — Result -> why it happened -> how to reproduce
Hashtags: max 5 specific, no generic hype

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=pinterest&utm_medium=organic_social&utm_campaign=SYN_PINT_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_DROP_PIN_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=pinterest` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_PINT_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_DROP_PIN_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Creative spec (gallery-only)
- Format: pin — Human-guided generative piece. See detail crops and room context in the gallery.
- Source asset: Gallery artwork page (real asset only, no generated imagery)
- Platform format: Evergreen pin, 1000x1500, keyword title + description, deep link
- CTA style: Explore / Shop / Read the recipe
- Creative: 1000x1500 pin, artwork hero plus detail crop (gallery artwork only)
- Publish endpoint (when credentialed): POST https://api.pinterest.com/v5/pins
- Media note: 1000x1500 pin, artwork hero plus detail crop

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to pinterest with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Explore the gallery
- Destination + UTM: verified above
- Creative: pin spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)
