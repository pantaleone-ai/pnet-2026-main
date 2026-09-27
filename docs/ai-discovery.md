# AI Discovery Layer — pantaleone.net

Single source of truth: `lib/seo/ai-discovery.ts` (canonical origin, core pages, authority posts).
Canonical content remains the HTML pages; machine surfaces are derived, never forked.

## Artifacts

| Artifact | Route | Source |
|---|---|---|
| Curated index | `/llms.txt` | `app/(llms)/llms.txt/route.ts` + `AUTHORITY_POSTS` |
| Consolidated file | `/llms-full.txt` | `app/(llms)/llms-full.txt/route.ts` (authority subset only) |
| Markdown | `/index.md`, `/services.md`, `/b2b.md`, `/contact.md`, `/projects.md`, `/shop.md`, `/blog.mdx/[slug]` | per-route static generators |
| Discovery links | `rel=alternate type=text/markdown`, `rel=describedby /llms.txt` | `app/layout.tsx`, services/b2b/contact/projects/blog pages |
| Sitemap | `/sitemap.xml`, `/products/sitemap.xml` | `app/sitemap.ts` (blog uses real dates; static hubs share deploy date) |
| RSS | `/rss.xml` | `app/rss.xml/route.ts` (author, categories, date + published) |
| Robots | `/robots.txt` | `app/robots.ts` (allow `*`, incl. AI search/retrieval) |

## Why agents.txt / agents.json are NOT implemented

No agent-operable capability exists today (no public API, MCP server, agent skill,
searchable machine-actionable catalog, or structured booking workflow beyond the
contact form). Per the architecture principle, capability manifests ship only with
real machine-executable services. Deferred until such a capability launches.

Likewise deferred: `/ai.txt`, `/humans.txt`, `/llms-tldr.txt`, `/.well-known` AI
files, deprecated plugin manifests — no documented consumer + real use case.

`AGENTS.md` stays a repo-level coding-agent artifact, not a search discovery file.

## Crawler policy

- `robots.txt` allows `*` (Googlebot, Bingbot, OAI-SearchBot, ClaudeBot, CCBot).
- No AI-crawler blanket block. `OAI-SearchBot` (search/retrieval) vs `GPTBot`
  (training) are distinct; training preference is signaled via the
  `Content-Signal: search=yes, ai-input=yes, ai-train=no` header, not robots.
- Dynamic `/api/` stays disallowed except `/api/feeds/` and `/api/products/feed`.

## Observability

Source of truth: server/CDN logs (Vercel). Track at minimum: Googlebot, Bingbot,
OAI-SearchBot, GPTBot, ClaudeBot, CCBot. Watch:

- `llms.txt` / `llms-full.txt` / `*.md` fetch rate and 200 rate
- sitemap fetches, RSS fetches
- indexing errors (Search Console, Bing Webmaster)
- broken Markdown links (see validation below)
- AI referral traffic where identifiable (referrer + UTM)

## Validation

```bash
npm run validate:ai-discovery  # static checks (no network)
npm run ai:readiness           # broader readiness diagnostic
npm run content:validate       # editorial + anti-slop over content
```

## Agent comprehension test matrix

Expected: each answer derivable from ≤3 authoritative pages (no deep crawl needed).

1. What does Pantaleone do? → `/`, `/index.md`
2. What does Pantaleone specialize in? → `/services`, `/services.md`
3. What AI automation services does Pantaleone offer? → `/services`, `/b2b`
4. How much does a Pantaleone workflow audit cost? → `/services` ($2,500; canonical)
5. How does a Pantaleone engagement work? → `/services` (audit → build → handoff)
6. What projects has Pantaleone built? → `/projects`, `/projects.md`
7. What is AgentDNA? → `/projects` + authority post `agentdna-enterprise-ai-agent-infrastructure`
8. What is ImgSquash? → `/projects` + ecosystem link imgsquash.com
9. What is MigrateCMS? → `/projects`
10. What AI apps does Pantaleone offer? → `/shop/ai-apps`, `/shop.md`
11. What resources does Pantaleone publish? → `/resources/ai-readiness-guide`, `/blog`
12. How do I contact Pantaleone? → `/contact`, `/contact.md`
13. What companies/apps are part of the Pantaleone ecosystem? → `/llms.txt` Ecosystem section

## Intentionally excluded from llms.txt

- Full 30-post blog dump (low signal, bloats file); only 10 authority posts linked.
  Remainder discoverable via sitemap + RSS + `/blog.mdx/[slug]`.
- Duplicate/off-pillar/outdated posts: `modern-saas-boilerplate…` (merge candidate),
  `claude-sonnet4-5-improve-quality` (near-duplicate), `creative-coding` (off-pillar),
  `llms-txt-for-ai-agent-discovery-and-optimization` (claims flagged outdated in inventory).
- Utility/authenticated/checkout/API routes, query-param variants, `_next`/`_vercel`
  internals, redirected legacy pages (`/about`, `/experience`, `/education` → `/`).
