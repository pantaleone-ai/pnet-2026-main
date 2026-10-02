# synthetic.pics — Social Presence Audit (test, read-only, 2026-10-02)

Source of truth: `config/portfolio.ts` (synthetic-pics), `config/ecosystem.ts`,
live `https://www.synthetic.pics`. No publishes made. Unknowns marked unknown.

## A. Executive summary

No dedicated Facebook presence exists. Only accessible Page is generic
Pantaleone.net (`101092449202509`, `Software Company`, `pantaleoneAI`) with stale
about/website. For an art-commerce app this dilutes discovery → trust → purchase.
Recommend dedicated Page + Pinterest/Instagram primary, keep LinkedIn out.

## B. Current state

- Product: human-guided generative art gallery, purchasable high-res downloads.
  Flow: human direction → machine generation → human curation → publication.
- Conversion: `artwork_downloaded` (paid), secondary `artwork_saved`.
- CTA: Explore the gallery → https://www.synthetic.pics (deep link to /gallery better).
- Site has method/licensing/FAQ, daily drops with title/date/model/tags.
- `config/socialLinks.ts`: no Facebook. `ids: {ga4:null, meta:null}` = correctly disabled.

## C. Findings

- CRITICAL: No dedicated Page; generic Page about mismatched (AI agents, old URLs
  including `agentlibrary.ai` which portfolio explicitly omits).
- HIGH: Category `Software Company` wrong for gallery; website list stale.
- MEDIUM: No per-app Pixel/CAPI; UTM scheme exists in `lib/growth/utm.ts` but unused.
- LOW: Handle `pantaleoneAI` vs `synthetic.pics` inconsistency.

## D. Platform strategy

- Primary: Pinterest, Instagram, Facebook (visual discovery + commerce).
- Secondary: X, Reddit (drops, process, community).
- Experimental: Reels/Shorts/TikTok (only if production sustainable).
- Not recommended: LinkedIn (no professional-credibility fit).

## E. Profile drafts (not applied)

- Name: `Synthetic Pics` (or `Synthetic Pics — Generative Art` where allowed).
- Handle: closest to `syntheticpics` consistently; avoid numbers/punctuation.
- Bio: `Original generative art, human-curated. Explore the gallery and own
high-res downloads.` (WHAT+WHO+BENEFIT, specific).
- About: what/who/problem/capabilities/differentiators + site + support path.
- CTA: Shop Now / Learn More → https://www.synthetic.pics/gallery.
- Pinned: orientation WHAT→WHO→WHY→NEXT, evergreen 6-month useful.

## F. Visual system

Reuse site identity. Profile image: high-contrast mark legible at small size,
platform-native shape. Cover: what/what-it-does/who-helped + one value prop,
simple, mobile-safe, no paragraphs/stock/fake proof/multi-CTA.

## G. Content strategy

Pillars: education (human-guided meaning), product (daily drops), problem/solution
(custom gallery), proof (real works only), community, building-in-public.
Series examples: How It Works, Behind the Build, Before/After, One-Minute Method,
Feature Friday. Cadence 3-5/week quality-first. Hashtags 0-5 specific.

## H-I. Calendars (outline — full 30d/90d on request)

Each post needs: day, platform, pillar, format, hook, message, CTA, destination,
visual, repurpose path. Phase 1-14 foundation, 15-30 consistency, 31-60
experiments, 61-90 optimize. No filler posts.

## J. Analytics

Track reach/profile visits, saves/shares/comments, link clicks/sessions,
downloads/purchases, returning visitors. Targets only from baselines, never invented.

## K. Funnel

Social discovery → profile → synthetic.pics/gallery → download purchase →
retention (new drops). Biggest likely leak: no dedicated profile + generic landing.

## L. Implementation

1. Immediate: owner creates dedicated Page manually (API blocked, see verification
   file), fix about/website/category, add UTM.
2. Next: profile image/cover drafts, pinned post, 30-day calendar.
3. Later: Pinterest/Instagram wiring, experiments.
4. Optional: paid only after organic signal, measured separately.
