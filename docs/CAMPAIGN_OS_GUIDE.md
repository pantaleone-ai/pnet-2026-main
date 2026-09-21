# Campaign OS Guide — for humans and agents

How the autonomous campaign system on pantaleone.net works, how to operate
it, and how to extend it without breaking it.

- **Humans**: read top to bottom. Section 5 alone runs the whole loop.
- **Agents**: each section stands alone. Before changing code, read section
  12 (file map) and section 14 (rules). Before touching blog content, read
  `docs/CONTENT_ENGINE.md` first — it outranks this guide.
- **Operators**: `docs/CAMPAIGN_OS.md` is the terse runbook; this is the
  explanation. Provenance of vendored code: `modules/campaign-os/PROVENANCE.md`.

## 1. The big idea

A campaign turns something you already wrote (a blog post) into
channel-native assets (website article, LinkedIn post, email), publishes
them on schedule, measures what happens, and records what it learned — so
the next campaign starts smarter. The loop is:

```
Source content → Promote → Generate → QA → Approve → Schedule
     → Publish (tick) → Measure → Learn → (next campaign)
```

Three design rules govern everything:

1. **The app understands the campaign; schedulers only trigger it.** All
   strategy, memory, and QA live in this codebase. Nothing that decides
   *what* or *why* lives in GitHub Actions, n8n, or any timer.
2. **Never fake a publication.** A channel with no credentials reports
   `disconnected` and its publications fail honestly. Partial success is
   normal: one failed channel never sinks the others.
3. **Retries can never double-publish.** Every publication carries an
   idempotency key (`campaign:asset:channel:version`). Re-running any step
   is always safe.

## 2. Core concepts

| Concept | What it is | Where it lives |
|---|---|---|
| Brand | Voice + strategy memory (tone, banned terms, audiences, positioning, frequency limits, autonomy level). Never hard-code voice into prompts — configure it here. | `store.data.brands` |
| Source content | Raw material: blog posts imported by URL. Campaigns always trace back to one. | `store.data.sourceContent` |
| Campaign | One objective, one strategy, one time window. Has a lifecycle status (section 3). | `store.data.campaigns` |
| Strategy | Structured plan: objective, audience, primary + supporting messages, CTA, channels, cadence, experiments. JSON, never vague prose. | `campaign.strategy` |
| Asset | One channel-native artifact (e.g. a LinkedIn post). Generated per-channel, never copy-pasted across channels. | `store.data.assets` |
| Publication | One scheduled send of one asset to one channel. The unit of publishing, retry, and metrics. | `store.data.publications` |
| Metric | One measurement on one publication (`clicks`, `impressions`, …). | `store.data.metrics` |
| Learning | Evidence-based conclusion from performance (`channel X converts above baseline → do more`). Never a silent rewrite. | `store.data.learnings` |
| Experiment | Controlled comparison (control vs variant, one success metric). Returns `insufficient_data` below sample threshold instead of guessing. | `store.data.experiments` |
| Opportunity | Suggested next action: unpromoted content, stale campaign. Deduped — one open row per source. | `store.data.opportunities` |
| Approval | Human gate for autonomy L1/L2. | `store.data.approvals` |
| Event / audit log | Append-only trail: every decision links asset → agent execution → audit → event → publication → metric. | `store.data.events`, `store.data.auditLogs` |

## 3. Lifecycles

Campaign: `draft → planning → generating → review → approved → scheduled
→ active`, with `paused` (↔ `active`), `completed`, `failed`, `archived`
as exits. Invalid jumps return `400` (e.g. `draft → active`).

Asset: `draft → qa → pending_approval → approved → scheduled →
publishing → published`, with `needs_revision` (QA revise/block) and
`failed` as side exits. QA `block` never deletes — it parks the asset for
a human.

Publication: `queued → publishing → published`, or `failed` (kept, with
error text, for diagnosis). A `published` record is never re-executed:
re-POSTing execute returns the existing `external_id`.

## 4. Autonomy levels

Set per brand, overridable per campaign. L1 assist, L2 approve (default),
L3 autonomous, L4 autonomous-optimization. L1/L2 always stage approvals
and wait for `POST …/approve`; L3+ auto-approve via the same code path
(so the audit trail looks identical). Only L4 may auto-apply learnings.

## 5. Running the loop (humans)

