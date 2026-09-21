# Provenance — modules/campaign-os

Vendored from `pantaleone-halai-central-main/modules/campaign-os`
(`@forwardos/campaign-os` v1.0.0) on 2026-09-21.

## What was copied verbatim

- `src/` — engine, store, agents, channels, lib, prompts, API contract
  (23 files, zero dependencies, no modifications).
- `migrations/002_campaign_os.sql` — Postgres schema for the documented
  durable path (not applied; the app runs on the in-memory store).

## What was intentionally not copied

- `apps/nft-mint-app/app/campaigns/` dashboard and `app/api/campaigns/`
  reference routes — reimplemented under `app/api/` following this repo's
  transactional API conventions (force-dynamic, no-store, zod, rate-limit,
  machine auth). No public UI ships: the portfolio stays fully static.
- `data/prompts/campaign/` file-first prompts — the engine falls back to
  versioned builtins (`src/prompts.ts`); file prompts can be added later.
- `data/workflows/campaign/` n8n workflows — execution is covered by the
  no-cron tick (`POST /api/campaigns/tick` + GitHub Actions schedule);
  n8n remains optional via the same API contract.
- `seed/demo.ts`, `tests/run.ts` — ported as `scripts/campaign-tick.ts`
  seed logic (in `lib/campaign/store.ts`) and `scripts/campaign-test.ts`.

## Strictness adaptations (type-only, behavior-preserving)

This repo typechecks with `noUncheckedIndexedAccess` + `noUnusedParameters`
(strict-er than upstream). Five minimal adaptations were applied so the
vendored engine passes `npm run check-types`:

- `agents/factory.ts`, `agents/qa.ts` — unused params prefixed `_`.
- `store.ts` — `(allowed[c.status] ?? [])` guard on transition lookup.
- `ai-provider.ts` — `?? 0` fallbacks on hashed-vector and cosine indexing.
- `api/contract.ts` — non-null params (`req.params!.id!`) and defaulted
  OPENAPI destructure. Note: this contract module is reference-only; live
  routes reimplement it under `app/api/` per repo conventions.
- Import paths use extensionless relatives (`./store` not `./store.js`):
  Turbopack does not apply `.js`→`.ts` mapping, while extensionless
  resolves under webpack, Turbopack, `tsc`, and `tsx` alike.

No runtime logic was changed. Re-vendoring should reapply these lines.

## Update policy

Bug fixes and agent improvements should land upstream first, then be
re-vendored file-by-file. The seam is `lib/campaign/` (store singleton,
scheduler, HTTP helpers) — engine internals are never imported by routes
except through that seam and the engine's own entry points.
