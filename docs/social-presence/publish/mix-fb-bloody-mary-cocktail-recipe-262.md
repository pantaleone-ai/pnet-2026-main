# Publish packet — mix-fb-bloody-mary-cocktail-recipe (Issue #262)

App: `mixphd` / Platform: `facebook` / Type: `facebook-post` / Pillar: `how-to`

## Copy audit (advisory, non-blocking; enforced at publish/auto-approve)
pass (engine on): clean

## Copy (paste to facebook)
Hook: From the recipe box: Bloody Mary.
Body: Build a Bloody Mary with vodka, tomato, lemon, Worcestershire and Tabasco over ice.
CTA: Read the recipe
Framework: Did You Know Insight (did-you-know) — Fact -> why it matters -> where to see it
Hashtags: none (facebook stays clean)

## Destination + UTM
Full URL:
`https://www.mixphd.com/recipes/bloody-mary-cocktail-recipe?utm_source=facebook&utm_medium=organic_social&utm_campaign=MIX_FB_TRAFFIC_HOMEBAR_US_202610&utm_content=MIX_BLOODY_FB_V1`

Breakdown (verified against `lib/growth/utm.ts` + `lib/social-growth/social-utm.ts`):
- `utm_source=facebook` (platform)
- `utm_medium=organic_social` (social convention)
- `utm_campaign=MIX_FB_TRAFFIC_HOMEBAR_US_202610` — 6 segments: APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM
- `utm_content=MIX_BLOODY_FB_V1` — 4 segments: APP_CONCEPT_FORMAT_VARIANT
- Base domain matches registry: `https://www.mixphd.com` (`config/social-growth/product-matrix.ts`)

## Advertising angles (advisory, opt-in --angles; primary copy unchanged)
angles not requested (run with --angles)

## Paid variant (advisory, opt-in --paid; organic path unchanged)
paid variant not requested (run with --paid)

## Creative spec (gallery-only)
- Format: facebook-post — Build a Bloody Mary with vodka, tomato, lemon, Worcestershire and Tabasco over ice.
- Source asset: Recipe: bloody-mary-cocktail-recipe (real asset only, no generated imagery)
- Platform format: Single visual plus short useful caption, link post
- CTA style: Learn more / Shop the product
- Creative: single visual + short caption, link post to Destination URL
- Media note: Single 1200x630 visual (top crop, fresh framing), photo post

## Manual publish steps (owner)
1. Build creative from the source asset above (gallery artwork / recipe / product page only).
2. Post natively to facebook with copy above + destination link.
3. Screenshot published post + save post URL.
4. Report back: reach / saves / clicks (no fabricated stats).

## Evidence for close
- Hook: present (see Copy)
- CTA: Read the recipe
- Destination + UTM: verified above
- Creative: facebook-post spec + source asset noted
- Platform screenshot note: to be added after auto/manual post (see steps above)

## Builder warnings
- facebook needs a per-post visual: build 1200x630 public/fb/mix-fb-bloody-mary-cocktail-recipe-262/1.jpg from the source artwork (or stamp **Images:**), then re-run