```bash
BASE=https://pantaleone.net   # or http://localhost:1410 for dev

# 1. Ingest blog posts as source content (deduplicates by URL)
curl -X POST $BASE/api/campaigns/ingest \
  -H 'Content-Type: application/json' -d '{"limit":50}'

# 2. Promote This: pick the newest source by default, or pass brand_id /
#    source_content_id explicitly
curl -X POST $BASE/api/campaigns \
  -H 'Content-Type: application/json' \
  -d '{"objective":"Leads","channels":["website","linkedin","email"],
       "duration_days":14,"autonomy_level":2}'

# 3. Inspect, then approve (schedules publications)
curl $BASE/api/campaigns/<CAMPAIGN_ID>
curl -X POST $BASE/api/campaigns/<CAMPAIGN_ID>/approve \
  -H 'Content-Type: application/json' -d '{"reviewer":"you@pantaleone.net"}'

# 4. Publish due items (cron replacement — safe to run any time, any frequency)
curl -X POST $BASE/api/campaigns/tick \
  -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
  -H 'Content-Type: application/json' -d '{"limit":25}'

# 5. Record metrics, then learn
curl -X POST $BASE/api/metrics \
  -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"publication_id":"<PUB_ID>","metric_type":"clicks","metric_value":42}'
curl -X POST $BASE/api/campaigns/<CAMPAIGN_ID>/optimize

# 6. Watch (no auth — counts only, safe for uptime monitors)
curl $BASE/api/campaigns/health
curl $BASE/api/channels
```

Objectives are free text but conventionally one of
`Awareness | Engagement | Traffic | Leads | Sales`.

## 6. Running the loop (agents, in-process)

For scripts and tests, skip HTTP and use the engine directly:

```ts
import { CampaignStore } from "@/modules/campaign-os/src/store";
import {
  approveCampaign,
  executePublication,
  promoteContent,
} from "@/modules/campaign-os/src/engine";
import { runCampaignTick } from "@/lib/campaign/scheduler";

const store = new CampaignStore();
// …create org/brand/source (see scripts/campaign-test.ts makeBrand)…
const { campaign, assets } = await promoteContent(store, brand, source, {
  objective: "Leads",
  channels: ["website", "linkedin", "email"],
  durationDays: 14,
  autonomyLevel: 2,
});
await approveCampaign(store, brand, campaign.id, "agent");
await runCampaignTick(store, { limit: 25 }); // due publications + opportunities
```

In Next.js routes, never construct a store — use
`getCampaignStore()` from `@/lib/campaign/store` (process-wide singleton,
seeded, snapshot-backed) and call `persistCampaignStore()` after mutations.

## 7. The agents

All agents return validated structured JSON and record an execution
(agent, prompt version, model, duration) for traceability. With no AI keys
set, strategy/generation agents fall back to deterministic local synthesis
so the pipeline — and `npm run campaign:test` — works offline.

| Agent | Job | File |
|---|---|---|
| content-intelligence | Extract ideas, topics, claims, CTAs, angles from source | `agents/content-intelligence` |
| strategist | Build the structured strategy from analysis + brand memory + history | `agents/strategist` |
| content-factory | Generate one channel-native asset per channel | `agents/factory` |
| qa | Score every asset `{pass, revise, block}` with explicit criteria | `agents/qa` |
| optimization | Aggregate performance → patterns + learnings | `agents/optimization` |
| opportunity | Find unpromoted content and stale campaigns | `agents/optimization` |

Prompts are versioned builtins in `src/prompts.ts` (upstream also supports
file-first prompts under `data/prompts/campaign/` — not vendored).

## 8. QA rules (what gets blocked)

Banned AI phrasing (`unlock`, `revolutionize`, `game-changing`,
`seamlessly`, `delve`, …) plus the brand's own prohibited terms; missing
CTA; channel misfit (X > 280 chars, bloated LinkedIn post, email without
subject); placeholders (`lorem ipsum`, `TODO`, `[insert]`); missing UTM /
canonical link on website and email assets. Score ≥ 80 passes, 55–79
revises, below blocks. QA never edits — it scores and suggests.

## 9. Scheduling without cron

There is no background daemon and no Vercel Cron. All due work is computed
at call time by `runCampaignTick`:

