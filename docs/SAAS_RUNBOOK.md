# Pantaleone Chat SaaS — Runbook

> Lockfile rule (learned 2026-11-25): NEVER run npm with
> `legacy-peer-deps=true` in this repo (a stale global `~/.npmrc` once
> caused exactly this). It makes npm skip optional peer subtrees when
> writing `package-lock.json`, while CI (strict, no such flag) demands
> them — `npm ci` then fails with "Missing ... from lock file" even
> though every local check passes. If CI ever reports that class of
> error again: regenerate the lock strictly
> (`rm -rf node_modules && npm install` with default settings),
> verify locally (`npm ci`, typecheck, tests, build, preview + eval),
> then commit.

## Resources (all provisioned 2026-11-25)

D1 (chat data):
- `pantaleone-chat-dev` — `648e9d0b-364c-4a51-8364-d93c9ae90470`
- `pantaleone-chat-staging` — `46df8b0c-3cf0-42e4-a914-022fe6fcd05f`
- `pantaleone-chat-prod` — `62f4e755-4aa9-4ea7-b1c4-673b17c9c64d`

R2 (knowledge uploads; cache bucket untouched):
- `pantaleone-chat-uploads{,-staging,-dev}`

KV:
- `CHAT_ANALYTICS` = `b811d0f5bc4a40b1a5c86ac8ff33af64` (existing single-tenant analytics)
- `CHAT_PLATFORM` = `59c956ebc41f45838fa7d5443f2a24b9` (+`-staging` `-dev` variants — see wrangler.jsonc)

> 2026-11-26 lesson: every hand-transcribed binding ID in wrangler.jsonc
> must be verified with `wrangler <type> list` before it can block a
> deploy. This bit us three times (staging KV, prod KV, prod D1 — all
> transcription errors, all caught only at deploy). Never trust a pasted
> ID; always list.

Queues: `chat-ingest{,-staging,-dev}` + dead-letter queues (ingest worker lands in P3).

Worker bindings: see `wrangler.jsonc`. Environments split per env
(top-level = production; `env.staging` / `env.development` override D1,
KV, R2, queues, AI, cache, and observability). `npm run deploy` stays
prod; `preview`/`upload` target dev. Per-env secrets required:
BETTER_AUTH_SECRET set for dev + staging (+prod already). RESEND_API_KEY
is prod-only — set it on staging/dev before any SaaS email test there.
TURNSTILE_SECRET_KEY set on all three envs (2026-11-26).

Secrets (set via `wrangler secret put [--env X]`; never commit):
- `BETTER_AUTH_SECRET` — set for prod + dev + staging (unique per env)
- `RESEND_API_KEY` — prod only (contact form + SaaS emails); owner must set on staging/dev for SaaS email tests
- `BETTER_AUTH_URL` — wrangler vars: prod `https://www.pantaleone.net`, staging/dev worker URLs (set 2026-11-26)
- `TURNSTILE_SECRET_KEY` — set on all envs (2026-11-26); build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a GitHub Actions secret (set 2026-11-26) wired via `cf-deploy.yml`

Secrets (set via `wrangler secret put [--env X]`; never commit):
- `BETTER_AUTH_SECRET` — set for prod + dev + staging (unique per env)
- `RESEND_API_KEY` — pre-existing on prod only (contact form); owner must set per env for SaaS emails
- `TURNSTILE_SECRET_KEY` + build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — owner creates the widget, then set per env
- Owner actions still open: verify `pantaleone.net` in Resend (DNS records),
  one manual end-to-end signup to validate the verification email path.

## Migrations

```bash
npm run db:generate                    # schema -> drizzle/migrations/*.sql
npm run db:apply:dev                   # apply to pantaleone-chat-dev
npx wrangler d1 migrations apply pantaleone-chat-staging --remote --env staging   # at staging deploy (see note below)
npx wrangler d1 migrations apply pantaleone-chat-prod --remote                     # at launch
```

