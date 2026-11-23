# Pantaleone Chat — Revised Plan (grounded in this codebase)

This document revises the original Pantaleone Chat brief against what
actually exists in `pnet-2026-main`, then records the minimal MVP that
was built. Canonical domain everywhere: `https://www.pantaleone.net`.

## 1. What the original brief assumed (and what is actually true)

| Original assumption | Reality in this repo |
|---|---|
| Separate repos `pantaleone-ai/cloudflare-rag` (Remix 2, D1, Vectorize, R2, Queues) and `pantaleone-ai/chatbot-template` exist alongside this app | Not present in this workspace. Only `pnet-2026-main` (Next.js 16 App Router, React 19) is checked out. No D1, Vectorize, R2, Queue, or Workflow bindings exist. |
| Next.js deployed via "vinext", service bindings to a separate RAG worker | Deployment is OpenNext Cloudflare (`opennextjs-cloudflare`) **plus** Vercel. `wrangler.jsonc` has only the image-cache R2 bucket and a self-reference service binding. No backend worker to bind to. |
| Auth, organizations, Stripe billing, embed.js, multi-tenant SaaS from the start | No auth provider, no DB layer, no `ai` SDK, no API-key system in the repo. Contact-form route is the closest auth-adjacent pattern (honeypot + LRU rate limit + Resend). |
| Domain `pantaleone.net` / `chat.pantaleone.net` mixed usage | Codebase canonical is `https://www.pantaleone.net` (middleware apex → www 301, `config/site.ts`, CSP, JSON-LD, contact CAPI). All new copy and URLs use `www`. |
| "Install template registry components" | shadcn/ui + Radix + Tailwind v4 + Lucide are already installed. The chat UI reuses them directly. |

## 2. Revised scope decision

Building multi-tenant SaaS (D1 schema, Vectorize indexes, Queues,
Workflows, auth, billing, embed.js, `https://chat.pantaleone.net`) inside
this checkout would require: new Cloudflare resources, secrets, DNS, an
auth provider decision, and a second deployable — none of which can be
verified from this workspace alone. That is Phase 2, explicitly gated on
owner actions (see §5).

**Phase 1 (built here): single-tenant, site-grounded chat MVP.**

- Route: `/chat` on `https://www.pantaleone.net/chat`.
- API: `POST /api/chat` — validates with zod, rate-limits 20/min/IP
  (existing `lib/rate-limit.ts` LRU, same pattern as `/api/contact`),
  retrieves context from the existing local search index
  (`lib/search-server.ts` over blog + shop content), then:
  - if `OPENAI_API_KEY` is set, streams an OpenAI-compatible
    chat-completion grounded on that context;
  - otherwise streams an honest extractive fallback that lists the
    matching pages (labeled in the UI, header `X-Chat-Fallback`).
- Streaming SSE throughout; stop/retry on the client via
  `AbortController`.
- No new infrastructure, no new dependencies, no secrets in the client,
  no fabricated citations (blog links use real slugs; products link to
  `/shop` rather than guessed deep URLs).
- Styling reuses existing tokens and shadcn components (`Card`,
  `Button`, `Textarea`) and Lucide icons. No gradients, no marketing
  language.

## 3. Files added

- `lib/validations/chat.ts` — zod request schema (message 2–2000 chars,
  history ≤ 10 items).
- `app/api/chat/route.ts` — rate limit → validate → retrieve → stream
  (OpenAI passthrough or extractive fallback). `force-dynamic`,
  `no-store`, 413/429/400 handling. Server owns the provider key.
- `app/(app)/(root)/chat/page.tsx` — route metadata (canonical
  `https://www.pantaleone.net/chat`).
- `app/(app)/(root)/chat/_ChatPanel.tsx` — client chat UI (messages,
  sources, suggestions, stop, error states).
- `docs/PANTALEONE_CHAT.md` — this file.

## 4. Verification

- `npx tsc --noEmit` (must pass).
- `npx eslint` on the four new files (must pass).
- Manual: `npm run dev`, visit `/chat`, ask a question, confirm sources
  render; stop mid-stream; disable `OPENAI_API_KEY` and confirm the
  fallback labels itself as index mode.
- Production deploy stays on the existing pipeline (`npm run build` /
  `npm run deploy`); no wrangler resource changes required.

## 5. Phase 2 gates (owner actions required before multi-tenant build)

1. Decide auth provider (compatible with D1 + Cloudflare Workers).
2. Provision Cloudflare resources: D1 database(s), Vectorize index(es),
   R2 bucket(s) for knowledge files, KV namespace(s) for rate limits,
   Queue(s) for ingestion — per environment (dev/staging/prod).
3. Decide repository strategy: new `pantaleone-ai/pantaleone-chat` repo
   vs. monorepo route groups + `https://chat.pantaleone.net` hostname
   binding.
4. DNS + WAF/Turnstile policy for the chat hostname and embed origins.
5. Only then: D1 multi-tenant schema, persistent conversations, usage
   events, knowledge ingestion pipeline, public embed, billing.

## 6. Non-negotiables carried over from the original brief

- Server owns provider keys; browser never sees them.
- Retrieval scoped to content the requester may see (today: public site
  content only).
- No mock data presented as AI output; fallback is labeled.
- Streaming responses; persistent clean code over new dependencies.
- `www` canonical in all domains, canonical tags, and copy.
