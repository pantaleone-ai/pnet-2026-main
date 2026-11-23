# Data-analysis adapter — how upstream thinking maps to pnet warehouse

Upstream assumes an interactive analyst with a warehouse MCP connection.
Here the always-on loop is deterministic: `growth-analyze.ts` runs the
`analyze` workflow (understand → gather → analyze → **validate** → present)
on a schedule, and every proposal lands in
`social_reporting.insight_recommendations` with `approval_status='proposed'`.
Humans move rows to `approved`/`testing`/`decided`. Paid never auto-approves
(matches `docs/SOCIAL_ADVERTISING_PLAYBOOK.md` `paidAutoApprove=false`).

## Allowed imports (methodology, not infrastructure)

- `analyze` → check order in `growth-analyze.ts`: freshness gate first
  (stale data fails everything downstream), then winners, then paid
  efficiency, then data-quality. One question per check, evidence attached.
- `validate-data` → every proposed row must pass before insert:
  row-count sanity, null handling (nulls stay null, never zero),
  magnitude check (spend ≥ 0, rates 0–100%), dedupe-key check
  (entity_id, metric_name, metric_scope, DATE(snapshot_at), period_start),
  subtotals-sum-to-total. Confidence is `ok` / `low-evidence:<reason>` /
  `unavailable:<reason>` — never inflated.
- `sql-queries` → BigQuery section only. Partition filter on `snapshot_at`
  (observations are date-partitioned) in every scan. `SAFE_DIVIDE` for all
  rates. CTEs over nested subqueries.
- `statistical-analysis` → WoW deltas need ≥7 days each side before a trend
  claim; with <30d of paid history, report ranges not points, and mark
  `low-evidence`. Never average pre-aggregated averages (paid fragments
  must be `SUM`med to campaign-day grain first).
- `performance-report` → weekly/monthly report shape (exec summary, metric
  table vs prior period, worked / needs-improvement, 2x2 prioritized recs).
  Benchmarks table is reference only — our baselines come from our own
  history, not upstream generic ranges.
- Taxonomy v1 (`docs/TAXONOMY.md`): checks 3–5 read
  `v_observations_canonical` (platform_group / metric_family /
  scope_canonical); raw tables are never mutated. New `taxonomy-coverage`
  check keeps mapping at 100%.

## Warehouse map (the only tables the loop reads/writes)

Read: `social_metric_observations`, `social_posts`, `dim_campaigns`,
`dim_content`, `ads_raw_google.ads_*` views, `ingest_runs`.
Write: `insight_recommendations` (MERGE on `recommendation_id`, insert-only),
`ingest_runs` (append). Staging: `stg_recommendations` (`--replace`).

## Forbidden in the loop

Fabricated metrics, backfilled `confidence='ok'`, touching organic naming or
attribution, auto-approving paid spend, averaging averages, comparing partial
periods to full periods (Ads data lags ~1 day — exclude today).
