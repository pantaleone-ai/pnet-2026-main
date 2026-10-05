# Portfolio Social Growth OS

Repeatable system, not a list of ideas. Code is authoritative; this doc summarizes.

## Audit (what exists)

- Growth primitives: `lib/growth/utm.ts` (campaign/creative naming, `buildUtmUrl`), `attribution.ts` (first+last touch), `events.ts` (22 events), `reporting.ts` (ROAS/CAC nulls, never fabricated), platform scaffolds for pinterest/x/reddit.
- Portfolio truth: `config/portfolio.ts` (8 live apps), `config/ecosystem.ts` (verified domains).
- Campaign OS: blog to LinkedIn/Web/Email only. No Pinterest/X/Reddit adapters. Single-brand seed.
- Social depth: only `docs/social-presence/synthetic-pics.*` has a calendar. 7 of 8 apps have no audit.
- Analytics: Meta pixel + CAPI for pantaleone.net only. All per-app `ga4/meta` ids null by design.

## Gaps closed by this change

Content model, 30-day calendar as data, platform matrix, 22 templates, scoring, social UTM wrapper. No duplicate tracking, no new deps, no secrets.

## Strategy

Publish short, specific, useful, visual, actionable posts. One idea, one visual, one CTA. Optimize for purchase, subscription, trial, activation, lead — never likes alone.

## Priorities

- Tier 1 (8/week): synthetic-pics 3, print3dmodels 3, mixphd 2
- Tier 2 (4/week): proswing 2, imgsquash 1, aicapturelab 1
- Tier 3 (1/week): profitsignals 1, aiceo 0.5 biweekly
- Portfolio target: ~13/week, 32 posts per 30 days in `config/social-growth/calendar-30d.ts`

## Platform strategy

See `config/social-growth/platform-matrix.ts`. Pinterest for visual commerce (synthetic, mixphd, print3d, aicapturelab). X for tools and insights. Instagram for demos. Facebook for gifts and recipes. Reddit as answers only. LinkedIn for aiceo and profitsignals only. Shorts only where demo is strong.

## Cadence and timing

See `config/social-growth/cadence.ts`. Windows default to US Eastern audience time. Move to observed-performance timing once `lib/growth/reporting.ts` has per-app ingestion.

## CTA strategy

One primary CTA per post. Map: synthetic Explore the gallery, print3d Shop the print, mixphd Read the recipe, proswing Analyze your swing, imgsquash Try it, aicapturelab See the transformation, profitsignals Run the analysis, aiceo Start free.

## Tracking

Reuse only: `buildSocialUrl` wraps `buildUtmUrl` with `utm_medium=organic_social`. Campaign `[APP]_[PLATFORM]_[OBJECTIVE]_[AUDIENCE]_[GEO]_[YYYYMM]`, creative `[APP]_[CONCEPT]_[FORMAT]_[VARIANT]`. Validate with `validateCalendar()`. Attribution stays first+last touch in `lib/growth/attribution.ts`. Map portfolio `purchase` to growth `purchase_completed` at reporting time.

## Content model

`lib/social-growth/content-model.ts` zod schema: contentId, appId, platform, contentType, pillar, hook (max 220), body, cta, destinationUrl, campaignId, creativeId, utmId, publishAt, status (idea to retire), priority, audience, format, sourceAsset, variant. No secrets.

## Experimentation

One variable at a time. Unique campaign/creative/content/utm ids per variant. Hierarchy: revenue, purchases, subscriptions, activations, clicks, visits, reach, engagement. Winners recycled as new angle, new hook, new creative, never identical repost.

## Automation roadmap

1. Product data to opportunity detection (feeds in `app/api/feeds/*`, shop/blog sources)
2. Draft generation from templates in `config/social-growth/templates.ts`
3. Intake via `POST /api/social/ingest` (Bearer `N8N_WEBHOOK_SECRET`, idempotent on `contentId`) or `.github/ISSUE_TEMPLATE/social-post.yml`
4. Shared Issues queue (`social` + `site:*` + `platform:*`) feeding per-app Projects in org `pantaleone-ai` via `social-to-projects.yml`
5. Human review (status review to approved) on `social/<issue>-<contentId>` branches
6. Claim cadence every 12h at :47 via `social-orchestrator.yml` (offset from :17 jobs); stale locks revert after 7d
7. Publication, tracking, analysis, learning
Do not auto-publish unverified claims. Regulated topics (profitsignals) stay education-only.

## Queue freeze note

After `scripts/social-issues/seed-calendar.ts` live seed, `config/social-growth/calendar-30d.ts` is frozen reference. New posts go to Issues or the ingest route. Excluded: agentdna, agentlibrary, qrgen (no boards).

## Projects (verified 2026-10-05, user-level under pantaleone-ai, board view, blank)

| App | Project | Secret |
| --- | --- | --- |
| synthetic-pics | 2 | PROJECT_SYNTHETIC_PICS |
| print3dmodels | 3 | PROJECT_PRINT3DMODELS |
| mixphd | 4 | PROJECT_MIXPHD |
| proswing | 5 | PROJECT_PROSWING |
| imgsquash | 6 | PROJECT_IMGSQUASH |
| aicapturelab | 7 | PROJECT_AICAPTURELAB |
| profitsignals | 8 | PROJECT_PROFITSIGNALS |
| aiceo | 9 | PROJECT_AICEO |
| pantaleone | 10 | PROJECT_PANTALEONE |

Code map: `config/social-growth/projects.ts`. Feed: `social-to-projects.yml` (fail-soft).
Token note: local and default `GITHUB_TOKEN` lack Projects scope (verified: `user.projectsV2` not accessible). For live auto-add, create a fine-grained PAT (owner pantaleone-ai, Projects read/write, Issues read) and save as `PROJECTS_TOKEN`. Until then the workflow logs skip lines and the queue is unaffected.

## Analytics and KPIs

Level 1 business (revenue, purchases, subs), Level 2 conversion (activations, trials, clicks), Level 3 traffic (CTR, visits), Level 4 distribution (reach, completion), Level 5 engagement (saves, shares). Content mix starts 40/25/15/10/10 useful/product/proof/discovery/conversion, reweighted by conversion.

## Social SEO loop

Social to insight to SEO to traffic to conversion to data to social. High-performing topics feed FAQs, product pages, and blog backlog. Hashtags 0-5 specific, keyword titles on Pinterest.

## Visual system

Real product UI, real outputs, before/after, screenshots, artwork, minimal text on image, native dimensions. No generic AI imagery or robot clichés. Each app keeps its identity.

## QA results (run on implement)

- `validateCalendar()` must return zero issues
- `npm run check-types` clean for new files
- No secrets in `config/social-growth` or `lib/social-growth`
- No new tracking vendor, no pixel change

## Remaining manual steps

1. Confirm AgentDNA, AgentLibrary, QRGen domains before adding to calendar.
2. Create Pinterest boards per theme and Instagram link-in-bio targets per app.
3. Wire per-app pixels only after consent gate review; keep `ids` null until then.
4. Extend Campaign OS tick for per-app social queue when ready to automate scheduling.
5. Replace placeholder `purchase_completed` alias map in reporting when ingestion lands.
