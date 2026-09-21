# Homepage Client-Acquisition Transformation — Prompt Review + Implementation Plan

Branch: `feature/homepage-client-acquisition`
Base: `main` (branched from `feature/vercel-runtime-optimizations` worktree state 2026-09-21; rebase onto `main` before PR)
Status: PLAN ONLY — no homepage code changed yet.

Related rules: `AGENTS.md`, `docs/CONTENT_ENGINE.md`, `docs/EDITORIAL.md` (run `npm run editorial` + `npm run content:validate` before every content commit).

---

## Part 1 — Prompt review: what to keep, what to fix

The supplied 37-section prompt is directionally right (problem → opportunity → solution → proof → process → CTA, no fabricated proof, preserve all routes/functionality). These changes make it shippable against THIS repo.

### 1.1 Blocking conflicts (fix before building)

1. **CTA copy vs. editorial budget + missing route.**
   - Prompt: "Book an AI Working Session" (5 words). `scripts/editorial-audit.py` budgets CTA at 1–4 words and already flags 5-word CTAs.
   - No `/working-session` booking infra exists. Existing conversion path is `/contact?book=true` + `/contact?assessment=true` + `/services` tiers ($2,500 audit / $8,500 build / retainer).
   - Decision: CTA label = **"Book a working session"** (4 words, passes audit). It routes to existing `/contact?book=true`. Add one-line explainer below CTA: "Bring one process. We scope it or rule it out in 30 minutes." (already proven copy on `/services`). Do NOT invent a new booking system. If "AI Working Session" as a named product is wanted, add it as a `/services` tier first, then rename CTA.

2. **WE voice vs. current I voice.**
   - Prompt mandates WE everywhere. Current `config/site.ts` name is "Matt Pantaleone — AI Engineer & Automation", `app/layout.tsx` Person JSON-LD, `/services` says "I build", "Named engineer (Matt)".
   - Homepage-only WE + rest-of-site I = voice split that reads as dishonest to CEOs.
   - Decision: homepage + `/services` + `/b2b` use WE for the company; keep a single founder-proof block ("Built by Matt Pantaleone…") + `/about` in first person. Update `siteConfig.description` in the same PR (currently portfolio-flavored: "N8N workflow packs, browser-based AI tools…") to the new positioning, plus Organization/ProfessionalService JSON-LD descriptions in `app/layout.tsx`.

3. **Nav: do not invent routes.**
   - Prompt proposes Home / AI Services / Projects / Shop / Blog / About / Contact.
   - Actual routes: `/` , `/services` (label "Consulting" with dropdown: Services, B2B Solutions, AI Readiness Guide, Book Consultation), `/b2b`, `/projects`, `/shop/*`, `/blog`, `/about` (exists but commented out of `config/navigationLinks.ts`), `/contact`.
   - Decision: keep `config/navigationLinks.ts` architecture. Rename dropdown trigger "Consulting" → "Services" (maps to "AI Services" intent, preserves `/services` + `/b2b` + `/resources/ai-readiness-guide`), re-enable About link, keep header CTA as `Button → /contact?book=true` with label "Book a working session". No new top-level routes.

4. **H1 wording.**
   - Prompt H1: "Build AI systems that eliminate expensive manual work." 7 words — passes headline budget (1–8), 1 adjective ("expensive") — passes. Problem: imperative "Build" reads as instructing the visitor.
   - Current hero H1: "AI systems that run themselves." Shorter, declarative, but vague on business outcome.
   - Decision: H1 = **"We build AI systems that eliminate expensive manual work."** 8 words, WE voice, declarative, keeps the approved positioning noun-for-noun. Supporting copy (trim prompt version from ~20 words): "We automate high-value workflows, deploy AI agents, and ship software that turns repetitive work into systems that run themselves." Primary CTA → `/contact?book=true`, secondary "See what we build" → `#proof` anchor + `/projects`.

5. **15-section homepage vs. "reduce cognitive load" (§29) + performance (§32).**
   - Prompt §19 orders ~15 blocks. Shipped as-is it becomes the "long collection of equally weighted cards" §20 warns about, plus LCP regression on a `force-static` page with `ParticleCanvas` (300 particles + `useAnimationFrame` at 30fps + noise SVG overlay).
   - Decision: ship in 3 slices (see Part 2). P0 = hero + capabilities + problem + value + services + proof + process + final CTA. P1/P2 add use-cases, differentiator, who-for, tools, blog. Gate each slice on Lighthouse + `npm run check-types` + `npm run editorial`.

