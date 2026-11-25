# Pantaleone Chat SaaS — Runbook

## Resources (all provisioned 2026-11-25)

D1 (chat data):
- `pantaleone-chat-dev` — `648e9d0b-364c-4a51-8364-d93c9ae90470`
- `pantaleone-chat-staging` — `46df8b0b-3cf0-42e4-a914-022fe6fcd05f`
- `pantaleone-chat-prod` — `62f4e755-4aa9-4a51-8364-d93c9ae90470`

R2 (knowledge uploads; cache bucket untouched):
- `pantaleone-chat-uploads{,-staging,-dev}`

KV:
- `CHAT_ANALYTICS` = `b811d0f5bc4a40b1a5c86ac8ff33af64` (existing single-tenant analytics)
- `CHAT_PLATFORM` (+`-staging`, `-dev`) — SaaS metering/usage

Queues: `chat-ingest{,-staging,-dev}` + dead-letter queues (ingest worker lands in P3).

Worker bindings: see `wrangler.jsonc`. TEMPORARY all-envs-share-dev rule
for CHAT_DB/CHAT_UPLOADS/CHAT_PLATFORM/CHAT_INGEST — **split per-env
before any SaaS UI ships or chat.pantaleone.net resolves.**

Secrets (set via `wrangler secret put`; never commit):
- `BETTER_AUTH_SECRET` — set 2026-11-25 (all envs share it today; rotate on env split)
- `RESEND_API_KEY` — pre-existing (contact form)
- Owner actions still open: verify `pantaleone.net` in Resend (DNS records),
  one manual end-to-end signup to validate the verification email path,
  Turnstile widget + keys for signup/login hardening.

## Migrations

```bash
npm run db:generate                    # schema -> drizzle/migrations/*.sql
npm run db:apply:dev                   # apply to pantaleone-chat-dev
npx wrangler d1 migrations apply pantaleone-chat-staging --remote   # when needed
npx wrangler d1 migrations apply pantaleone-chat-prod --remote       # when needed
```

Never edit an applied migration. Auth tables mirror better-auth defaults;
if better-auth upgrades change the schema, generate a new migration.

## Verified 2026-11-25 (preview deploy, dev DB)

- `tsc`, `eslint`, `vitest run` (23 tests: SSRF guards + validation) green
- Production `build` + versioned Cloudflare upload green
- `/signup` 200, `/dashboard` 307s when unauthenticated
- Signup creates user + org (owner) + draft chatbot in D1 (queried directly)
- Login blocked pre-verification with clear error; duplicate signup creates nothing; short password rejected server-side
- Test data cleaned out of the dev DB afterwards

## Not yet verified (needs owner)

1. One real signup → inbox click → login → dashboard (blocked on Resend domain verification for pantaleone.net; everything up to the inbox click is proven).
2. Turnstile on signup/login (deferred to P2 hardening).
3. Env split + `chat.pantaleone.net` DNS before any public SaaS traffic.

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
