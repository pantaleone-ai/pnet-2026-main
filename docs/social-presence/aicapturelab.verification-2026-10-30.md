# AICaptureLab — Meta Page verification (2026-10-30)

No secrets in this file. Token referenced as `EAA...[withheld, session-only]`.
Source: `META_CAPI_ACCESS_TOKEN` from `.env.local` (same value as GitHub Actions secret). NOT n8n — n8n has zero `meta/face/insta` creds (verified via credential search).

Input: `https://business.facebook.com/latest/home?business_id=1585449385175210&asset_id=1321587721048928`

## Handshake (read-only, zero writes)

- `GET /me/accounts?fields=id,name,link&limit=50` → 7 pages:
  `Imgsquash.com (1432709709918097)`, `Aiceo.io (1329336636935220)`,
  `ProSwing.net (1375884918941400)`, `ProfitSignals.xyz (1426976343825434)`,
  `Mixphd (1398289563357130)`, `Synthetic.pics (1423764057476870)`,
  `Pantaleone.net - AI Tech & Business Automation (101092449202509)`.
  **Target `1321587721048928` NOT in list → no API access yet.**
- `GET /1321587721048928?fields=id,name,link,fan_count` → 400 code 10:
  `This endpoint requires the 'pages_read_engagement' permission or the 'Page Public Content Access' feature...`
- `GET /1321587721048928` with app token (`META_APP_ID|META_CLIENT_TOKEN`) → 400 code 100 same permission gate.
- `GET /1585449385175210?fields=id,name,link` → `{"id":"1585449385175210","name":"m pantaleone"}` — business resolves.
- `GET /me/businesses` → `{"data":[]}` — system user has no business assignment.

Conclusion: page exists under business `m pantaleone` but the System User behind `META_CAPI_ACCESS_TOKEN` has not been granted the asset. Same grant needed for GitHub CI (secret mirror).

## Owner grant (5 min, Business Settings UI-only)

1. `business.facebook.com` → Business `m pantaleone (1585449385175210)` → Settings → Accounts → Pages → Add → paste `1321587721048928` (AICaptureLab) if not already listed.
2. Same screen → assign People/System Users: Conversions-API System User + `master-orchestrator` app (`1813881459926833`) → enable `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
3. Re-run: `GET /me/accounts` should then list `1321587721048928`; then `GET /1321587721048928?fields=instagram_business_account` for IG handshake.
4. Only after handshake succeeds, add to `scripts/social-issues/publish/accounts.ts` per file rule (no pre-add):
   `{ site: "aicapturelab", pageId: "1321587721048928", pageName: "AICaptureLab" }` (+ ig fields if linked).

## Seed — copy/paste ready (per social plan, owner confirms before apply)

Grounded in: `config/social-growth/product-matrix.ts` (`aicapturelab`: sellers needing product photos without a shoot; virtual photography from single input photo; CTA Generate now / See the transformation), `platform-matrix.ts` (FB = secondary, single visual + short useful caption, link post), `tiers.ts` (Tier 2, 1/wk, Wed 19:00 ET window), site live copy 2026-10-30 (36 scenes, 3 free shoots, no prompting, 3-step Upload→Choose→Generate), `_system.md` §5 (no "Welcome to our page!").

- Name: `AICaptureLab`
- Username/handle (claim if free): `@aicapturelab`
- Category: Product/Service (alt: Photography service)
- Website: `https://www.aicapturelab.com/`
- CTA button: Shop Now / Learn More → `https://www.aicapturelab.com/?utm_source=facebook&utm_medium=organic_social&utm_campaign=LAB_FB_DISCOVERY_SELLERS_US_202610`
- Short bio / About (WHAT+WHO+BENEFIT, no banned words):
  `Virtual product photography for sellers. Turn one phone photo into listing-ready shots — pick a scene, no studio.`
- Long description (About → Our Story):
  `AICaptureLab helps sellers create listing-ready product photos without a studio shoot. Upload one photo, choose from 36 scenes, generate the shot. 3 free shoots to try, no prompting. Built for stores, websites, and campaigns. Start: aicapturelab.com/studio`
