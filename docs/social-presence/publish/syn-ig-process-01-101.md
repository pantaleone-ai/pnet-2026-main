# Publish packet — syn-ig-process-01 (Issue #101)

App: `synthetic-pics` / Platform: `instagram` / Type: `carousel` / Pillar: `build`

## Copy (paste to Instagram)
Hook: How this piece kept its grain at large sizes.
Body: Constraint, choice, and export note. Full piece in gallery.
CTA: See the result
Hashtags: max 5 specific, e.g. #generativeart #printmaking #artprocess

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=instagram&utm_medium=organic_social&utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610&utm_content=SYN_GRAIN_CAR_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_GRAIN_CAR_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/portfolio.ts`)

## Creative spec
- Format: carousel — detail crops plus settings note (grain at large sizes)
- Source asset: Process notes (real process only, no invented settings)
- Native Instagram carousel dimensions, minimal text on image
- Alt text per card describing crop + process choice

## Manual publish steps (owner)
1. Build cards from detail crops + export/settings note.
2. Post as Instagram carousel with copy above, link-in-bio / sticker to destination URL.
3. Screenshot published post + save post URL.
4. Report back: reach / profile visits / gallery clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: See the result
- Destination + UTM: verified above
- Creative: detail-crop spec + source asset noted
- Platform screenshot note: to be added after manual post (see steps 3-4)
