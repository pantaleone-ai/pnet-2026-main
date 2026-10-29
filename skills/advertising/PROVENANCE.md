# PROVENANCE — advertising-skills vendor

Upstream: https://github.com/realkimbarrett/advertising-skills
Pinned SHA: `45f4a4a1dabe24113193369b55b929b1de4ff04a`
Vendored: 2026-10-29 (v1.0 per upstream VERSIONS.md)
License: MIT (upstream)

## What was vendored

Read-only copy under `skills/advertising/upstream/`:

- `skills/` — 12 real SKILL.md files across 5 categories
- `skills/*/…/references/` — 3 reference files (awareness-stages, mechanism-patterns, funnel-types)
- `examples/` — 2 example files
- `README.upstream.md`, `AGENTS.upstream.md`, `VERSIONS.upstream.md`

## What was NOT vendored as real

Upstream README advertises ~26 skills. Only 12 exist on disk.
Missing (README-only, aspirational): voice-of-customer-miner,
proof-harvester, positioning-core, market-sophistication-analyzer,
dominant-desire-extractor, close-architect, landing-page-architect,
email-sequence-architect, testing-roadmap, claim-checker,
consistency-auditor, final-polish, booked-call-campaign-orchestrator,
campaign-diagnosis-orchestrator.

Local equivalents cover the missing QA scope: editorial audit,
anti-slop engine, social-audit source-fidelity + budgets.

## Update policy

Weekly read-only check via `.github/workflows/advertising-sync.yml`.
Manual re-vendor on new upstream SHA. Never edit files under
`upstream/` — adapt in `lib/social-growth/advertising-adapter.ts`.
