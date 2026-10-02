# synthetic.pics Facebook — Complete Optimization Report (2026-10-02)

## Data provenance (read first)

- VERIFIED FACEBOOK DATA (Graph API v26.0, session token): Page `1423764057476870`
  (`Synthetic.pics`, Art Gallery, published, 0 fans / 0 followers); about,
  description, website, profile picture (`is_silhouette:false`), cover (live
  `cover.source`) all read back after each write. 10 photo posts published, feed
  re-listed to confirm. Owner-added CTA + pinned post: OWNER-REPORTED, not
  API-readable (CTA edge unsupported on New Page Experience; pin state has no
  read edge) — flagged as such below, never claimed as verified.
- WEBSITE-VERIFIED FACTS (live fetch 2026-10-02): 147 artworks; $3.00 USD per
  work, In stock, personal-use license; Stripe checkout, instant delivery,
  72-hour signed link + email backup; Creator $19 / Studio $49 / Pro $99, 70/30
  split; models SDXL Lightning + FLUX.2 Klein (4B); artwork pages carry
  style/color/form/approach/mood, seed, SKU, tags, prev/next + similar works,
  Share/Embed; GA4 `G-7WVFH10LV9` + GTM present; `facebook-domain-verification`
  meta present; OG tags complete on artwork pages (AVIF image — see Q).
- ASSUMPTIONS: none load-bearing. Where the plan asked for generation-selection
  history (rejects series), drafts use the site's stated loop, marked as such.
- NEEDS MANUAL ACCESS: Page roles/insights, username eligibility (needs 25 likes),
  CTA button confirm, pinned-post confirm, Reels upload (video files need owner
  device or a token with video rights — API video upload untested here).

Repo boundary: no application code was changed. This repo is pantaleone.net;
the synthetic.pics app lives elsewhere. §Q/U are specified for that repo.

## A. Audit

Page was a blank Art Gallery (no about/website/media) at handoff. Fixed via API:
about, description, website, profile picture (site `/icon`), cover (Black Broken
Circles). Category already correct. Name `Synthetic.pics` kept (recognizable;
exact-case rename risks review — see V). Feed now: 10 artwork photo posts with
buy-link captions + profile/cover update stories. Gaps remaining: username,
CTA confirm, pinned confirm, Reels, reviews, Instagram link.

## B. Page optimization (applied)

| Field         | Value                       | Status                |
| ------------- | --------------------------- | --------------------- |
| Name          | Synthetic.pics              | kept, verified        |
| Category      | Art Gallery                 | kept, verified        |
| About         | §C bio                      | set + read back       |
| Description   | §C long                     | set + read back       |
| Website       | https://www.synthetic.pics/ | set + read back       |
| Profile image | site icon 512px PNG         | `is_silhouette:false` |
| Cover         | Black Broken Circles JPEG   | `cover.source` live   |
| CTA           | Shop Now (owner)            | owner-reported        |
| Pinned        | orientation post (owner)    | owner-reported        |

## C. Exact bio / about / CTA copy (live)

Bio (`about`): `Human-guided, machine-generated art. One new artwork every day.
Curated generative, abstract and minimalist digital art. Explore the gallery.`
About (`description`): `Synthetic.pics is a human-guided generative art gallery.
People set the direction — palette, form, composition — machines generate the
possibilities, and curators publish only what earns a place. Browse abstract,
minimalist, and geometric digital artworks. Every piece is for sale as a
high-resolution, watermark-free download with instant Stripe checkout. Run your
own gallery on your own subdomain from $19/month.`
CTA: Shop Now → `https://www.synthetic.pics/gallery?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_cta`.
Creator-campaign variant: Shop Now → `/create` with `utm_campaign=custom_gallery`.

## D. Cover specification (as applied)

One artwork (Black Broken Circles), generous negative space inherent to the
piece, no text baked in, no badges, no price. 1024px square source — crops on
wide slots. Upgrade path: re-export the same work at 1640×924 from the app and
re-upload; 10-minute owner/API task.

## E. Pinned post — canonical copy

Visual: Black Broken Circles (matches cover; recognition loop).
Copy: `synthetic.pics is a curated generative art gallery. Every day, machines
create possibilities. People decide which ones deserve to stay. The result is a
growing collection of original abstract, minimalist and experimental digital
artwork. Browse today's canvas. Explore the archive. Or create your own gallery
at synthetic.pics.` CTA: Explore synthetic.pics → `https://www.synthetic.pics/`
(+ launch UTMs). Owner pinned their version — replace with this verbatim if
theirs differs in structure.

## F. Content strategy

The Page is the daily art journal, not an ad feed. Two paths, never mixed in one
post: Path A (collector → $3 artwork page), Path B (creator → `/create`).
Mix: 40% daily artwork, 30% process/curation, 20% collections, 10% commerce —
with $3 availability embedded inside art posts (§33 structure) so commerce
impression exceeds 10% without extra ad posts.

## G. Content pillars

