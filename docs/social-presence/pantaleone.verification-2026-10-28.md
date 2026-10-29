# Pantaleone.net + portfolio — Meta relevance updates (2026-10-28)

No secrets in this file. Token referenced as `EAA...[withheld, session-only]`.

## Handshake (read-only)

- `GET /me` → `pantaleone-main` (`122100817833493795`).
- `GET /me/accounts` → 7 pages accessible: Pantaleone.net
  (`101092449202509`, 724 fans), Synthetic.pics, Mixphd, ProfitSignals.xyz,
  ProSwing.net, Aiceo.io, Imgsquash.com.
- `GET /101092449202509?fields=instagram_business_account` →
  `17841452273392769` (`@pantaleonenet`, 485 followers, 159 media).
  ProfitSignals / ProSwing / Aiceo / Imgsquash return `ig: null` (FB-only;
  link in Business Suite before IG publishing).

## Code changes (this repo)

- `lib/seo/ai-discovery.ts`: added
  `https://www.facebook.com/101092449202509` +
  `https://www.instagram.com/pantaleonenet` to `ENTITY.org.sameAs` and
  `ENTITY.person.sameAs` (equivalent profiles only; no product domains).
  `npm run validate-seo` passes.
- `config/site.ts`: added `links.facebook` + `links.instagram` (same URLs).
- `scripts/social-issues/publish/accounts.ts`: added FB-only entries for
  `profitsignals` (`1426976343825434`), `proswing` (`1375884918941400`),
  `aiceo` (`1329336636935220`), `imgsquash` (`1432709709918097`) so
  `publish-due` no longer refuses those sites for FB. IG guards still skip
  them until linked.

## API writes (all `{"success":true}`, re-read back)

- **Pantaleone.net** (`101092449202509`) — was stale (NFT/Web3 name,
  blockchain/shipping description, 7-URL website list):
  - `about` → `We build AI systems that eliminate expensive manual work: AI
    agents, workflow automation, AI integration, and custom AI software for
    businesses.` (from `siteConfig.description`)
  - `description` → `Pantaleone Digital Services LLC builds AI agents,
    workflow automation, AI integration, and custom AI software. Services:
    $2,500 workflow audit (two-week, ranked build list); $8,500/mo agent
    builds wired to CRM, helpdesk, or warehouse with logging and kill
    switch. B2B integration, working sessions, repo + runbook. Start:
    pantaleone.net/services.` (346 chars, fully stored; prior 470-char
    draft truncated at 436 by FB)
  - `website` → first entry now `https://www.pantaleone.net/` (API replaces
    first entry only; legacy URLs still trail — owner cleanup below).
  - `name` → API rejects with `(#3) Application does not have the
    capability` — owner must rename in Page Settings (review may apply):
    `Pantaleone.net - Custom Artwork, NFT's & Web3 Tech` → `Pantaleone.net`.
- **ProfitSignals.xyz** (`1426976343825434`) — description refreshed to live
  platform (verified via site fetch 2026-10-28: signals/regimes/backtested
  evidence, 84 symbols, screener/watchlist/alerts/strategies/agents/API):
  `ProfitSignals is live market research: ... Research tooling, not
  investment advice.` About kept (Ask/questions+charts still matches).
- **Imgsquash.com** (`1432709709918097`) — fixed stale browser-only claim
  per live site (cloud processing, auto-delete; only upscaler/HEIC are
  browser-side) + pricing (`Free 5/hour; Pro $12/mo, Business $49/mo`).
- **Synthetic.pics, Mixphd, ProSwing.net, Aiceo.io** — about/description/
  website already relevant; no writes (verified by re-read).

## Skipped per owner request

- Profile pictures + covers (all pages).
- Phase 3 (n8n workflow builds).

## Owner tasks (not API-possible)

- [ ] FB Pantaleone.net: Settings → Name → `Pantaleone.net` (review).
- [ ] FB Pantaleone.net: Settings → Website → single
      `https://www.pantaleone.net/` (remove 6 legacy URLs).
- [ ] CTA button + pin orientation post per page (no read/write edge).
- [ ] IG `@pantaleonenet`: bio link `https://pantaleone.net/` →
      `https://www.pantaleone.net/` (biography text already relevant;
      bio edits are app-only, no Graph endpoint).
- [ ] Link IG accounts for ProfitSignals / ProSwing / Aiceo / Imgsquash
      (Page Settings → Linked accounts → Instagram) so slot crons serve them.
- [ ] Page-to-page likes/follows (see below) — manual, UI-only.