6. **Placeholder proof must be deleted, not replaced with fiction.**
   - Prompt §12 correctly bans "metric to confirm / quote slot / no buyer quotes yet" publicly. Candidates: `features/home/components/WhatPeopleSay.tsx`, `ClientLogos.tsx`, `FAQ.tsx` (currently unmounted in `page.tsx` but still in repo).
   - Decision: audit + delete public placeholders; replace with factual credibility ("Show the work": enterprise experience, systems shipped, documented projects, published thinking). No testimonials, percentages, ROI, client logos unless verified in-repo. This also satisfies `docs/CONTENT_ENGINE.md` §7 (no invented customers/metrics) and `docs/EDITORIAL.md` Claims rule.

### 1.2 Messaging improvements (concrete edits to prompt copy)

| Prompt copy | Issue | Revised copy |
|---|---|---|
| H1 "Build AI systems…" | imperative | "We build AI systems that eliminate expensive manual work." |
| Hero sub (1 long sentence) | 20+ words, "high-value" vague | "We automate high-value workflows, deploy AI agents, and ship software that turns repetitive work into systems that run themselves." |
| "Book an AI Working Session" everywhere | 5 words, fails CTA budget, no route | "Book a working session" → `/contact?book=true`; explainer "Bring one process. We scope it or rule it out in 30 minutes." |
| "See What We Build" / "Explore What We Build" | two variants, title case | One label: "See what we build" → `#proof` (+ `/projects` link in proof header) |
| Problem H2 "Most businesses don't need more AI. They need less manual work." | good — keep verbatim | Keep. Sub-copy keep, add capacity line: "AI takes over appropriate repetitive work so people do higher-value work." |
| "What should we automate?" 8–12 items | risks fake interactivity + bloat | 8 text-first items max in P0 (lead qualification, reporting, data processing, CRM workflows, customer support, document processing, internal knowledge, cross-system workflows); extend to 12 only in P1 if grid stays scannable |
| Value cards Time/Cost/Capacity/Quality | good, but "methodology: Identify → Measure → Automate → Improve" collides with process "Find → Design → Build → Improve" | Homepage uses ONE process language: **Find → Design → Build → Improve**. Value section ends with "Every system is measured on time, cost, capacity, quality." No second methodology |
| Services 01–04 descriptions | good; tech lists (LLMs, n8n, RAG) risk selling tech not systems | Keep tech as secondary muted line per card, cap at 6 terms; card headline sells outcome |
| "We don't stop at strategy. Think → Build → Operate." | "Operate" implies managed hosting/MSP which is not currently sold (tiers sell audit → build → handoff + 30-day fix + retainer) | "Think → Build → Improve" OR keep Operate only if retainer copy is updated to define operate = measure + improve + runbook. Recommended: **Find the opportunity → Build the system → Improve it in operation** |
| "Built, not theorized." | good — keep | Keep. Sub: "Real AI applications, automation systems, and infrastructure." Each card must answer What / What it does / Why it matters in ≤25 words (project description budget) |
| "Bring us one workflow." | good — keep | Keep. Sub keep verbatim. Secondary CTA "See what we build" (consistent label) |
| Footer "relevant Pantaleone properties" | vague, risks sitemap bloat | Keep existing `FooterDirectory` + `BottomNavLinks` categories; add Services/Projects/Shop/Blog/Contact only if missing; descriptive anchors; no new footer domains without SEO config |

Copy rules alignment: prompt §25 ban list (empower/unlock/revolutionize/transform/seamless/cutting-edge/next-generation/game-changing/leverage/synergy) is a superset of `scripts/editorial-audit.py` BLACKLIST — keep both, run `npm run editorial` (fails on `ai-powered`, `seamlessly`, `the future of`, superlatives). Note: prompt itself contains "intelligent systems" and "high-value" — "intelligent" is in ADJECTIVES watchlist; acceptable once per page max.

### 1.3 Non-copy corrections to the prompt