- Profile image: `aicl-logo-sml-trans.avif` logo on light, ≥170×170.
- Cover: homepage before/after (`/api/homepage/media/before-after.webp` — field jacket phone photo → outdoor campaign look), text-free, safe-area centered.
- Pinned orientation post (WHAT→WHO→WHY→NEXT):
  Hook: `Phone photo left. Studio look right.`
  Body: `AICaptureLab turns one upload into store-ready shots for sellers. 36 scenes, 3 free tries.`
  CTA: `See the transformation` + link `https://www.aicapturelab.com/?utm_source=facebook&utm_medium=organic_social&utm_campaign=LAB_FB_ACTIVATION_SELLERS_US_202610&utm_content=LAB_PINNED_BA_V1`
  Creative: before/after same framing (jacket or skincare stone-pedestal example).

Starter queue (Tier 2 = 1/wk, Wed 19:00 ET; FB secondary = useful, not cross-posted IG):

1. `aicl-fb-input-output-01` (pillar proof): Hook `Candle sellers: white sweep without a studio.` Body `One input photo to listing-ready shot.` CTA `Generate now` → `/studio?utm_source=facebook&utm_medium=organic_social&utm_campaign=LAB_FB_ACTIVATION_SELLERS_US_202610&utm_content=LAB_CANDLE_BA_V1`. Visual: candle before/after pin crop 1200×630.
2. `aicl-fb-niche-01` (pillar use-case): Hook `Skincare bottle, morning-light tray — no shoot day.` Body `Pick the scene, keep label and shape true.` CTA `See the transformation` → `/?utm_source=facebook...&utm_content=LAB_SKIN_BA_V1`. Visual: serum-on-stone example.

## Retry 2026-10-30 (access granted, writes applied)

- `GET /me/accounts` now lists 8 pages including `AICaptureLab.com (1321587721048928)` — owner grant confirmed.
- `GET /1321587721048928?fields=id,name,link,fan_count,followers_count,verification_status` → `{"id":"1321587721048928","name":"AICaptureLab.com","fan_count":0,"followers_count":0,"verification_status":"not_verified"}`. Category `Photo Editing Service`. `about/description/website` were empty, `instagram_business_account` null (FB-only for now).
- `POST /1321587721048928` with page token → `{"success":true}` for `about`, `description`, `website`. Re-read confirms stored values below.

## Applied (API writes, all `{"success":true}`, re-read back)

- **AICaptureLab.com (`1321587721048928`)** — was empty (no about/description/website):
  - `about` → `Virtual product photography for sellers. Turn one phone photo into listing-ready shots - pick a scene, no studio.`
  - `description` → `AICaptureLab helps sellers create listing-ready product photos without a studio shoot. Upload one photo, choose from 36 scenes, generate the shot. 3 free shoots to try, no prompting. Built for stores, websites, and campaigns. Start: https://www.aicapturelab.com/studio`
  - `website` → `https://www.aicapturelab.com/`
  - `name` kept as `AICaptureLab.com` (matches domain branding; rename is owner UI-only if you prefer `AICaptureLab`).
  - `category` kept as `Photo Editing Service` (correct).

Zero posts made by this check. Profile picture + cover + CTA button + pinned post remain owner/UI or publisher-pipeline steps (see seed above).

## Owner tasks remaining (not API-possible)

- [ ] Upload profile image (logo) + cover (before/after) in Page Settings.
- [ ] Set CTA button (Shop Now / Learn More) → `https://www.aicapturelab.com/` with FB UTM.
- [ ] Publish pinned orientation post via `publish-due` once visuals are ready.
- [ ] Link Instagram account (Page Settings → Linked accounts) when IG handle is claimed — currently FB-only, IG guards skip until linked.

- `SITE_ACCOUNTS`: added `{ site: "aicapturelab", pageId: "1321587721048928", pageName: "AICaptureLab.com" }` FB-only (no IG yet). `publish-due --dry-run` now serves FB for this site.

## Initial content seeding 2026-10-30 (3 posts live, user-approved)

Pipeline note: `scripts/social-issues/publish/facebook.ts` supports photo posts only - no Reels path. Seeded via Graph API directly (3-step Reels flow: `POST /{page}/video_reels upload_phase=start` -> `POST rupload file_url` -> `POST finish PUBLISHED`).