1. Find publications `queued`, due (`scheduled_at <= now`), attempts < 3.
2. Execute each via its channel adapter (3-attempt backoff inside).
3. Refresh opportunities (deduped — section 2).
4. Return a summary `{due, executed, published, failed, failures,
   opportunities_open}`.

Triggers, in order of preference: GitHub Actions hourly
(`.github/workflows/campaign-tick.yml`, free, manual dispatch included);
`npm run campaign:tick` anywhere with repo access; self-hosted n8n against
the same endpoint (contract unchanged). A monitor hitting
`GET /api/campaigns/health` detects backlog (`publications_due`) without
auth and without side effects.

## 10. Channels

Website, LinkedIn, and email have real adapters; X/Instagram/Facebook/
YouTube are scaffolded (capabilities declared, `connected: false` with
setup requirements). Configure via env (`WEBSITE_API_BASE/TOKEN`,
`LINKEDIN_ACCESS_TOKEN/PERSON_URN`, `EMAIL_PROVIDER_API_KEY/FROM` —
see `env.template`). `GET /api/channels` is the single source of truth;
believe it over any assumption.

## 11. Auth model

Two tiers. UI/read and campaign-management endpoints are app-session
endpoints (rate-limited per IP, no secret). Automation endpoints (`tick`,
`publications/:id/execute`, `metrics`, `n8n/events`) require
`Authorization: Bearer $N8N_WEBHOOK_SECRET` (or `x-webhook-secret`).
When the secret is unset, machine endpoints are open — local dev only;
set it in every real environment or `401`s will surprise you in reverse
(they won't fire at all).

## 12. File map

```
modules/campaign-os/src/   Vendored engine (zero deps). Treat as read-only
  store | engine | autonomy | ai-provider | prompts | types
  agents/                   Reasoning (section 7)
  channels/                 real + scaffold adapters (section 10)
  lib/                      utm | scheduling | fatigue | engine-utils
  api/contract              Reference contract (routes reimplement it)
modules/campaign-os/migrations/  Postgres schema for the durable path
lib/campaign/               The seam: store, scheduler, http, validation
app/api/campaigns/          Loop endpoints + tick/health/ingest/search
app/api/{publications,metrics,opportunities,channels,attribution,
         experiments,n8n}/  Remaining contract endpoints
scripts/campaign-test.ts    9-group verification (npm run campaign:test)
scripts/campaign-tick.ts    Tick CLI (npm run campaign:tick [--dry-run])
.github/workflows/campaign-tick.yml  Hourly production trigger
```

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `400 no brand / no source content` | Empty store (fresh instance) | `POST /api/campaigns/ingest` first |
| `400 invalid campaign transition` | Skipped lifecycle step | Follow section 3 order; use pause/resume |
| Publish `502 ... not connected` | Channel env unset | Expected until configured; other channels unaffected |
| `401 unauthorized` | `N8N_WEBHOOK_SECRET` mismatch | Match app env and caller (Actions secret, n8n env) |
| `insufficient_data` experiment | Below sample threshold | Correct behavior — collect more metrics |
| Opportunities growing unboundedly | Pre-dedupe behavior | Already fixed by `detectOpportunitiesDeduped`; check the caller uses it |
| Tick does nothing (`due: 0`) | Nothing scheduled yet, or all failed 3× | Approve a campaign; inspect `failures[].error` |

## 14. Rules for agents changing this system

1. **The seam is `lib/campaign/`.** Routes import the engine only through
   it. Never import vendored internals directly from a route except the
   engine entry points already used.
2. **Brain stays in the app.** No strategy, prompts, QA reasoning, or
   memory in timers, workflows, or edge config. Triggers call endpoints;
   endpoints run the engine.
3. **Never fake success.** A channel you cannot publish to returns
   `connected: false` and honest errors. Scaffolding is a feature.
4. **Vendored code is read-only.** Fix upstream first, re-vendor
   file-by-file, reapply the adaptations listed in `PROVENANCE.md`.
   New agents/channels follow the upstream extension pattern (validated
   JSON out; `connected()` false until real).
5. **Respect the content engine.** Blog posts are source material, not
   campaign copy. Don't invent experience, customers, or metrics, and run
   `npm run content:validate` if you touch `features/blog/content`.
6. **Verify like this:** `npm run campaign:test` (engine),
   `npm run check-types` (whole app), prod `npm run build` before
   pushing. Prettier-write any files you touch.
