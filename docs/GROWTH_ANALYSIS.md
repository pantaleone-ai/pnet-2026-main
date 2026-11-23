# Growth analysis loop (always-on)

Deterministic daily analysis over the warehouse. Methodology vendored from
`anthropics/knowledge-work-plugins` (`data`: analyze, validate-data,
sql-queries, statistical-analysis; `marketing`: performance-report) —
see `skills/data-analysis/` (PROVENANCE, ADAPTER). No LLM calls in the loop;
rules are code, evidence is SQL.

## How it runs

`growth:analyze` (`scripts/social-issues/analyze/growth-analyze.ts`) executes
4 checks in `analyze`-skill order and writes proposed rows to
`insight_recommendations` (`approval_status='proposed'`, idempotent
`recommendation_id`s, insert-only MERGE) + `ingest_runs`:

1. **freshness** — per-platform `MAX(snapshot_at)` age; >2d proposes a
   data-quality rec (stale data fails everything downstream).
2. **dedupe** — dedupe-key violations (entity, metric, scope, day) in 14d;
   proposes a grain-fix rec, never silently aggregates.
3. **winner** — top-3 organic entities by 7d engagement
   (`saved/saves/shares/comments/outbound_clicks/pin_clicks`); proposes a
   human-reviewed capped paid test (playbook: only promote organic winners,
   paid never auto-approves).
4. **paid** — 7d campaign stats from `ads_raw_google.ads_CampaignStats_*`;
   flags ≥$10 zero-conversion spend. Short history ⇒ `low-evidence`.

Validation gate per row (`validate-data`): nulls stay null, magnitude sane,
subtotals reconcile, confidence `ok` / `low-evidence:*` / `unavailable:*`.

## Schedule

`.github/workflows/growth-analyze.yml` — daily 12:00 UTC (~08:00 ET, after
collects), same WIF SA as the collectors. Manual dispatch defaults to
`--dry-run`.

```bash
npm run growth:analyze -- --dry-run
```

## Human loop

Query `insight_recommendations WHERE approval_status='proposed'`, move rows
to `approved` → `testing` (set `test_start`) → `decided` (`actual_result`,
`decision`). The loop never writes `approved` itself and never touches
spend, bids, or publish state.