> 2026-11-26 anomaly: `migrations apply` against the staging DB fails
> with `7404 database could not be found` even though `d1 info` and
> plain `d1 execute` succeed against the same ID, and the identical
> migration applied cleanly to dev. Likely a wrangler/API quirk with
> never-migrated databases. If it persists at deploy time: verify with
> `wrangler d1 execute <db> --remote --env <env> --command "SELECT 1"`,
> retry, and as a last resort run the SQL via the Cloudflare dashboard
> SQL editor and mark the journal entry applied (check
> `migrations list` first) rather than letting a broken CLI block a
> deploy. Same procedure applies to prod at launch.

Never edit an applied migration. Auth tables mirror better-auth defaults;
if better-auth upgrades change the schema, generate a new migration.

## Verified 2026-11-25 (preview deploy, dev DB)

- `tsc`, `eslint`, `vitest run` (23 tests: SSRF guards + validation) green
- Production `build` + versioned Cloudflare upload green
- `/signup` 200, `/dashboard` 307s when unauthenticated
- Signup creates user + org (owner) + draft chatbot in D1 (queried directly)
- Login blocked pre-verification with clear error; duplicate signup creates nothing; short password rejected server-side
- Test data cleaned out of the dev DB afterwards

## Ingest worker (P3b, 2026-11-27)

- `workers/ingest/` — plain Cloudflare Worker (NOT OpenNext): consumes
  `chat-ingest[-env]` queues, runs the extraction pipeline, sweeps stuck
  jobs on `*/15` cron. Own config `wrangler.ingest.jsonc` (dev/staging/prod
  D1 IDs verified against `d1 list`; shared `pantaleone-chat-index-saas`
  1024-dim cosine index; per-env `ENV_NAME` var for metadata isolation).
- Pipeline per job: load source (missing = ack, org mismatch = throw) →
  ready-check idempotency → status=processing → wipe prior docs/chunks +
  vectors → extract (website/sitemap crawl, R2 file, FAQ JSON) → chunk →
  embed (`@cf/qwen/qwen3-embedding-0.6b`, batches of 50) → upsert with
  `{organization_id, chatbot_id, source_id, document_id, env}` metadata →
  D1 records → ready + page_count. Any failure → status=failed + error,
  rethrow for queue retry → DLQ.
- Crawl: sitemap.xml discovery (urlset + one-level sitemapindex), robots.txt
  (correct most-specific-group precedence), bounded BFS (200 pages, depth 3,
  4-way concurrency), manual redirects (5 hops, each re-validated with DNS),
  2MB/page cap, same-origin + excluded-paths scoping, exact-dup skipping.
- Critical Vectorize finding: metadata filters silently match NOTHING until
  a metadata index exists per property AND the vectors were inserted after
  it. Created indexes for organization_id/chatbot_id/source_id/document_id/
  env on the SaaS index — BEFORE any production ingestion. Proven: same
  query returns count:1 with the right org filter, count:0 with wrong org.
  Lesson: never add a filterable property without its metadata index, and
  re-index after adding one.
- D1 timestamp mode stores SECONDS (drizzle converts Date<->seconds), not
  millis. Hand-written SQL fixtures must use seconds or time comparisons
  (sweep cutoff) silently miss.
- `npx opennextjs-cloudflare deploy` does NOT build — it reuses
  `.open-next/`. Always `build` first (or use the `npm run` scripts);
  a stale deploy serves old pages with zero errors. Verified 2026-11-27
  for the fourth time (tenant-chat logging fix initially tested stale).
- R2 incremental-cache population fails with Worker 500s under default
  concurrency (rate limiting). Deploy with `--cacheChunkSize 5` when it
  flakes: `npx opennextjs-cloudflare deploy --env development
  --cacheChunkSize 5`. Direct R2 put/delete works fine when this happens,
  so it is uploader-side, not storage-side.