- Reel 1 backpack (720x1280 9:16, 10s, H264): `file_url https://www.aicapturelab.com/api/homepage/media/backpack-720p.mp4` -> `video_id 1117831811018792` -> `post_id 122093157717543326` (`success:true`, Video is Processing). Desc ends `...&utm_content=LAB_BACKPACK_REEL_V1`.
- Reel 2 demo (720x1472, 69s): `file_url https://www.aicapturelab.com/api/homepage/media/demo-720p.mp4` -> `video_id 1378179900825827` -> `post_id 122093157867543326`. Desc ends `...&utm_content=LAB_DEMO_REEL_V1`.
- Photo orientation (pinned candidate): `POST /1321587721048928/photos` with `backpack-poster.jpg` -> `post_id 1321587721048928_122093158383543326`, permalink `https://www.facebook.com/122093158431543326/posts/122093158383543326`.
  Note: HEAD on `aicapturelab.com/api/homepage/media/*` returns 403 but Meta GET-fetch succeeded. Future per-post FB visuals should still be built as 1200x630 cards under `public/fb/` and verified 200 per pipeline (`selectFbImage` JPEG/PNG rule).
- Rate limit: 2/30 Reels per 24h used. Reels permalinks resolve after processing (video_reels has no read edge; post_ids above are the proof).

## Bulk seeding 2026-10-30 (6 more posts, user-approved: all videos + 4 scenes)

- Video jacket (1280x720 landscape, 10s — published as Page video, not Reel): `file_url jacket-720p.mp4` -> `video id 975418258957434` (`/reel/975418258957434/`). Title `Field jacket - phone photo to outdoor campaign look`, desc ends `LAB_JACKET_VIDEO_V1`.
- Video silver-ring (1280x720, 10s — Page video): `file_url silver-ring-720p.mp4` -> `video id 925613117149010`. Desc ends `LAB_RING_VIDEO_V1`.
- Photo skincare: `example-premium-skincare.jpg` (200 JPEG 477KB) -> `post 1321587721048928_122093163027543326`, permalink `https://www.facebook.com/122093158431543326/posts/122093163027543326`, `LAB_SKIN_PHOTO_V1`.
- Photo clean-ecommerce: `example-clean-ecommerce.jpg` (101KB) -> `post 1321587721048928_122093163237543326`, `LAB_CLEAN_PHOTO_V1`.
- Photo luxury-fragrance: `example-luxury-fragrance.jpg` (388KB) -> `post 1321587721048928_122093163843543326`, `LAB_FRAG_PHOTO_V1`.
- Photo lipstick-macro: `lipstick-color-macro.jpg` (419KB) -> `post 1321587721048928_122093164005543326`, `LAB_LIP_PHOTO_V1`.
- Page total after this batch: 9 posts (2 Reels + 2 Page videos + 5 photos including orientation). All copy: hook + 1-sentence body + CTA + UTM link, FB zero hashtags, no banned words.

## Instagram seeding 2026-10-30 (3 posts live, user-approved)

- Link test: `GET /1321587721048928?fields=instagram_business_account` -> `17841454251054008`; `GET /17841454251054008` -> `username aicapturelab`, `name AICaptureLab.com`, 0 followers, 0 media (brand-new). Note: handle is `@aicapturelab` (not `aicapturelab.com`).
- IG publisher supports photo (1 image) + carousel (2-10) only — no Reels/video path. Images must be public JPEG/PNG.
- Carousel range (skincare + clean + fragrance): container `18007084043808369` -> media `17999345970012744`, permalink `https://www.instagram.com/p/DfIZnVKgRPu/`, `LAB_RANGE_CAR_V1`.
- Photo backpack lifestyle: media `17918417025265897`, permalink `https://www.instagram.com/p/DfIZqlqAcWB/`, `LAB_PACK_PHOTO_V1`.
- Photo lipstick macro: media `17908282188668271`, permalink `https://www.instagram.com/p/DfIZrlpgeFc/`, `LAB_LIP_IG_V1`.
- `SITE_ACCOUNTS`: added `igUserId 17841454251054008` / `igUsername aicapturelab` — `publish-due --due --channel instagram --site aicapturelab` now serves IG. IG bio/link-in-bio edits are app-only (no Graph endpoint) — owner sets bio link to `https://www.aicapturelab.com/` in the app.