- **Animation (§23) + Hero particles:** current `Hero.tsx` `ParticleCanvas` (mouse-steered 3D starfield + turbulence noise) directly violates "no excessive animation / homepage should feel fast". Replace with static CSS treatment (existing `BackgroundDots` + border tokens). Delete `useAnimationFrame`/`useTheme` canvas code or gate behind `prefers-reduced-motion` + mobile-off. Do not add framer-motion where CSS suffices.
- **shadcn (§22):** use `Button`, `Badge`, `Separator`, `Card`, responsive grid. Current homepage uses `HeadingTitle` + `SeparatorHorizontal` + `Skeleton`/`Suspense` wrappers — keep that shell, add sections inside it. No new component library.
- **SEO (§27):** one H1 (hero), H2 per section, descriptive anchors, keep `force-static`, keep sitemap-at-deploy (`app/sitemap.ts`, no ISR), keep `ConsentManager` + `PageTracker` + analytics. Internal links: services → `/services`, proof → `/projects/[slug]`, tools → `/shop/[slug]`, thinking → `/blog/[slug]` via existing `content-graph.ts` scoring (max 4 related, 1 continue-reading — do not hand-pick randomly per CONTENT_ENGINE §5).
- **Backlog rule:** `config/content/backlog.ts` titles are NOT to be written until asked. Blog section on homepage = 3 existing posts only, prioritized for commercial fit (`measuring-ai-agent-roi`, `ai-readiness-assessment-checklist`, `agentdna-enterprise-ai-agent-infrastructure`), not new posts.
- **Accessibility (§31):** semantic sections, heading order, focus states, contrast, `prefers-reduced-motion`. Keep `SkipToMain` + `#main-content`.
- **What NOT to touch:** routing, DB/auth/APIs/CMS/Stripe/shop logic, contact booking backend, analytics, SEO infra. Homepage may only *link* to them.

---

## Part 2 — Implementation plan (branch `feature/homepage-client-acquisition`)

### Slice 0 — Branch + scaffolding (this commit)
- [x] Create branch `feature/homepage-client-acquisition` from current HEAD, push with this plan file only (no code changes; dirty worktree files from `feature/vercel-runtime-optimizations` explicitly NOT committed).
- [ ] Rebase onto `origin/main` before P0 PR if base drifts: `git fetch origin && git rebase origin/main`.

### Slice P0 — Commercial core (hero → value → services → proof → process → CTA)
Goal: 5-second test passes (what / why care / what built / can execute / how work / next step).

1. `features/home/components/Hero.tsx`
   - Replace `HeroContent` H1/sub/CTAs per §1.2; keep `Button asChild` pattern; primary → `/contact?book=true`, secondary → `#proof`.
   - Replace `ParticleCanvas` + noise SVG with `BackgroundDots`; remove `framer-motion`/`next-themes`/`react-icons` imports from hero (keep SKILLS list → morph into 3 capability pillars: Automate work / Build agents / Ship software, ≤12 words each).
   - Acceptance: single H1, primary CTA visible on mobile viewport, `prefers-reduced-motion` safe, no canvas JS.
2. `features/home/components/ProblemSection.tsx` (new) + `ValueSection.tsx` (new)
   - H2s verbatim from prompt §§6/8; 4 value cards Time/Cost/Capacity/Quality, no percentages.
   - Use `Badge`/`Card` + existing border/typography tokens only.
3. `features/home/components/ServicesSection.tsx` (new)
   - 4 cards 01–04 (Agents / Workflow automation / AI integration / Custom AI software), outcome headline + ≤2-line description + muted tech line; each links to `/services` (+ `/b2b` where relevant).
4. `app/(app)/(root)/page.tsx`
   - Recompose order: Hero → capabilities → Problem → Value → Services → Proof → Process → Final CTA. Keep `SeparatorHorizontal`/`HeadingTitle`/`Suspense`+`Skeleton` shell. Proof reuses `FeaturedStoriesWrapper`/`FeaturedApps` filtered to AI/automation/agent projects (ProfitSignals, AgentDNA first); each card ≤25 words What/Does/Matters.
   - Add `ProcessSection` (Find→Design→Build→Improve) + `FinalCTA` (Bring us one workflow + both CTAs + 1-line explainer).
   - Remove/commented FAQ+ContactMe block stays out in P0.
