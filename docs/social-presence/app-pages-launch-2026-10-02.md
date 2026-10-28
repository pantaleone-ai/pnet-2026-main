# App Pages Launch — Baseline Publish (2026-10-02)

Baseline for 4 app Facebook pages: info + 1 live orientation post + 3 scheduled
drip posts each (fires Oct 4 / 6 / 9). No secrets in this file. Token handling:
system-user token from env, per-page tokens in-memory only.

Method follows `docs/social-presence/_system.md` (bio WHAT+WHO+BENEFIT, 1 CTA
per post, UTM `utm_source=facebook&utm_medium=organic_social&utm_campaign=launch`,
no banned words) and the synthetic.pics precedent (verify every write by re-read).

## Starting state (all 4, verified via Graph API v21.0)

Blank: no about/description/website, silhouette profile pic, no cover, 0 posts,
all `is_published:true`. Categories kept: Mixphd=Food & Drink,
ProfitSignals.xyz=Software Company, ProSwing.net=Software, Aiceo.io=Software.

## Page info applied (all `{"success":true}`, read back)

| Page | about | website |
| ---- | ----- | ------- |
| Mixphd | Drink recipes by ingredient or occasion. Margaritas to mocktails — find what is in your cabinet. | https://mixphd.com/ |
| ProfitSignals.xyz | Ask questions, get charts. AI market research with TradingView visuals and Groq reasoning. | https://www.profitsignals.xyz/ |
| ProSwing.net | Know your baseball swing. Upload video, get a Swing Score with coaching detail per phase. | https://www.proswing.net |
| Aiceo.io | Turn repetitive work into reusable AI employees. Test models side by side, deploy the winner. | https://aiceo.io |

Descriptions = one-paragraph expansions of the above, sourced from
`features/shop/content/ai-apps/{mixphd,profitsignals}-app.mdx` and
`features/projects/content/{proswing-baseball-swing-analysis,aiceo-ai-employees}.mdx`.
No prices stated (shop frontmatter units unverified). No invented claims.

## Posts (all verified in feed / scheduled_posts edge)

Mix: 75% useful / 25% product (post 3 of 4 is the dev-kit/shop angle).
Photo posts only where PNGs exist (ProfitSignals `img.pantaleone.net/1-3.png`);
link posts elsewhere (product art is AVIF — Facebook-unfriendly, same lesson as
synthetic.pics §Q; owner follow-up below).

- Mixphd: live `1398289563357130_122097709791500562` + scheduled
  `..._122097709803500562` (10-04 classics), `..._122097709851500562` (10-06 dev kit
  → `/shop/ai-apps/mixphd-app`), `..._122097709935500562` (10-09 mocktails)
- ProfitSignals.xyz: live photo `1426976343825434_122106756453489179` (1.png) +
  scheduled photos `122106757371489179` (10-04 heatmap 2.png),
  `122106757449489179` (10-06 chart 3.png) + scheduled link
  `1426976343825434_122106756645489179` (10-09 dev kit → `/shop/ai-apps/profitsignals-app`)
- ProSwing.net: live `1375884918941400_122102163369493782` + scheduled
  `..._122102163651493782` (10-04 phases), `..._122102163681493782` (10-06 elite
  comparison), `..._122102163717493782` (10-09 on-device privacy)
- Aiceo.io: live `1329336636935220_122094594621505913` + scheduled
  `..._122094594693505913` (10-04 side-by-side), `..._122094594837505913` (10-06 reuse),
  `..._122094594921505913` (10-09 ops angle)

## Execution notes (for next time)

- Reads need PAGE tokens; system-user token reads of feed/scheduled return empty.
  `/{page}/scheduled_posts?fields=id,scheduled_publish_time` is the queue check.
- Scheduled photo posts return photo IDs (no `post_id`); verify via scheduled_posts edge.
- `date -v+Nd` must run in main shell; passing day-counts through bash function
  args double-expands. One bad call created 2 orphan unpublished photos —
  deleted via `DELETE /{photo-id}` (`{"success":true}` both).
- `POST /{page}` about/description/website all accepted with MANAGE task.

## Phase 2 — full baseline (same session)

