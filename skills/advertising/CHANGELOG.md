# Advertising upgrade changelog

## 2026-10-29 — v1.0 vendor + adapter (branch feat/social-advertising-upgrade)

- Vendored upstream `45f4a4a` (12 skills) under `skills/advertising/upstream/`.
- Added `lib/social-growth/advertising-adapter.ts` (pure, no deps).
- Paid prep: `buildPaidSocialUrl()` (`paid_social`), `PAID_OBJECTIVES`, `PAID_PLATFORMS`.
- `caption.ts`: +8 banned phrases from generic-language-killer (additive).
- `social-audit.ts`: + advisory awareness-mismatch warn layer (never fail).
- `templates.ts`: +3 frameworks (`mechanism-note`, `objection-answer`, `angle-test`).
- `build-packet.ts`: `--angles` / `--paid` flags (default off, dry-run safe).
- `auto-approve.ts`: Rule 3 `advertising-pass` — auto-allow on `pass` for all apps (fail still blocks).
- `config/automation/policy.ts`: `advertising` block (kill switches, default angles off for nightly).
- Added `docs/SOCIAL_ADVERTISING_PLAYBOOK.md`, `.github/workflows/advertising-sync.yml`.
