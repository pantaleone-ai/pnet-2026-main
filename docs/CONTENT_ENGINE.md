# Content Strategy + Orchestration Engine — pantaleone.net

For future agents. Read this before touching any blog content.
Companion to `AGENTS.md` (code rules) and `docs/EDITORIAL.md` (voice rules).

## 1. The rule in one paragraph

Fewer pages, stronger relationships. This site is a knowledge platform for
AI agents, AI engineering, MCP, automation, and enterprise AI — not a content
farm. Do not create articles to chase keywords. Every page must earn its place
through expertise, utility, and a clear search intent. Never imply content is
AI-generated. Never invent experience, customers, metrics, or credentials.

## 2. Where things live

| What | Path |
|---|---|
| Pillars, tags, intents, statuses | `config/content/pillars.ts` |
| Audit of all 30 existing posts | `config/content/inventory.ts` |
| Future title backlog (do not write yet) | `config/content/backlog.ts` |
| Related-post scoring | `features/blog/lib/content-graph.ts` |
| Related UI block | `features/blog/components/RelatedArticles.tsx` |
| Post source | `features/blog/content/*.mdx` |
| Schema (pillar/cluster/intent/status optional) | `config/schemas/base-schemas.ts` |
| Voice + budgets + blacklist | `docs/EDITORIAL.md` |
| Audit script | `scripts/editorial-audit.py` (`npm run editorial`) |
| Anti-slop engine (vendored) | `modules/anti-slop/` (see `PROVENANCE.md`) |
| Project overrides (protected terms) | `config/anti-slop/protected-terms.json` |

## 3. Pillars (conceptual, not URLs)

`ai-agents` · `ai-engineering` · `mcp` · `ai-automation` · `enterprise-ai` · `lab`

Existing URLs under `/blog/[slug]` are PRESERVED. Pillars do not change
routing. If a hub page ships later, old URLs get 301s + canonical updates —
never silently rename.

## 4. Workflow for any content task

1. Look up the post in `config/content/inventory.ts` (pillar, cluster, class, intent, action).
2. Check `docs/EDITORIAL.md` voice + budgets; run `npm run editorial` before committing.
3. One primary intent per post: informational / technical / comparison / commercial / strategic / experimental / news / navigational.
4. Title style: clear subject + useful angle. Example: `MCP vs APIs: What Changes When AI Agents Need Tools`. Never open with Ultimate/Complete/Definitive.
5. Article shape (adapt, do not force): direct answer → why it matters → core explanation → architecture/model → implementation → examples → trade-offs → mistakes → recommendations → related content.
6. SEO separation: visible copy stays short; search terms live in `seo:` frontmatter, `config/seo/*`, and JSON-LD — never stuffed into prose or titles.
7. Dates: `created` never changes. Bump `lastUpdated` only on substantive edits.
8. Validate: `npm run content:validate` (editorial + anti-slop audit over blog, projects, shop) plus `npm run check-types` for code changes.

## 5. Internal linking (use the engine, do not hand-pick randomly)

```tsx
import { getRelatedPosts, getContinueReading } from "@/features/blog/lib/content-graph";
import RelatedArticles, { hubLabelFor } from "@/features/blog/components/RelatedArticles";

const all = getBlogPosts(); // server side
const related = getRelatedPosts(post, all, 4);
const next = getContinueReading(post, all, related.map((r) => r.slug));

<RelatedArticles related={related} continueReading={next} hubLabel={hubLabelFor(post.slug)} />
```

Rules: max 4 related, 1 continue-reading, 1 hub link back. Links must continue
the reader's research (same cluster → same pillar → shared tags). Render after
the body, before `ConsultationCTA` / newsletter.

## 6. Metadata checklist (per post)

- `title` (specific, human, no keyword stuffing, no `| Pantaleone` suffix spam)
- `description` 12–25 words for excerpts; meta/OG derived, sliced, not duplicated verbatim
- `category` from controlled list; `tags` from `CONTROLLED_TAGS` where possible
- `seo[]` keywords (metadata only, never visible)
- `image` + `imageAlt`; canonical `/blog/[slug]`; BlogPosting JSON-LD with datePublished/dateModified + Person author (Matt Pantaleone)
- No FAQ schema unless the FAQ is genuinely visible reader help

