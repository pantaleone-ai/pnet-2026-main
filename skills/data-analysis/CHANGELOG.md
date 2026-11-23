# CHANGELOG — data-analysis

## 2026-11-23 — v1.1 taxonomy cutover

- Analyzer reads `v_observations_canonical` (winners by `metric_family`,
  new `taxonomy-coverage` check, `taxonomy_version='v1'` on all recs).
- Canonical view + `dim_metric_map` / `dim_platform_map` live in BQ.
- Paid re-merge: 18 legacy fragments → 36 canonical rows ($116.44 reconciled).

## 2026-11-12 — v0.1 init

- Vendored upstream (anthropics/knowledge-work-plugins, Apache-2.0):
  data `analyze`, `validate-data`, `sql-queries`, `statistical-analysis`;
  marketing `performance-report`. See PROVENANCE.md.
- Added `ADAPTER.md`: warehouse map, validation gate, loop rules.
- Added `scripts/social-issues/analyze/growth-analyze.ts` (4 deterministic
  checks → `insight_recommendations` proposed rows) +
  `.github/workflows/growth-analyze.yml` (daily, WIF, dry-run default).
