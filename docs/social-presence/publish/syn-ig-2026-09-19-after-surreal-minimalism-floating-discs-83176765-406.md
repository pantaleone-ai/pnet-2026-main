# Publish packet — syn-ig-2026-09-19-after-surreal-minimalism-floating-discs-83176765 (Issue #406)

App: `synthetic-pics` / Platform: `instagram` / Type: `photo` / Pillar: `discovery`

## Copy audit (advisory, non-blocking; enforced at publish/auto-approve)
pass (engine on): clean

## Copy (paste to instagram)
Hook: From the archive: After surreal minimalism.
Body: Returns to the gallery after a short rest.
CTA: Explore the gallery
Framework: Drop Showcase (drop-showcase) — What it is -> who it fits -> where to find it
Hashtags: #generativeart #abstractart #wallart

## Destination + UTM
Full URL:
`https://www.synthetic.pics?utm_source=instagram&utm_medium=organic_social&utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202611&utm_content=SYN_AFTER_IG_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=SYN_IG_DISCOVERY_ARTBUYERS_US_202611` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=SYN_AFTER_IG_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.synthetic.pics` (`config/social-growth/product-matrix.ts`)

## Tracking block (taxonomy v1, enforced by social-audit layer 8)
- `campaign_id=SYN_IG_DISCOVERY_ARTBUYERS_US_202611` (must equal utm_campaign)
- `content_id=syn-ig-2026-09-19-after-surreal-minimalism-floating-discs-83176765` / creative `SYN_AFTER_IG_V1` (must equal utm_content)
- `platform_group` per `platformGroupFor(instagram)`, `funnel_stage` per `funnelStageFor(discovery)`, `taxonomy_version=v1`
- GA4 join: `utm_campaign` → campaign_id, `utm_content` → content_id (custom dimensions, see docs/TAXONOMY.md §6)

## Advertising angles (advisory, opt-in --angles; primary copy unchanged)
angles not requested (run with --angles)

## Paid variant (advisory, opt-in --paid; organic path unchanged)
paid variant not requested (run with --paid)

## Creative spec (gallery-only)
- Format: photo — Returns to the gallery after a short rest.
- Source asset: Gallery artwork: 2026-09-19-after-surreal-minimalism-floating-discs-83176765 (real asset only, no generated imagery)
- Platform format: Reel concept or carousel, first-frame hook, 1 CTA in caption
- CTA style: Link in bio / Try it / See the result
- Creative: 2-10 public JPEG/PNG, carousel or reel-concept, minimal text on image, alt text per card
- Media note: Single 1080x1350 visual (top crop, fresh framing), native IG photo post

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to instagram with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Explore the gallery
- Destination + UTM: verified above
- Creative: photo spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)
