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
