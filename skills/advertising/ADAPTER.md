# Advertising adapter — how upstream thinking maps to pnet voice

Upstream optimizes for direct-response paid conversion.
This repo optimizes for organic trust: factual, specific, no hype,
never invent metrics (`docs/EDITORIAL.md`, `docs/VOICE_MEMORY.md`).

## Allowed imports (thinking, not tone)

- `avatar-extraction` → `avatarFor(appId)` from `config/social-growth/product-matrix.ts`
- `offer-extraction` → `offerFor(appId)` (outcome, time saved, risk reduced — no invented numbers)
- `schwartz-awareness-mapper` → `awarenessFor(platform, pillar)` (cold = education, warm = offer)
- `mechanism-builder` → `mechanismNote(appId)` (why this approach works, one sentence)
- `headline-matrix` (25) → filtered to `COPY_BUDGETS` (hook 4–10 words, max 100 chars)
- `ad-angle-multiplier` → `anglesFor()` across pain/desire/proof/identity/contrarian, mapped to `POST_FRAMEWORKS` ids
- `objection-crusher` → FAQ/Reddit answers only, never injected into IG/FB captions unprompted
- `scroll-stopping-creative` → first-frame hook + visual spec, gallery-only assets
- `conversion-path-builder` → CTA + destination mapping (one CTA per post)
- `performance-diagnosis` → read-only diagnosis from `report-weekly.ts`, never auto-respin
- `generic-language-killer` → merged into `BANNED_PHRASES` (additive)
- `full-funnel-campaign-orchestrator` → `docs/SOCIAL_ADVERTISING_PLAYBOOK.md` checklist, not automation

## Forbidden in organic path

Fake urgency, countdowns, agitation loops, invented proof,
engagement bait (`like and share`, `tag a friend`, `comment below`),
generic hype (`scale your business`, `proven strategies`, `game-changing`).

## Paid path

Paid variants use `utm_medium=paid_social` via `buildPaidSocialUrl()`.
Organic (`organic_social`) naming and attribution are untouched.
Paid requires explicit `--paid` flag and never auto-approves without
`social-audit=pass` + credentials + images.