## 7. Quality gate (all must pass)

Expertise · Originality · Utility · Intent match · Accuracy · Clarity ·
Human voice · Internal relationships · Commercial fit (subtle CTA only).

If a draft fails originality or expertise, delete it. No replacement required.

## 8. Special cases

- **llms.txt post** (`llms-txt-for-ai-agent-discovery-and-optimization`): currently
  overstates llms.txt as required SEO. Reframe as evidence-based
  (`Does llms.txt Actually Help AI Search?`), cite Google Search docs for
  Google claims. Update in place; do not fork the URL.
- **Near-duplicates**: `modern-saas-boilerplate…` ↔ `free-authentication…`;
  `claude-sonnet4-5-improve-quality` ↔ `claude-sonnet-4-5-system-prompt-analysis`.
  Merge candidates — human decision required, never auto-delete.
- **Off-pillar** (`creative-coding`): keep, exclude from hubs.
- **Lab posts** (prompt teardowns): evidence over opinion; quoted third-party
  prompts in code fences/blockquotes are exempt from the slop auditor.

## 9. Backlog (titles only)

`config/content/backlog.ts` holds P0–P3. P0 next: What Is an AI Agent? /
How AI Agents Work / AI Agent Architecture / Production AI Agents / What Is
MCP? / How MCP Works / MCP vs APIs. Do not write them until asked — the
architecture above is what makes them rank when they ship.

## 10. Content validation pipeline (anti-slop agents)

`modules/anti-slop/` is the vendored `@forwardos/anti-slop` engine
(source pinned in `modules/anti-slop/PROVENANCE.md`): L1–L4 slop scanner,
minimum-effective-edit rewriter (max 2 passes), 13-item quality gate.
It is a permanent step in this pipeline, not a one-off cleanup.

```bash
npm run content:validate   # editorial + anti-slop audit (blog, projects, shop)
npm run anti-slop:scan -- <files>   # report only, exit 0
npm run anti-slop:strict -- <files> # fail on any hard gate (factual integrity)
npm run anti-slop:test     # engine's own 37-assertion suite
```

Operating rules: DETECT → EXPLAIN → MINIMUM EFFECTIVE EDIT → RECHECK.
Good content is left alone. Protected spans (code fences, quotes, URLs,
frontmatter) and `config/anti-slop/protected-terms.json` (product/brand/SEO
terms) are never flagged or rewritten. Taste overrides go in the engine's
feedback store, never as one-off exceptions in prose.

Agent (MCP) access — stdio server, zero dependencies:

```json
{ "mcpServers": { "anti-slop": {
  "command": "node",
  "args": ["<repo>/modules/anti-slop/dist/mcp/server.js"]
} } }
```

Tools: `anti_slop_scan`, `anti_slop_audit`, `anti_slop_rewrite`,
`anti_slop_design_audit`, `anti_slop_image_prompt`, `anti_slop_seo_audit`,
`anti_slop_code_audit`, `anti_slop_compare`, `anti_slop_quality_gate`.
Rebuild first with `npm run anti-slop:build` (`dist/` is gitignored).

## 11. Publishing (git only)

All publishing goes through git. Never edit content directly on the server
or in any CMS-less shortcut. Flow: branch → commit → push → PR → merge →
Vercel builds from GitHub. Content changes require a redeploy (see
`app/sitemap.ts`: sitemap builds at deploy time, no ISR). Verify on the
preview deployment before merging to the production branch.

## 12. Operating loop

DISCOVER → SEARCH DATA → TOPIC → RESEARCH → EXPERT INPUT → PUBLISH →
MEASURE (Search Console per-URL: impressions, clicks, CTR, position; plus AI
Overview/Mode report) → UPDATE → INTERNAL LINKING → REPEAT.
