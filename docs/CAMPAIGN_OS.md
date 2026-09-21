# Campaign OS on pantaleone.net

> New here? Start with `docs/CAMPAIGN_OS_GUIDE.md` (how the system works,
> for humans and agents). This file is the terse operator runbook.

Autonomous campaign loop (Publish → Measure → Learn → Improve) integrated
without Vercel Cron, without a database migration, and without touching the
public static site.

## Evaluation summary

The upstream module (`@forwardos/campaign-os`) separates brain from
execution: the app owns state/memory/analytics, agents own reasoning, and
the scheduler only triggers API calls. That separation is what makes a
cron-free port possible — every timed behavior collapses into one
idempotent operation.

| Upstream assumption | This port |
|---|---|
| Workspace package + `transpilePackages` | Vendored `modules/campaign-os/src` (zero deps, tree-shaken per route) |
| Postgres for durability | In-memory singleton + best-effort JSON snapshot (`CAMPAIGN_SNAPSHOT_PATH`, default `data/campaign-os.snapshot.json`, gitignored). SQL migration kept at `modules/campaign-os/migrations/` for later |
| n8n workflows for scheduling | `POST /api/campaigns/tick` + GitHub Actions hourly (`.github/workflows/campaign-tick.yml`) + `npm run campaign:tick` CLI |
| Next.js dashboard at `/campaigns` | API-only. No public UI, so CDN caching and SEO are untouched |
| File-first prompts in `data/prompts` | Versioned builtins in `src/prompts.ts` (identical fallback behavior) |

## Operating the loop

1. **Ingest** — `POST /api/campaigns/ingest` imports blog posts as source
   content (dedupes by URL). Run after publishing new posts.
2. **Promote This** — `POST /api/campaigns` with `{objective, channels,
   duration_days, autonomy_level}`. Generates channel-native assets,
   QA-scores them, and stages approvals (autonomy L1/L2).
3. **Approve** — `POST /api/campaigns/:id/approve` schedules publications.
4. **Tick (the cron replacement)** — `POST /api/campaigns/tick` executes
   due publications (idempotency-keyed, 3-attempt backoff) and refreshes
   opportunities. Triggers, in order of preference:
   - GitHub Actions hourly (no Vercel Cron, free, manual `workflow_dispatch`);
   - `npm run campaign:tick` on any machine with repo access;
   - self-hosted n8n calling the same endpoint (optional, unchanged contract).
5. **Measure → Learn** — `POST /api/metrics` (machine), then
   `POST /api/campaigns/:id/optimize` for evidence-based learnings.
6. **Watch** — `GET /api/campaigns/health` (public, counts only) for uptime
   monitors; `GET /api/channels` always reports honest connectivity.

## Endpoint map

Same contract as upstream `docs/API.md`, plus this port's additions:

- `GET/POST /api/campaigns`, `GET /api/campaigns/:id`
- `POST /api/campaigns/:id/approve|pause|resume|optimize`
- `POST /api/campaigns/tick` (machine), `GET /api/campaigns/health`
- `POST /api/campaigns/ingest`, `GET /api/campaigns/search?q=`
- `POST /api/publications/:id/execute` (machine)
- `POST /api/metrics` (machine)
- `GET /api/opportunities`, `POST /api/opportunities/detect`
- `GET /api/channels`, `GET /api/attribution/:publicationId`
- `POST /api/experiments/:id/evaluate`, `POST /api/n8n/events` (machine)

Machine auth: `Authorization: Bearer $N8N_WEBHOOK_SECRET` (or
`x-webhook-secret`). Open only when the secret is unset (local dev).

## Channels

Website, LinkedIn, and email have real adapters that report `disconnected`
until configured — never fake success. X/Instagram/Facebook/YouTube are
scaffolded with setup requirements. See `GET /api/channels`.

## Going durable (Postgres)

When campaign volume outgrows instance memory: apply
`modules/campaign-os/migrations/002_campaign_os.sql` and swap the
`CampaignStore` backing behind the same method surface (`lib/campaign/store.ts`
is the seam). No route changes needed.
