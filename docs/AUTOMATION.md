# Automation Gap Matrix — content + campaign + social

Baseline recorded 2026-10-19 on `feat/full-automation-pipeline` (before changes):
`check-types` clean · `campaign:test` 9/9 pass · `social-test` pass ·
`reshare --auto` scoring works · store empty (no brands/sources seeded).

Policy: `config/automation/policy.ts` (v`2026-10-24.1`), evaluator
`lib/automation/policy.ts` (`allow|deny|needs_review|retry_later`).
QA thresholds preserved (≥80 pass, 55–79 revise, <55 block).
L1/L2 approval semantics preserved (`requiresApproval` level ≤ 2).
Copy audit: `lib/social-growth/social-audit.ts` (pass/warn/fail, never
rewrites; budgets in caption.ts `COPY_BUDGETS`; anti-slop engine scan-only).

## What is now automated (this change)

| Area                            | Before (manual)                   | Now                                                                                            | Reused                                                                                                                  | Guardrails                                                                                                  |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Social Rule 1 (gallery-live)    | hand-add `publish:approved`       | `social-auto-approve.yml` 2×/day adds the label when policy allows                             | `publish-due`, guards, `SYN_CATALOG` + `titleMatchesArtwork`, `labels.ts`                                               | open + packet-ready + no proof + creds + images + catalog-live; caps via 12h claim cadence                  |
| Social Rule 2 (synthetic-proof) | hand-draft reshare + hand-approve | auto-create born-packet-ready draft + auto-approve best-fit target                             | `reshare.ts` (`buildReshareBody`, `reshareScore`), ledger `reshareOf`, `PANTA_RESHARE_CAPS` 4/wk + 2/platform + 48h/48h | durable GitHub-state cap check (proof-carrying pnt issues, 7d); no double-reshare via `Reshare-Of` scan     |
| Blog discovery                  | hand-pick backlog                 | `content:discover` proposes only frozen-backlog titles missing file+issue (≤5/run)             | `backlog.ts` (frozen), `inventory.ts`, `content-topic.yml` schema                                                       | never invents/rewrites titles; dup-detect vs open issues                                                    |
| Campaign ingest                 | hand-POST after merge             | `campaign-auto-ingest.yml` on `features/blog/content/**` push (fail-soft)                      | `POST /api/campaigns/ingest` (dedupes by URL)                                                                           | hourly tick reconciles if push hook misses                                                                  |
| Campaign promote                | hand-pick objective/channels      | `campaign-autopilot` promotes unpromoted sources w/ deterministic defaults (dry-run default)   | `promoteContent`, `approveCampaign`, `runCampaignTick`, `requiresApproval`                                              | L1/L2 stages approval (same path as human); L3+ only auto-approves; store persisted only on `--apply`       |
| Proof verification              | hand-open permalinks              | `social:verify` checks open proofs (Graph page-token for FB, HEAD for IG)                      | `graph.ts` patterns                                                                                                     | `unverified` is informational only — never evidence of removal; never closes issues                         |
| Readiness                       | hand-check envs                   | `integration:readiness` presence-only report (no values printed)                               | `channels.ts`, `projects.ts`, Graph `/me`                                                                               | presence ≠ validity; expired OAuth still fails honestly at publish                                          |
| Watchdog                        | hand-scan queues                  | `watchdog` detects stale claims (>7d), screenshot SLA (>72h), backlog growth                   | `labels.ts` states, `gh issue list`                                                                                     | report-only default; `--create-issue` files durable triage issue                                            |
| Weekly summary                  | hand-compile                      | `social-weekly.yml` Mon 08:05 UTC: `report-weekly --dry-run` + watchdog                        | `report-weekly.ts` (nulls, never zero)                                                                                  | no writes/commits; read the run summary                                                                     |
| Social copy budgets             | long templated captions           | hook ≤100 chars + 4–10 wds, body 6–14 wds, CTA 1–4 wds, total ≤28; IG ≤3 tags, FB 0            | `VOICE_MEMORY` voice rules, caption lint, skill never-do openers                                                        | hard limits fail, targets warn; existing published copy untouched                                           |
| Social reshare bridge           | "From what I'm building… kept…"   | `Via @<app>.` factual tail, verbatim source hook (≤100 chars)                                  | `Reshare-Of`/`Original-Post`/Media metadata, UTM naming, `reshareOf` ledger rules                                       | no source/copy/image changes; attribution via metadata                                                      |
| Social copy audit               | no social slop checks             | pass/warn/fail on budgets, voice, fidelity, anti-slop scan, repetition                         | anti-slop engine (`scanText`+gate, scan-only), `titleMatchesArtwork`, `SYN_CATALOG`                                     | fail → `needs_review`, blocks auto-approve + publish; historical calibration: 19 posts → 13/5/1 (untouched) |
| Nightly synthetic loop          | hand-run each stage               | gallery poll → issues → packets → SYN slots → FB native schedule / IG slot crons → audit-close | public gallery API (no new deps), `auto-packet --no-reapprove`, `publish-due --schedule-at/--due`, Graph verify         | 23 slots/wk ≈ 3.3/day FIFO deduped; kill switch `social.nightly.enabled=false`                              |

## Remaining manual gates (explicit, not hidden)

1. **Production blog merge** — PRs still require human merge; no auto-merge enabled.
2. **Screenshot close** — `needs-screenshot` → `published/done` needs a logged-in screenshot pasted via `publish-due --screenshot-url`. No automation exists or is claimed.
3. **Blocked channels** — Pinterest/X/LinkedIn/YouTube need owner OAuth; Reddit stays manual-only by policy. Issues park at `packet-ready` honestly.
4. **Project boards** — `PROJECTS_TOKEN` (Projects read/write PAT) + per-app `PROJECT_*` secrets missing in CI; boards skip while the queue works. Set secrets to restore placement.
5. **Campaign adapters** — Website/LinkedIn/Email envs unset; Campaign OS channels report `disconnected` (correct, not a failure).
6. **Metrics depth** — platform APIs without granted insights scopes return nulls; manual intake remains the fallback. No synthesized metrics anywhere.
7. **P0/sensitive/novel content** — discovery proposes, research/drafting stays human; first-of-kind creative stays gated for review.
8. **State durability** — Campaign OS remains in-memory + JSON snapshot; Postgres migration exists but is intentionally not wired (audit: adequate at current volume).

## Kill switches (per-policy, immediate)

- Social auto-label: pause `social-auto-approve.yml` (Actions → Disable) or set `social.rules.galleryLive/syntheticProof=false` in `config/automation/policy.ts`.
- Social copy audit: set `social.audit.enabled=false` (audit skipped, budgets unenforced).
- Nightly synthetic loop: set `social.nightly.enabled=false` (intake refuses `--apply`) or disable `social-nightly.yml` + `social-ig-slots.yml`.
- Campaign auto-promote: set `campaign.autoPromoteDeterministic=false` or stop approving L3+ autonomy.
- Discovery: `content.maxNewTopicsPerRun=0`.
- All schedules: `workflow_dispatch` remains for manual dry-runs (`--dry-run` default everywhere except the scheduled apply paths).