- Covers: composed 1640x924 in brand zinc with real product screenshot + name +
  tagline (PIL; AVIF sources converted to JPEG first). Uploaded as unpublished
  photos, set via `POST /{page} cover=<photo_id>` (`/covers` edge is dead,
  `cover={json}` rejected — plain ID works). All `cover.source` live.
- Profile pics v1: lettermark PNGs (M/S/P/A + accent bar, Helvetica, zinc-900).
  `/picture` takes a URL, not a file — uploaded PNG as unpublished photo, passed
  its fbcdn source URL. All `is_silhouette:false`.
- Profile pics v2 (owner request): replaced with REAL app icons pulled from the
  live sites — Mixphd `/favicons/apple-touch-icon.png` (martini glass, 180px),
  ProfitSignals `/favicon.ico` (delta, 256px; ICO upload rejected by picture
  fetcher, converted to PNG first), ProSwing `/android-chrome-512x512.png`
  (speed arrow, from site.webmanifest), Aiceo `/aiceo-favicon/android-chrome-512x512.png`
  (A-mark, from manifest.webmanifest). Same upload-then-URL method. All verified
  `is_silhouette:false`.
- Extended drip: 4 more posts per page (photo p5 from converted art + 3 link),
  scheduled Oct 11/13/16/20. Queue now 7 per page + 1 live = 8 posts each,
  32 total. Copy angles: MixPHD (96 recipes/Use My Bar from live-site screenshot,
  history notes, glassware, occasions), ProfitSignals (news pairing, command list,
  honest limits, morning routine), ProSwing (film-every-session, stance-to-follow,
  coach angle, elite gap — no invented phase names), Aiceo (what-is-a-job examples,
  compare criteria, start-with-one, test-before-trust).
- About content: complete with real data (about/description/website). No phone,
  email, or address added — nothing verified to put there; do not invent.

## Imgsquash.com seeding (1432709709918097, access granted mid-session)

- Same full baseline in one pass: about/description/website (imgsquash.com),
  1640x924 cover from `imgsquash-1.webp` screenshot, profile pic = owner-supplied
  `imgsquash-icon.png` (blue compress glyph, 1254px), 1 live orientation post +
  7 scheduled Oct 4–20 (all verified in feed / scheduled_posts edge).
- Post angles from `IMGSQUASH-TOOL-001` kit facts: bulk/ZIP, dev kit →
  `/shop/ai-apps/imgsquash-tool`, client-side privacy, format picker, Real-ESRGAN
  upscale, quality slider, e-commerce bandwidth. Photo posts from converted
  `imgsquash-2/3.webp` screenshots.

## Live-content wave (same day, `utm_campaign=live_content`)

