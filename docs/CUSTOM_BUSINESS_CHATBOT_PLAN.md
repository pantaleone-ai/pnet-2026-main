# Pantaleone — Custom Business Chatbot: Build Plan

**Status:** plan only, no code yet. Target: single-repo implementation in `pnet-2026-main`.
**Parent canonical:** `https://www.pantaleone.net` (apex → www 301 stays untouched).
**Platform host:** `https://chat.pantaleone.net` (new DNS + hostname routing, §5).

---

## 1. Corrected brief (what the original prompt got wrong)

The original brief assumes infrastructure that does not exist. Corrections, verified against this repo (Nov 2026):

| Original assumption | Reality | Consequence |
|---|---|---|
| Existing auth, users, orgs | **None.** No auth library, no users table, no sessions | Auth + organizations are greenfield (§4) |
| Existing D1/Drizzle schema and migrations | **None.** No D1 bindings, no ORM | Greenfield D1 + Drizzle (§6) |
| `cloudflare-rag` backend, D1 FTS, existing crawler | **None.** Retrieval today = static corpus JSON + local scoring; no crawler, no ingestion pipeline | Ingestion is greenfield; reuse the *patterns* (chat UI, SSE transport, scoring weights, eval harness), not the infra |
| `chatbot-template` / `cloudflare-rag` repos | Not in this workspace | All work happens in `pnet-2026-main` |
| `chat.pantaleone.net` app with /signup etc. | Does not exist (no DNS, no routes) | New route group + hostname routing (§5) |
| Existing Stripe subscriptions | Stripe SDK present, but only product-catalog sync + webhooks exist; **no subscriptions, no Checkout, no entitlements** | Billing is greenfield (§10) |
| Conversations/messages persisted | **No.** localStorage only | Greenfield D1 persistence (§8) |
| Usage metering | Page analytics only; no per-chat metering | Greenfield server-side metering (§10) |
| pnpm / test runner | npm; **no test runner configured** | Add vitest in Phase 0; eval harness already exists |

