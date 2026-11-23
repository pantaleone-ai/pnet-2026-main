# Growth analysis loop (always-on)

Deterministic daily analysis over the warehouse. Methodology vendored from
`anthropics/knowledge-work-plugins` (`data`: analyze, validate-data,
sql-queries, statistical-analysis; `marketing`: performance-report) —
see `skills/data-analysis/` (PROVENANCE, ADAPTER). No LLM calls in the loop;
rules are code, evidence is SQL. Rollup ontology: `docs/TAXONOMY.md` v1.

## How it runs

`growth:analyze` (`scripts/social-issues/analyze/growth-analyze.ts`) executes
5 checks in `analyze`-skill order and writes proposed rows to
`insight_recommendations` (`approval_status='proposed'`, idempotent
`recommendation_id`s, insert-only MERGE, `taxonomy_version='v1'`) + `ingest_runs`:

1. **freshness** — per-platform `MAX(snapshot_at)` age; >2d proposes a
   data-quality rec (stale data fails everything downstream).
2. **dedupe** — dedupe-key violations (entity, metric, scope, day) in 14d;
   proposes a grain-fix rec, never silently aggregates.
3. **taxonomy-coverage** — `unmapped:*` metric families in
   `v_observations_canonical` last 7d; proposes a mapping rec (rollups stay
   complete, never silently drop).
4. **winner** — top-3 organic entities by 7d `metric_family='engagement'` in
   `v_observations_canonical` (replaces the pre-v1 hardcoded metric list);
   proposes a human-reviewed capped paid test (playbook: only promote organic
   winners, paid never auto-approves).
5. **paid** — 7d campaign stats from `ads_raw_google.ads_CampaignStats_*`;
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

## GA4 join (taxonomy v1)

Web behavior joins on `utm_campaign = campaign_id`, `utm_content = content_id`.
`lib/analytics.ts` attaches `app_id/campaign_id/content_id/platform_group/funnel_stage/taxonomy_version`
as GA4 default params (`gtag('set')` per route via `usePageTracking`, plus
`growth.trackActivation` fan-out). Register the 5 as GA4 event-scoped custom
dimensions (Admin → Custom definitions, one-time console step). Web side stays
in GA4 BigQuery exports (`analytics_*`); media side is
`v_observations_canonical`. No new export, no event renames.

## Human loop

Query `insight_recommendations WHERE approval_status='proposed'`, move rows
to `approved` → `testing` (set `test_start`) → `decided` (`actual_result`,
`decision`). The loop never writes `approved` itself and never touches
spend, bids, or publish state.
