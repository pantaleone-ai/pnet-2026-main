# Publish packet — mix-ig-bloody-mary-cocktail-recipe (Issue #261)

App: `mixphd` / Platform: `instagram` / Type: `photo` / Pillar: `discovery`

## Copy audit (advisory, non-blocking; enforced at publish/auto-approve)
pass (engine on): clean

## Copy (paste to instagram)
Hook: From the recipe box: Bloody Mary.
Body: Build a Bloody Mary with vodka, tomato, lemon, Worcestershire and Tabasco over ice.
CTA: Read the recipe
Framework: Drop Showcase (drop-showcase) — What it is -> who it fits -> where to find it
Hashtags: #generativeart #abstractart #wallart

## Destination + UTM
Full URL:
`https://www.mixphd.com/recipes/bloody-mary-cocktail-recipe?utm_source=instagram&utm_medium=organic_social&utm_campaign=MIX_IG_TRAFFIC_HOMEBAR_US_202610&utm_content=MIX_BLOODY_IG_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=instagram` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=MIX_IG_TRAFFIC_HOMEBAR_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=MIX_BLOODY_IG_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.mixphd.com` (`config/social-growth/product-matrix.ts`)

## Advertising angles (advisory, opt-in --angles; primary copy unchanged)
angles not requested (run with --angles)

## Paid variant (advisory, opt-in --paid; organic path unchanged)
paid variant not requested (run with --paid)

## Creative spec (gallery-only)
- Format: photo — Build a Bloody Mary with vodka, tomato, lemon, Worcestershire and Tabasco over ice.
- Source asset: Recipe: bloody-mary-cocktail-recipe (real asset only, no generated imagery)
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
- CTA: Read the recipe
- Destination + UTM: verified above
- Creative: photo spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)
