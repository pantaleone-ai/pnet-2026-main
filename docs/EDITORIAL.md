# Editorial System — pantaleone.net

Less words. More specificity. No hype.

## Voice

Direct. Technical. Calm. Confident. Specific. Plainspoken.
Sound like a founder who built the thing, not a marketing agency.

- One short sentence over two. A fact over a claim.
- Concrete nouns over adjectives. Strong verbs: build, run, move, compress, convert.
- First person only when personal experience adds credibility ("I built this to…").

## Budgets

| Surface | Words |
|---|---|
| Project description | 10–25 |
| Product description | 10–35 |
| Blog excerpt | 12–25 |
| CTA | 1–4 |
| Headline | 1–8 |
| Subheadline | 5–20 |
| Headline adjectives | 0–1 |
| Any paragraph | 0–2 adjectives |

## Titles

- Products/projects: the actual name, 1–5 words. Never stuff Free, Ultimate,
  Modern, Official, Production-Ready, or stack keywords into titles.
  Stack goes in metadata (`coreStack`, `techStacks`), not prose.
- Blog posts: specific and direct. Never open with Ultimate, Complete,
  Comprehensive, Definitive, or "Everything You Need to Know".
- Blog first heading: the frontmatter `title` renders as the page H1, so the
  body must open with a distinct `##` that builds on the title (new angle,
  outcome, or scope) instead of repeating it. Never open the body with `#`
  or a generic `Introduction`/`Overview`. Enforced by `npm run editorial`.

## Claims

Every claim must answer: can we prove this? If not, remove it.
Never invent customers, results, revenue, rankings, testimonials, or specs.
Missing proof = em dash + label ("metric to confirm"), never an invented number.

## SEO separation

Visible copy stays short. Search terms live in `config/seo/*`, MDX `seo:` /
`targetKeywords` frontmatter, and JSON-LD — never stuffed into visible copy
or titles. Product "Target Keywords" render in JSON-LD only.

## Pipeline for every string

Raw copy → fact check → slop filter → claim filter → compress →
plain-English pass → dedupe → length check → ship.
When in doubt, delete. No replacement sentence required.

## LLM editing instruction (canonical)

> You are editing copy for a technical founder's website. Make it shorter.
> Use plain English. Remove hype, unnecessary adjectives, marketing language,
> and generic AI phrases. Keep factual claims and technical specificity.
> Do not add ideas. Do not sound polished or corporate. Do not sound like AI.
> Prefer one short sentence over two. Prefer a concrete noun over an
> adjective. Prefer a fact over a claim. Return only the revised copy.

## Enforcement

`npm run editorial` runs `scripts/editorial-audit.py --strict`, which fails
on blacklist phrases, unsupported superlatives, stuffed titles, and banned
blog openers across all MDX frontmatter, bodies, and chrome copy.
Run it before every content commit. Quoted third-party text (leaked prompts,
docs excerpts) and standard terms (best practices, leading indicators) are
exempt — the auditor skips code fences, tables, and blockquotes.

---

## Voice V2 appendix (additive — Oct 2026)

The base voice above is unchanged. This appendix adds editorial judgment
for the full archive. It does not replace directness with a new template.

### Pantaleone standard

Direct. Specific. Technical. Calm. Experienced. Economical. First-party.
Credible. Write like someone who built and operates the system described.

Prefer experience over abstraction:

- "I use GitHub Issues as the queue because each topic needs a durable unit of work."
- "The validator caught the title before the PR was opened."
- "I don't let the agent publish."

Prefer precise nouns and strong verbs: "the validator rejects the title",
"the agent reads the inventory before drafting."

Keep legitimate technical terms (agent, orchestration, validator, schema,
MDX, TypeScript, PR, API, MCP, n8n, RAG, CI/CD, metadata, Search Console).
Explain when needed. Do not dumb down to sound conversational.

First person only for real first-party work (I built, I use, I tested,
I found, I changed, I removed, I chose, I keep). Never invent experience,
metrics, clients, failures, or outcomes. Missing proof = remove the claim.

### Article-type voice (preserve format, share voice)

- Tutorials: direct, procedural. Prerequisites, commands, decisions, failure modes, verification.
- Architecture: analytical. Tradeoffs, constraints, why this option over that one.
- Executive: compressed. What changed, why it matters, cost, risk removed, decision, next step.
- Research/teardowns: forensic. Separate what the source says, what is verified, what is interpretation, what is recommendation.
- Reference/collections: utilitarian. Reader is here to use the material. No marketing intro.
- Opinion: strong but defensible. Explicit claim + reasoning + evidence.

### Restraint rule

Do not rewrite a strong sentence because it is short, uses an em dash,
uses first person, is opinionated, or has personality. Ask: does it sound
natural, specific, credible, and useful? If yes, keep it. Shared voice,
not cloned prose. The Oct 2026 content-engine post informs the standard
but is not a template.

### Boundaries

Never rewrite code blocks, prompt blocks, source excerpts, direct quotes,
config, API examples, JSON, shell commands, identifiers, URLs, product or
model names, or cited third-party language. Only Pantaleone prose is edited.
Protected terms in `config/anti-slop/protected-terms.json` always survive.

Full pattern list: `config/voice/anti-patterns.json`.
Compact agent memory: `docs/VOICE_MEMORY.md`.
Report-only scanner: `scripts/language-gate.py` (`npm run voice:gate`).