- Web-worker envs need their own `ENV_NAME` var (production/staging/
  development in wrangler.jsonc) — the tenant retrieval filter uses it,
  and a wrong default silently scopes every query to the wrong env
  (empty results, zero errors). The ingest worker already had it.

## Verified 2026-11-26 (commercial pricing, PR #397 — live on www)

- `config/plans.ts` is the single source of truth: Starter $29 / Growth
  $79 (recommended) / Pro $199 / Agency $499, monthly default, annual =
  10x monthly (2 months free). AI-reply allowances 1k/4k/12k/40k, pooled,
  reset monthly.
- `config/plans.test.ts` (7 tests): annual math, reply allowances, agency
  marketability guard (white-label / client-level / cross-client never
  render), signup hrefs, plan validation, USD formatting.
- Landing page: toggle, buyer + outcome per tier, plan CTAs to
  `/signup?plan=&billing=` (agency to contact), comparison table, AI-reply
  definition, no-surprise-billing policy, usage FAQ, priced Offer JSON-LD.
- Signup/login accept + preserve `?plan=`/`?billing=` for the P5 handoff.
- Gates: tsc, eslint (touched), vitest 30 pass, prod build 129 pages.
- Verified on dev worker (fresh build + deploy) and on www after the
  prod deploy + cache purge: all CTAs, prices, FAQ, guardrail (no
  "White-label" in HTML).
- NOT built (by spec guardrail, do not advertise): Stripe products/prices,
  checkout, entitlements, usage metering/alerts, add-ons (+1k replies
  $15, +assistant $15, remove branding $19, onboarding $299) — all P5/P6.
- Lesson: `npx opennextjs-cloudflare deploy` does NOT build — it reuses
  `.open-next/`. Always `build` first (or use the `npm run` scripts);
  a stale deploy serves old pages with zero errors.

## Verified 2026-11-26 (P1 landing + P2 auth completion, dev deploy)

- `tsc`, `eslint` (touched files), `vitest run` (23 pass), prod `build` (129 pages) green
- Deployed + promoted to `pantaleonenet-dev`; all routes live:
  `/custom-business-chatbot`, `/signup`, `/login`, `/verify-email`,
  `/forgot-password`, `/reset-password` → 200; `/dashboard` → 307 logged out
- Turnstile: missing token → 400 `MISSING_RESPONSE`; dummy token → 403
  `VERIFICATION_FAILED`; secret value validated via direct siteverify
  (`invalid-input-response` only, no `invalid-input-secret`)
- No test users created by the enforcement probes (D1 queried directly)
- `/api/chat` streaming intact on the new build (sources event + deltas)
- `/custom-business-chatbot` prerendered static, correct title + sitemap entry

## Not yet verified (needs owner)

1. One real signup → inbox click → login → dashboard on staging or prod
   (Resend domain is active; prod key exists. Staging/dev still need
   `RESEND_API_KEY` set: `printf '%s' "$KEY" | wrangler secret put
   RESEND_API_KEY --env staging` and same for `--env development`).
2. Turnstile browser end-to-end (server enforcement proven on dev
   2026-11-26: missing token → 400, dummy token → 403, secret value
   validated via siteverify `invalid-input-response`-only). Still needs:
   real invisible-challenge signup in a browser per env + confirming the
   widget's domain list covers `www.pantaleone.net`, the workers.dev
   hosts, and localhost.
3. Inbox delivery of verification + password-reset emails (needs #1).

## SaaS smoke test (run after any auth/schema change)

```bash
# 1. unit + types
npm run check-types && npm run test
# 2. fresh preview
npm run upload
# 3. against the preview URL:
#    - GET /signup -> 200, GET /dashboard -> 307
#    - POST /api/auth/sign-up/email -> user row created (check D1)
#    - POST /api/auth/sign-in/email pre-verification -> EMAIL_NOT_VERIFIED
# 4. delete test rows from the touched tables
```