5. `config/site.ts` + `app/layout.tsx` JSON-LD descriptions: portfolio wording → "AI engineering practice: AI agents, workflow automation, AI integration, custom AI software. We eliminate expensive manual work." Keep URLs/keys identical.
6. Verify P0: `npm run check-types && npm run lint && npm run editorial && npm run content:validate && npm run build`; manual mobile (390px) + desktop check; screen-reader heading order; Lighthouse smoke (no regression vs. base).

### Slice P1 — Recognition + differentiation (use cases, differentiator, who-for, process polish)
- `UseCasesSection.tsx` (new): H2 "What should we automate?" + 8 text-first items (extend to 12 only if scannable); no fake interactivity; grid → stacked list on mobile.
- `DifferentiatorSection.tsx` (new): "We don't stop at strategy." Think→Build→Improve (renamed per §1.2); links to `/services#how-i-work`.
- `WhoForSection.tsx` (new): qualification copy verbatim §14; no industry over-specification.
- `WhatPeopleSay.tsx` / `ClientLogos.tsx`: delete public placeholders ("metric to confirm", "quote slot"); replace with factual "How we earn trust" strip (enterprise experience, systems shipped, documented projects) sourced from `/about`+`/experience`. No testimonials invented.
- Verify: same gates as P0 + `npm run anti-slop:scan -- <changed files>`.

### Slice P2 — Lower-priority surfaces (tools, thinking, footer, nav)
- Homepage `ToolsSection`: reuse `FeaturedProducts` capped at 3 + "View all" → `/shop`; heading "Tools we've built." + sub verbatim §15. Homepage must not read as marketplace.
- `LatestBlogPosts`: switch from latest-3-by-date to 3 commercial-fit posts (see §1.3); heading "Practical thinking about AI." Keep `content-graph.ts` rules for post pages.
- `config/navigationLinks.ts`: rename "Consulting" trigger → "Services", re-enable About entry, header CTA label → "Book a working session" (`/contact?book=true`). Mobile menu inherits automatically; verify `DesktopHeader` + `MobileHeader`.
- `components/footer/*`: keep architecture; ensure Services/Projects/Shop/Blog/Contact coverage with descriptive anchors; no giant sitemap.
- Verify: full gates + `npm run validate-seo`; preview-deploy check (sitemap, OG, canonicals, RSS unaffected).

### Slice P3 — PR + rollout
- Rebase on `origin/main`, squash to ≤4 commits (P0/P1/P2/plan), open PR against `main` with: before/after screenshots (mobile+desktop), 5-second test answers, Lighthouse delta, `editorial`+`content:validate` logs, route-preservation checklist (Shop/Projects/Blog/Contact/Services all reachable, Stripe/contact/analytics untouched).
- Merge only via PR; Vercel preview must build (`app/sitemap.ts` deploy-time). Post-merge: Search Console + AI Overview/Mode per-URL check per CONTENT_ENGINE §12.

### Explicit non-goals (enforced in review)
No routing/stack/DB/auth/API/CMS/Stripe changes; no new booking backend; no new top-level routes; no fabricated clients/testimonials/ROI; no gradient/robot-brain/circuit-board visuals; no new deps for effects; no backlog-post writing; no footer sitemap explosion.

### File map (expected diff)
```
NEW  docs/HOMEPAGE_ACQUISITION_PLAN.md (this file)
EDIT features/home/components/Hero.tsx
NEW  features/home/components/{ProblemSection,ValueSection,ServicesSection,UseCasesSection,DifferentiatorSection,WhoForSection,ProcessSection,FinalCTA}.tsx
EDIT app/(app)/(root)/page.tsx
EDIT config/site.ts, app/layout.tsx (descriptions only)
EDIT config/navigationLinks.ts, components/header/** (labels only)
EDIT features/home/components/{WhatPeopleSay,ClientLogos}.tsx or DELETE placeholders
EDIT features/home/components/{FeaturedApps,FeaturedProducts,LatestBlogPosts}.tsx (filtering/caps only)
```

### Verification commands (each slice)
```bash
npm run check-types
npm run lint
npm run editorial
npm run content:validate
npm run build
```