1. Today's Canvas (product). 2. How a piece survives (process). 3. Why it stays
   (curation). 4. Studies & series (collections: monochrome, material, grids,
   violet/red). 5. What you get (trust: Stripe/72-hour/license). 6. Your own
   gallery (commercial: $19/$49/$99, 70/30, subdomain).

## H. 30-day calendar

Weeks 1–2 already live (10 artwork spotlights, `utm_campaign=launch`). Weeks
3–4 = the 10 phase-2 drafts in §I below, published 4–5/week: Mon canvas, Tue
process, Wed canvas/collection, Thu discussion, Fri canvas/Reel, Sat creator
(optional), Sun rest. Full day-by-day table with hooks/CTAs/destinations lives in
`synthetic-pics.content-30d.md`; §I extends it with Path-B and template posts.

## I. First 10 phase-2 drafts (complete copy, ready to schedule)

UTM base: `?utm_source=facebook&utm_medium=organic_social`. One CTA each.

1. PHILOSOPHY (link /method, `utm_campaign=daily_canvas&utm_content=philosophy`):
   `Machines can produce thousands of images. That is not the interesting part.
The interesting part is deciding which one deserves to stay. That decision is
the gallery. See how we choose →`
2. TODAY'S CANVAS — Ochre Branching Lines (photo, `utm_content=ochre_branching`):
   `TODAY'S CANVAS. Ochre Branching Lines. Branching filaments in ochre,
centered and quiet. Material study from this week's additions. THIS ONE IS
AVAILABLE. High-resolution. No watermark. Instant download. $3. View the
artwork → [artwork URL]`
3. MAKING THE CUT (link /method, `utm_content=making_the_cut`): `50 generations.
One made the archive. The rest were technically fine. This one had structure.
Why keeps beat likes, most weeks. See how we choose →`
4. THREE-PIECE STUDY (3 photos or carousel, collection): `Three approaches to
geometric abstraction: Balanced Broken Grid, Geometric Broken Grid, Sculptural
Violet Grid. Same vocabulary — slabs, grids, quads — three different
temperaments. Which one holds the wall? Explore each → [3 artwork URLs]`
5. METHODOLOGY (link /method, `utm_content=four_steps`): `Human-guided.
Machine-generated. Four steps: direction, generation, selection, publication.
The machine explores. People keep. See the full method →`
6. $3 SPOTLIGHT — Minimal Red Band (photo, `utm_content=min_red_band`): `Minimal
Red Band. A single band in red, balanced and alone. THIS ONE IS AVAILABLE.
High-resolution. No watermark. Instant download. $3. View the artwork →`
7. REEL (video, script in O): caption `50 generations. 1 made the archive.
Watch the cut. Human-guided. Machine-generated. Explore the Piece → [URL]`
8. CUSTOM GALLERY INTRO (link /custom-art-gallery, `utm_campaign=custom_gallery`):
   `You do not need another image generator. You might need a place for the work
to live. Your subdomain. Your direction. Scheduled generations. Human
publishing. Optional Stripe sales. Create your gallery →`
9. CREATOR CONVERSION (link /create, `utm_content=creator_plans`): `Your gallery
should not look like a prompt history. Choose the direction, the model, what
gets generated, what gets published, what gets sold. Creator $19. Studio $49.
Pro $99. You keep 70% of every sale. Create yours →`
10. MONTH REVIEW (collection link /gallery, `utm_content=month_review`): `The
strongest keeps this month: broken circles, violet grids, rose bands, red
planes. Five works, one standard — only what earns a place. Browse the
archive →`

## J. Daily canvas template

`TODAY'S CANVAS. [Title]. [One observed sentence]. [Direction tags: style /
form / palette / mood]. THIS ONE IS AVAILABLE. High-resolution. No watermark.
Instant download. $3. View the artwork → [URL+UTM]`. 40–100 words max. Swap
title/observation/URL; never repeat the opening two sentences twice in a week.

## K. Curation template ("Why did this make the cut?")

`WHY DID THIS MAKE THE CUT? [Title]. [N] generations went in. One came out.
It stayed because [one concrete reason: structure, restraint, material truth].
[What was rejected in one line — no mockery]. See the keep → [URL]`. 80–180
words. The reason must cite something visible in the work.

## L. Rejects template

`[N] generations. 1 keeper. This one looked good for three seconds — [specific
flaw: symmetry fights the form / palette drifts / detail crowds the quiet].
Rejected, kept in the notes. The keeper → [URL]`. Use only real loop language
until generation history is exposed via API (§U); never stage fake failures.

## M. Custom gallery campaign (BUILD YOUR GALLERY)

Audience B only. Rotation (1×/2 weeks): own-subdomain → direction/models →
scheduled generation → human publishing → Stripe/70-30 → plans comparison →
tenant proof (only with a real tenant gallery — NONE exists yet; do not invent).
Always link `/create` (never pricing-first cold traffic without context).

## N. Artwork sales campaign

Every art post carries §33 structure (availability + $3 + link) instead of
separate BUY NOW ads. Price appears in caption AND on destination (verified
$3.00 on artwork pages). Destinations: artwork URL (collector), `/licensing`
(objection handling), `/gallery` (browsers). No scarcity claims, no countdowns.