Pulled each live app before writing — sites are richer than shop MDX:
MixPHD has 134 recipes (not 96), Find My Drink quiz, spirit browsing with counts
(Gin 38, Whiskey 18…), collections, fat-wash techniques; ProfitSignals is now a
signal+evidence+agents platform (Trend Momentum v1, 84 symbols, 4 agents,
Free/Pro $19/Agent $49 — today's board SGOV 74/AMD 72/SOXL 70 used with "right
now" framing + live link, never quoted as static); ProSwing has real phase/check
names (Load/Launch/Contact/Follow-Through, 6 checks with targets, score weights
20/25/20/25/10, tiers, MLB benchmarks, Training Hub); Aiceo names real models
(GLM-5.2/5.3, DeepSeek R1) and task examples; imgsquash is SaaS with pricing
(Free/Pro $12/Business $49) and auto-delete cloud processing (new posts use
live claims, not the old kit's browser-only line).

6 new posts per page (2 live + 4 scheduled Oct 3/5/8/10): MixPHD real recipe
deep-links (Clarified Margarita, Cantarito, Boulevardier, fat-wash),
ProfitSignals live board + methodology/agents/evidence/paper/API, ProSwing
score math + targets + MLB compare + filming guide + Hub, Aiceo experiment +
models/employees/datasets/categories, imgsquash AVIF demo + pricing + HEIC +
blog + upscaler + LCP. Photo posts where art allowed. Queue now 11 per page
(Oct 3–20) + live feed. NOTE: shop MDX for these apps is stale vs live sites —
refresh it before the next content wave.

## Wave 3 + full queue publish (same day, `utm_campaign=menu_wave`)

6 more posts per page (1 live + 5 scheduled Oct 21/23/25/28/31): MixPHD seasonal
(Halloween, Thanksgiving) + technique (Applejack, My Bar, Classics), ProfitSignals
depth (signup, screener, strategy registry, watchlist, SPY workup, pipeline),
ProSwing flaws+drills, MLB library, amateur baseline, dashboard, MediaPipe,
pricing, Aiceo first-experiment + history + 3 example jobs + playground loop,
imgsquash bulk/blog/PNG-WebP/benchmarks/API/integrations.

MixPHD photo rule (owner): only valid recipe images. Deleted the 2 app-screenshot
photo posts, published 3 replacements using real drink photos pulled from the
live site's own `og:image` (`img.mixphd.com` + `mixphd.com/images/recipes`, AVIF
converted to JPEG): Clarified Margarita, Cantarito, Barrel Aged Boulevardier —
each captioned from its verified recipe spec and linked to its recipe page
(`utm_campaign=recipe_photo`). Verified atop the feed.

Owner then ordered the whole queue live. Method: `POST /{post-id}
{is_published:true}` flips scheduled link posts instantly (verified). Scheduled
PHOTO posts reject the flip `(#10)` — recreated as live photo posts with identical
captions, deleted the scheduled originals (8 total). Final: 0 scheduled, ~20 live
posts per page, 100 total.

## PNG image plan for Meta surfaces (owner-confirmed: Meta never renders AVIF)

Rule: every image Meta touches must be JPEG/PNG. Surfaces: catalog feed
`image_link`, link-preview `og:image`, uploaded post photos (already JPEG/PNG
practice — AVIF converted via PIL before upload).

Implementation (this repo):
1. Build-time conversion script (`scripts/build-feed-images.mjs`, PIL or sharp):
   for each feed product, convert source art (AVIF/WebP) to 1600x1600 zinc-padded
   JPEG (padding preserves screenshots; square meets Meta's recommended 1:1,
   min 500px). Output to `public/feed-images/<sku>.jpg` (committed; sizes
   ~100-400KB) — or R2/`img.pantaleone.net` once R2 creds exist in env.
2. New `/api/feeds/meta` route (RSS/CSV, Meta-flavored: `in stock` with spaces,
   no `g:` namespace, JPEG `image_link`, JPEG `additional_image_link`) sourced
   from the same `getFeedProducts()` + image map from step 1.
3. Swap `image_link` in the existing Google feeds to the JPEG variants too
   (Google accepts them; removes one AVIF dependency).
4. `og:image`/`twitter:image` on shop + product pages switch to JPEG/PNG
   renditions (keep AVIF for `<img>` fast path). Same fix already specified for
   synthetic.pics (§Q) and the 5 app repos.
5. synthetic.pics `meta.csv` (other repo): spec the same swap — JPEG `image_link`
   column; its feed is healthy (0 errors/0 warnings daily) so change + monitor
diagnostics after.
Order: 1→2 (unblocks catalog), then 3→4 (this repo), 5 + app repos after.

## Synthetic.pics shop access (verified via API)

Commerce account 1814429359558553, shop 1093553196367905, catalog
`synthetic.pics-catalog` (2195139958102590, 187 products) — all readable.
Feed `feed for synthetic.pics-catalog` pulls `synthetic.pics/feeds/meta.csv` DAILY
(last 3 uploads: 0 errors, 0 warnings). Actions I can perform: read catalog/
items/diagnostics, read feed + upload history, update supplemental data via API
where permitted, monitor health after feed changes. Cannot: edit shop settings,
checkout URL, CTA, or Commerce Manager config (UI-only).

## Owner tasks (not API-possible)

- [ ] CTA button per page (edge unsupported on New Page Experience)
- [ ] Pin orientation post per page (no read/write edge)
- [ ] Username at 25 likes; Reviews; Instagram link
- [ ] AVIF check: mixphd/proswing/aiceo OG images are AVIF — Facebook link previews
      may render blank. Convert `og:image` to JPEG/PNG (same fix as synthetic.pics §Q)
- [ ] Week of Oct 9: review scheduled-post results, then continue 3-5/week cadence