**What IS reusable (do not rebuild):** Next.js 16 App Router + OpenNext deploy pipeline; shadcn/Radix/Tailwind system + dark-first tokens; `features/chat/*` (ChatPanel, ChatTranscript, ChatComposer, ChatMarkdown, ChatProvider, SSE parsing); `/api/chat` streaming shape (extend to multi-tenant, don't fork); existing hybrid-retrieval scoring weights + 54-question eval harness; Resend client; middleware conventions; `siteConfig`/SEO patterns.

---

## 2. Architecture decisions

### 2.1 One repo, one worker, two route groups (recommended)

- Keep everything in `pnet-2026-main`, one Cloudflare Worker (`pantaleonenet`).
- Add an `(saas)` route group next to the existing site routes. Cloudflare routes `chat.pantaleone.net` → same worker; `middleware.ts` rewrites the hostname to the `(saas)` group (same pattern as the existing apex→www and legacy-redirect handling, single-hop).
- **Why not a separate repo/worker:** shared chat UI, retrieval code, design system, and deploy pipeline; solo-maintainer ops (one wrangler config, one deploy). Split later only if the SaaS app diverges (traffic isolation, independent deploys).
- **Owner action:** create `chat.pantaleone.net` DNS (proxied AAAA/CNAME to the worker / custom hostname) before Phase 5 testing.

### 2.2 Auth: better-auth + D1 (recommended)

- `better-auth` with email+password **and** email-OTP sign-in, database sessions, Resend already wired for verification/OTP mails, Turnstile on signup/login.
- Rejected: Clerk/Auth0 (per-seat cost, external dependency for a cost-sensitive product); custom crypto (never).
- **Owner decision to confirm:** better-auth (my recommendation) vs managed provider. Blocking Phase 2.

### 2.3 Data: D1 + Drizzle ORM (recommended)

- New D1 databases per env (`pantaleone-chat-dev|staging|prod`); Drizzle schema in `drizzle/schema.ts`, migrations in `drizzle/` via drizzle-kit; seed script for plans.
- Rationale: Cloudflare-first per brief, zero new infra, migrations are reviewable SQL.

### 2.4 Ingestion: separate plain Worker + Queues (recommended)

- `workers/ingest/` — a **plain** Cloudflare Worker (not OpenNext) in the same repo, sharing `lib/` retrieval code. Consumes an ingestion queue; cron sweep (`scheduled` handler) retries stuck jobs and handles re-crawl schedules.
- Rationale: avoids OpenNext queue-consumer uncertainty in the web worker; independent retries/timeouts; same codebase, same deploy repo, separate wrangler config (`wrangler.ingest.jsonc`).
- New R2 bucket `pantaleone-chat-uploads` (+ env variants). Never touch the OpenNext cache bucket.
- Start: sitemap + bounded crawl, PDF/TXT/MD/CSV uploads, manual FAQs. DOCX deferred to Phase 6 (library evaluation flagged — mammoth is heavy for workers; candidate: convert-on-upload via the ingest worker with a size cap).
- **Do not use Workflows initially.** Queues + idempotent jobs + cron sweep cover the MVP; adopt Workflows only if multi-step orchestration proves painful.

### 2.5 Retrieval: shared Vectorize index + mandatory tenant filter

- Existing `pnet-chat-index` stays for pantaleone.net. New shared `pantaleone-chat-index-saas` (same embedding model, record model id + dims in code).
- Every vector carries `{ organization_id, chatbot_id, source_id }`; every query **must** include the metadata filter. Tenant isolation tests run against fixtures on every change.
- Embeddings: reuse the existing Workers AI embedding model already used by the rerank path (pin model id + dims in `lib/chat-retrieval.ts` config; changing either requires re-indexing — document the runbook).
- **Owner decision to confirm:** shared-index-with-filters (recommended: one index to operate, proven pattern) vs per-customer index (stronger isolation story, N indexes to operate). Default: shared; revisit on request.

### 2.6 Billing: Stripe Checkout + webhooks + DB entitlements

- Stripe products/prices created in dashboard (test → live); plans mirrored in a single `config/plans.ts` (one source of truth, no hardcoded prices in UI/logic).
- Checkout Sessions (subscription mode) → `POST /api/billing/webhook` (signature verification, idempotency on Stripe event id) → `subscriptions` table. Entitlements derived server-side from subscription status on **every** billable operation. Billing portal for self-serve management.
- Usage enforcement points: public chat (message caps), ingestion (page/doc caps), storage caps. Over-limit = clear message + upgrade path, never silent failure, never data loss.

### 2.7 Embed: iframe + loader script

- `embed.js` loader (~3KB, async, non-blocking) injects launcher + iframe pointing at `https://chat.pantaleone.net/c/[public_id]?embed=1`. Iframe = style isolation for free.
- Origin allowlist per chatbot (`embed_domains`); server validates `Origin`/`Referer` + per-public-id IP rate limits in KV. CORS is not auth — all checks server-side.
- "Verify installation" = loader phones home with a handshake token; dashboard polls for it.

---

## 3. Data model (Drizzle, D1 — all new, no collisions)

Conventions: `id` text PK (KSUID/UUID), `created_at`/`updated_at`, soft-delete via `deleted_at` where customer-facing, `organization_id` on every tenant row, FK cascades to organization/chatbot as noted. Indexes on all lookup paths.

- **users** — id, email (unique, CI), name, email_verified_at, password_hash (better-auth tables; use better-auth's schema, do not hand-roll), created_at
- **organizations** — id, name, slug (unique), plan_id, created_at
- **organization_members** — id, organization_id → organizations, user_id → users, role (`owner|admin`), unique(organization_id, user_id)
- **chatbots** — id, organization_id → organizations, name, public_id (unique, unguessable), description, status (`draft|ready|published|disabled`), welcome_message, suggested_questions_json, system_instructions, tone, appearance_json (theme, launcher position), lead_capture_mode (`off|contact|always`), allowed_domains_json, created_at, updated_at
- **chatbot_settings** — chatbot_id PK/FK, model, temperature, retrieval knobs (top_k, context limit), citation behavior, fallback message (advanced; hidden by default in UI)
- **knowledge_sources** — id, organization_id → organizations, chatbot scope via join, name, source_type (`website|sitemap|file|faq`), source_url, storage_key (R2, files only), status (`pending|processing|ready|failed`), page_count, error, last_indexed_at, created_at, updated_at
- **documents** — id, organization_id, knowledge_source_id → knowledge_sources, name, file_type, size_bytes, storage_key, status, metadata_json (ingestion diagnostics), created_at
- **document_chunks** — id, document_id → documents (cascade), chunk_index, text, embedding_id (Vectorize id), created_at — plus full-text searchable text column for D1 FTS fallback
- **chatbot_knowledge_sources** — chatbot_id + knowledge_source_id (which sources feed which bot)
- **conversations** — id, organization_id, chatbot_id, visitor_id (opaque, per-chatbot), title, status, created_at, updated_at
- **messages** — id, conversation_id → conversations (cascade), role, content, citations_json, tokens_json, created_at
- **leads** — id, organization_id, chatbot_id, conversation_id (nullable), name, email, company, inquiry, created_at
- **subscriptions** — id, organization_id (unique active), stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_id, status, current_period_end, cancel_at_period_end, created_at, updated_at
- **usage_events** — id, organization_id, chatbot_id, conversation_id (nullable), event_type (`message|ingestion|storage`), model, input_tokens, output_tokens, metadata_json, created_at — append-only, indexed by (organization_id, created_at)
- **api_keys** — id, organization_id, name, key_hash, last_used_at, expires_at (embed handshake + future API access; never store raw keys)
- **embed_domains** — chatbot_id + domain (allowlist)
- **onboarding_progress** — organization_id PK, current_step, business fields snapshot, website_url, acquisition_source, completed_at
- **webhook_events** — stripe_event_id PK (idempotency), type, processed_at
- **plans** — seed data mirrored from `config/plans.ts` (or config-only; decide in Phase 0 — single source of truth either way)

---

## 4. API surface (all same-origin; browser never touches D1/R2/Vectorize/providers)

Auth required everywhere except marked public. Every tenant route validates organization membership server-side; retrieval always filters by organization + chatbot + selected sources.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/[...all] | no | better-auth handlers (signup/login/logout/verify/reset) |
| GET/PUT | /api/workspace | yes | current org, update name |
| POST | /api/chatbots | yes | create (1 default on signup via server, not client) |
| GET/PATCH/DELETE | /api/chatbots/[id] | yes | manage; publish/unpublish = status transition |
| POST | /api/chatbots/[id]/duplicate | yes | — |
| GET/POST | /api/chatbots/[id]/sources | yes | list/add website, sitemap, file (upload URL), FAQ |
| GET/DELETE | /api/sources/[id] | yes | status, refresh, reprocess, delete (+ vector cleanup) |
| GET | /api/chatbots/[id]/conversations (+?cursor) | yes | owner view |
| DELETE | /api/conversations/[id] | yes | owner/admin delete |
| POST | /api/chat/public/[publicId]/messages (SSE) | no (public) | visitor chat: validate published + subscription + origin + rate limit → retrieve (scoped) → stream → persist → usage |
| GET | /api/chat/public/[publicId]/config | no (public) | safe config only (welcome, suggestions, theme; never keys/prompts) |
| POST | /api/leads | scoped* | lead capture per chatbot lead_capture_mode (*public path with chatbot scoping, rate-limited) |
| POST | /api/billing/checkout | yes | create Checkout Session |
| POST | /api/billing/webhook | Stripe-signed | subscription sync (idempotent) |
| GET | /api/billing/portal | yes | portal session |
| GET | /api/usage/summary | yes | dashboard numbers (never raw provider invoices) |
| GET | /api/admin/** | admin | organizations, chatbots, usage, ingestion failures, disable |
| GET | /embed.js | no | loader script (no secrets, versioned) |

SSE contract stays identical to the existing `/api/chat` (sources event first, deltas, `[DONE]`) so `ChatTransport`/`useAiChat` are reused unchanged.

---

## 5. App routes & pages

**Marketing (`www`, existing group):** new `/custom-business-chatbot` page (hero + URL capture → preserved through signup via query + server-side handoff, never localStorage-only; 3-step explainer; benefits without fabricated stats; realistic example Q&As; pricing from the same plans source; FAQ incl. isolation answer; final CTA). Reuses existing header/footer/SEO patterns, `www` canonical.

**SaaS app (`chat.` hostname → `(saas)` group):**
- `/signup`, `/login`, `/forgot-password`, `/verify-email` (better-auth pages, Turnstile)
- `/onboarding` — 5-step wizard with progress: 1) business info (name, URL, category; description suggested post-ingestion) 2) website knowledge (auto-start ingestion on mount; page list with exclusions; uploads; FAQs) 3) assistant config (name, welcome, tone, suggestions, lead-capture; advanced collapsed) 4) test (real chat UI pre-populated with 3 suggested test questions; publish blocked until a source is `ready`) 5) plan + Stripe Checkout
- `/dashboard` (overview: status, recent conversations, usage, ingestion, install state; prominent next-action, no analytics sprawl)
- `/assistant` (edit config + preview + publish updates), `/knowledge` (sources + status + refresh/delete), `/conversations` (+ detail; search/filter), `/leads` (+ CSV export), `/billing` (plan, usage, portal), `/install` (hosted URL + snippet + per-platform instructions + verify-install handshake)
- `/c/[publicId]` (public hosted chat — standalone, branded, embed-mode via `?embed=1`), `/embed.js` (loader; versioned path for cache-busting)

Dashboards stay minimal: reuse existing Card/Button/Input/Textarea/Select/Badge/Progress/Tabs/Dialog/Sheet/Alert/Skeleton/Table/Sonner; empty states everywhere; mobile-first single column wizards; sticky primary actions.

---

## 6. Ingestion pipeline (async, idempotent, tenant-safe)

`Validate URL → normalize → queue job → sitemap discovery → bounded crawl (robots.txt, allowlist paths) → extract readable text (strip nav/footer/chrome, boilerplate + near-dup detection) → user page selection/exclusions → chunk → embed (pinned model) → Vectorize upsert (metadata: org/chatbot/source/page) → D1 records → status events → ready`.

File uploads: presigned-style direct-to-R2 (server-minted), type/size validated both sides (PDF/TXT/MD/CSV first; DOCX later with flagged converter eval), `unpdf`-class extraction in the ingest worker, same chunk/embed path. FAQs: manual Q/A pairs as chunks with boosted exact-match weight.

**SSRF is load-bearing, test it first:** protocol allowlist (http/https), DNS-resolve-and-reject private/reserved ranges (10/8, 172.16/12, 192.168/16, 127/8, ::1, link-local, metadata IPs), redirect-chain revalidation (each hop), response size caps, crawl page/depth/time budgets, per-org concurrency caps, per-job timeouts with retries + DLQ + admin-visible failures. Unit-test every rule with fixture DNS.

---

## 7. Chat runtime (per-tenant, extends existing)

1. Resolve `publicId` (or authed chatbot id) → 2. enforce published + subscription-active + origin allowlist + rate limits → 3. load chatbot config + selected sources only → 4. retrieval scoped to org+chatbot (metadata filter, never omitted) → 5. assemble system prompt + context (context limits from settings) → 6. stream model response → 7. citations from retrieved chunks only → 8. persist conversation/messages → 9. usage event → 10. optional lead capture per `lead_capture_mode`.
- Server owns keys/providers; provider abstraction starts with Workers AI + small curated list (reuse existing provider support).
- Empty-context and empty-generation guards already proven in the single-tenant route — port, don't reinvent.

---

## 8. Testing (non-negotiable, automated where it counts)

- **Tenant isolation suite (blocks merges):** cross-org reads, cross-chatbot retrieval, unpublished access, forged org ids, origin spoofing, file-type/size bypass, SSRF fixtures (private IPs, redirect chains, oversized bodies).
- **Payment tests:** Stripe test clocks; webhook signature + idempotency + out-of-order events; upgrade/downgrade/cancel/failure paths; publish blocked without active subscription (and unblocked after).
- **Journey test:** the 14-step definition of done, scripted end-to-end on staging (account → URL → ingest → configure → test → pay (test mode) → publish → embed on a scratch page → verify handshake).
- **Retrieval eval:** extend the existing 54-question harness with tenant fixtures + a no-leak suite for multi-tenant prompts.
- **Load/abuse:** public-endpoint rate limits, burst behavior, model-cost caps per chatbot.
- Quality gates: `npm run check-types`, `npm run lint`, `vitest run`, `npm run build` on every PR; test against the Workers runtime (wrangler dev/preview), not just `next dev`.

---

## 9. Environments, resources & secrets (provisioning checklist)

Per env (dev/staging/prod): D1 database, R2 upload bucket, Vectorize SAAS index, KV namespace (platform/rate-limit), Queue + DLQ, Turnstile keys, Resend domain + API key, Stripe keys + webhook secret + price IDs, `OPENAI/ANTHROPIC/GROQ` keys only if enabled, auth secret (`BETTER_AUTH_SECRET`), app URLs. Never hardcode IDs/secrets; never share prod data with lower envs. Manual Cloudflare steps: DNS for `chat.` hostname, R2/CORS, queue bindings, secrets via `wrangler secret`, Stripe webhook endpoints per env.

---

## 10. Phases (small, independently testable, each shippable)

- **P0 audit + scaffolding:** audit report; D1+Drizzle+better-auth skeleton; vitest + isolation test harness; env/resource provisioning. *Exit: authed empty dashboard deploys to staging.*
- **P1 landing page:** `/custom-business-chatbot` with URL capture → signup handoff + attribution. *Exit: converts visits to signups on staging.*
- **P2 auth + orgs + first chatbot:** signup→org→chatbot→onboarding record; authorization middleware. *Exit: new users land in onboarding with a draft bot.*
- **P3 ingestion:** queues + ingest worker, sitemap/crawl with SSRF suite green, uploads, FAQs, status UI. *Exit: URL in, indexed knowledge out, page exclusions work.*
- **P4 configure + test runtime:** assistant config, tenant-scoped streaming chat with citations + persistence + lead capture. *Exit: user tests their own knowledge end-to-end.*
- **P5 billing + publish:** plans, Checkout, webhooks, entitlements, hosted URL, embed.js + verify handshake, domain allowlists. *Exit: test-mode dollar flows to a published, embeddable bot.*
- **P6 dashboard + admin:** the six sections + internal admin view. *Exit: full self-serve loop without Pantaleone involvement.*
- **P7 hardening + launch:** full test matrix, abuse testing, runbooks, backup/restore docs, production rollout + rollback plan.

---

## 11. Risks & explicit owner decisions

1. **Auth provider** — recommend better-auth+D1; alternative managed (cost). *Blocks P2.*
2. **Shared vs per-customer Vectorize index** — recommend shared + filters + tests. *Blocks P3.*
3. **D1 vs alternative** — recommend D1+Drizzle; only revisit if a hard limit appears.
4. **Single worker vs split** — recommend single worker + hostname routing; split if traffic/isolation demands.
5. **Plans/pricing/limits** — owner sets numbers; engineering makes them config, not code.
6. **Stripe account + test/live mode, Resend sending domain, Turnstile keys, `chat.` DNS** — all owner actions, checklist in §9.
7. **Support burden** — self-serve still needs a support path for failed ingestion/payments; define before launch (even if it's just an inbox + runbook).

---

## 12. Definition of done (adapted from brief — unchanged in spirit)

A nontechnical business owner completes the 14-step journey (URL → account → workspace auto-created → import → configure → test → pay → publish → snippet → install → verify → manage) with zero Pantaleone involvement; an admin can see account/subscription/usage/chatbot status; all customer data isolated and proven so by automated tests, not by review.