## O. Reels strategy

15–18s, site assets only: `0–2s "50 generations." → 2–5s rapid possibilities →
5–8s "1 made the archive." → 8–12s final artwork hold → 12–15s "Human-guided.
Machine-generated." → 15–18s synthetic.pics`. Needs generation-sequence frames —
unavailable via current site/API; owner screen-records or waits for §U pipeline.
No cinematic hype edits. One Reel in phase 2 (draft 7), cadence 1×/2 weeks after.

## P. Search/discovery

Entity consistency: `synthetic.pics` + `Human-guided, machine-generated. A
curated generative art gallery.` — now identical on Page about, site meta, OG
site_name. Post openings name the subject (`Today's generative artwork…`,
`Material study…`). Semantic set from §30 used naturally across about,
description, and captions. Zero keyword stuffing (audited).

## Q. Website / Open Graph changes (for the synthetic.pics repo — NOT applied)

1. og:image is AVIF on artwork pages (verified). Facebook's crawler does not
   reliably render AVIF link previews → blank thumbnails on shared links.
   Change `og:image`/`twitter:image` to JPEG/PNG rendition; keep AVIF for
   `<img>` fast path. Highest-impact fix in this report.
2. `/create` OG: confirm a product visual + "Create Your Custom Art Gallery"
   description (unverified — check).
3. Keep `facebook-domain-verification` meta (present). Artwork pages already
   exemplary: title/desc/image/url/article type, prev/next + similar works for
   retention, Share/Embed present. No other landing changes needed before
   traffic scales.

## R. Analytics / UTM plan

Existing: GA4 `G-7WVFH10LV9` + GTM on site. Do not duplicate. Convention:
`utm_source=facebook&utm_medium=organic_social&utm_campaign={launch|daily_canvas|custom_gallery|page_cta|pinned}&utm_content={postNN|slug}`.
Funnel events to confirm in the app's analytics naming (do not rename working
events): social_landing → artwork_view → artwork_checkout_start →
artwork_purchase; custom_gallery_view → custom_gallery_checkout_start →
subscription_start. Verify Facebook-referral attribution in GA4 before any paid.

## S. Weekly reporting dashboard

Per post: reach, reactions, comments, shares, saves, link clicks, CTR
(`utm_content` in GA4), artwork_views, checkout_starts, purchases, revenue.
Per week: best artwork (reactions), best discussion (comments), best seller
(purchases), best creator pull (`/create` sessions), style tally (color /
geometry / minimalism / sculptural), format tally (single vs collection vs
process). Decision rule: keep top-2 series, cut the bottom-1, one new test.

## T. Testing framework

One variable at a time, no winners before n≈8 posts: price-in-caption vs
price-on-destination-only; metadata block vs clean caption; question close vs
statement close; single vs 3-up collection; editorial vs technical register.
Attention/engagement/discovery/intent/purchase tracked SEPARATELY (§46).

## U. Automation architecture (specified, not built)

Pipeline in the synthetic.pics app behind human approval: artwork publish event
→ fetch metadata+image → style/series classify → Facebook-worthiness score
(internal only: impact, composition, distinctiveness, cohesion, caption-ability,
collection + commercial potential) → draft caption from templates J/K (+UTM) →
queue → human approve → publish via Page token. Dedup memory: recent works,
colors, styles, hooks, questions, promos. Never auto-publish; never score
publicly. Estimated surface: content-queue table + approval UI + registry
fields from §47 (post_id … lesson).

## V. Manual checklist (owner)

- [x] Page created, category Art Gallery, published
- [x] Shop Now CTA added (verify label + destination in Page UI)
- [x] Orientation post pinned (confirm it is post 1 / canonical §E copy)
- [ ] Username `syntheticpics` at facebook.com/username (needs 25 likes)
- [ ] Reviews/Recommendations enabled; invite first real buyers only
- [ ] Instagram link + Business Suite + GA4 referral check
- [ ] 1640×924 cover re-export (optional upgrade)
- [ ] First Reel frames (generation sequence)

## W. Implementation summary

API-applied: about, description, website, profile picture, cover, 10 launch
posts (all verified by re-read). Owner-applied: CTA, pinned post. Specified not
built: Q (OG AVIF fix), U (pipeline) — both belong to the synthetic.pics repo.
Nothing in THIS repo changed except `docs/social-presence/*`. No metrics
invented; no audience data claimed; no feed spam pattern (10 unique images).

## X. Validation results

- `POST /accounts` (draft + published): blocked `(#100)` — documented, expected.
- Reads: `/me`, `/me/accounts`, page fields, feed listing — all 200.
- Writes: about/website/description/picture/cover/photos — all `{"success":true}`
  or photo/post IDs, each re-read to confirm.
- Expected failures (policy, not bugs): page-create `(#100)`, test-users `(#15)`,
  username `(#3)`, post-CTA `(#10)`, CTA edge `(#100/33)`, unknown-ID `(#100/33)`.
- Token handling: session-only env var, never written to disk or docs, Page
  tokens extracted in-memory per call.
