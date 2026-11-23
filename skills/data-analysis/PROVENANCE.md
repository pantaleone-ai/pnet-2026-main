# PROVENANCE — data-analysis vendor

Upstream: https://github.com/anthropics/knowledge-work-plugins
Pinned: `main` as of 2026-11-12 (no version tags upstream; re-pin on re-vendor)
License: Apache-2.0 (upstream)

## What was vendored

Read-only copies under `skills/data-analysis/upstream/` (byte-exact via
`raw.githubusercontent.com`, never hand-transcribed):

- `data/skills/analyze/SKILL.md` — `/analyze` investigate → validate → present
- `data/skills/validate-data/SKILL.md` — pre-delivery QA checklist + pitfall catalog
- `data/skills/sql-queries/SKILL.md` — dialect reference (we use BigQuery section only)
- `data/skills/statistical-analysis/SKILL.md` — descriptives, trends, outliers, testing
- `data/README.upstream.md`, `data/.mcp.upstream.json` — connector inventory
  (upstream BigQuery MCP `https://bigquery.googleapis.com/mcp`; we use
  `bq` CLI + WIF instead — no MCP dependency added)
- `marketing/skills/performance-report/SKILL.md` — report structure, benchmarks,
  optimization-levers-by-funnel-stage, testing best practices

## What was NOT vendored

- `data/skills/{build-dashboard,create-viz,data-context-extractor,data-visualization,explore-data}`
  — viz/dashboard output deferred until recommendations loop is proven.
  Re-vendor when the loop needs charts.
- `marketing/skills/{brand-review,campaign-plan,competitive-brief,content-creation,draft-content,email-sequence,seo-audit}`
  — creation-side skills stay in `skills/advertising/`; this package is
  analysis-only. `campaign-plan` may join later for the plan-back step.

## Update policy

Manual re-vendor on upstream change. Never edit files under `upstream/` —
adapt in `ADAPTER.md` + `scripts/social-issues/analyze/growth-analyze.ts`.
