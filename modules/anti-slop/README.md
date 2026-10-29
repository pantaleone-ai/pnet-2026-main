# @forwardos/anti-slop (+ Pnet extensions)

Reusable, production-grade **anti-slop system**: a quality-control and transformation
layer that detects recognizable AI-generation patterns and applies **minimum effective
edits** — across text, UI structure, SEO, code, image prompts, and technical docs.

Not a "humanizer." It does not pretend AI content is human. It makes everything more
**specific, intentional, original, natural, useful, brand-appropriate, and visually
distinctive** — while preserving meaning, factual accuracy, brand voice, accessibility,
SEO value, and author intent.

Zero runtime dependencies. Node 18+. Self-contained (own tsconfig, no monorepo base).

## Use in another project

```bash
node /path/to/anti-slop/install.mjs /path/to/your-project --apply-scripts
```

See [`INSTALL.md`](./INSTALL.md) (human guide: installer, manual copy, CI, MCP),
[`AGENT-PROMPT.md`](./AGENT-PROMPT.md) (paste-ready prompt that instructs any
coding agent to install, voice-tune, verify, and wire the engine itself), and
[`AGENTS.md`](./AGENTS.md) (operator invariants for agents working on the engine).

## 1. Pipeline

```
INPUT → protect() → SCAN (L1–L4) → [+L5 LLM hook] → scoreText()
      → rewriteMinimal() → RE-SCAN → QUALITY GATE (L6) → OUTPUT
```

Operating rule: **DETECT → EXPLAIN → MINIMUM EFFECTIVE EDIT → RECHECK.**
Max 2 automatic revision passes (`maxAutoPasses`). If the content is good, it is left alone.

Modes (`ScanOptions.mode`):

| Mode | Behavior |
| --- | --- |
| `scan` | Detect + explain only. Never rewrites. Exit 0 unless `--strict` + gate fail. |
| `audit` | Scan + safe edits + rescan + gate. The CI mode. |
| `rewrite` | Same as audit, returns `rewritten` text. |
| `guard` | Audit + throw when the gate fails (for pipelines that must block). |

Content types (`ScanOptions.contentType`): `prose` (default), `markdown`, `seo`, `code`,
`design`, `image-prompt`. Textual types (`prose`/`markdown`/`seo`) run the full text
pipeline; the others run their dedicated analyzer only.

## 2. Detection layers

| Layer | Where | What |
| --- | --- | --- |
| L1 lexical | `rules/text.ts` (`LEXICAL_SIGNALS`) + `rules/precision.ts` (drift) | Contextual word/phrase signals with base weights. Single use in a long doc stays low; severity comes from frequency vs length + clustering. Never a banned-word list. |
| L2 rhetorical | `rules/text.ts` (`RHETORICAL_PATTERNS`, `CHATBOT_ARTIFACTS`) + `rules/precision.ts` | Contrast frames, dual-audience addresses, temporal openers, chatbot scaffolding leaked into shipped copy. |
| L3 style/structure | `rules/text.ts` (`STYLE_RULES`) + `rules/rhythm.ts` + `rules/precision.ts` | Sentence rhythm, repetition, punctuation density, section pacing, fragments, markdown symmetry, SEO/alt-text structure. |
| L4 semantic | `rules/text.ts` (`CONTENT_RULES`) + `rules/editorial.ts` + `rules/precision.ts` | Evidence checks (fake specificity, vague authority), invented labels, analogy stacking, title/heading rules, fluff ratio, code placeholders. |
| L5 LLM critique | injected `ScanOptions.llmCritique` hook | Optional semantic judgment. Never built in — the deterministic layers stand alone offline. |
| L6 quality gate | `engine/quality-gate.ts` | 16-item ship checklist + configurable hard gates (see §4). |

A word is a *signal*; severity comes from frequency vs document length, clustering with
other signals, and project context (allowlist, voice profile, protected terms).

## 3. Rule catalog

Every finding carries: `id, category, severity (low|medium|high), location (excerpt),
pattern, explanation, suggested_action, confidence (0..1), layer, offset?`.
The CSV/interchange schema is
`[file, severity, category, rule_name, confidence, layer, offending_text,
rule_definition, reason, suggested_action]`.

### 3.1 Text rules (`rules/text.ts`)

**L1 lexical signals** (selection; each has `baseWeight 1–5` + note):

`delve, tapestry, landscape, realm, unlock, unleash, elevate, empower, transformative,
game-chang*, groundbreaking, robust, seamless, cutting-edge, revolutionary,
next-generation, comprehensive, holistic, dynamic, innovative, exciting, powerful,
compelling, tailored, leverage, harness, journey, ecosystem, paradigm, pivotal,
vibrant, thoughtfully, meticulously, foster`

**L2 rhetorical patterns** (`name — severity/conf`):

| Pattern | Meaning |
| --- | --- |
| `generic-contrast` (med/0.7) | "Not just X, but Y" contrast frame |
| `whether-you-are` (med/0.75) | Generic dual-audience address |
| `from-x-to-y` (low/0.35) | "From X to Y" range scaffolding |
| `rapidly-changing-opener` (high/0.9) | Generic temporal opener — auto-fixed |
| `more-than` (med/0.65) | "It's more than…" profundity frame |
| `isnt-just` (med/0.65) | "This isn't just…" profundity frame |
| `future-of` (low/0.4) | "The future of X" grandiosity |
| `intersection-of` (med/0.7) | "At the intersection of…" prestige frame |
| `new-era` (med/0.7) | "A new era of…" epoch framing |
| `heres-the-thing` (low/0.55) | Conversational throat-clearing — auto-fixed |
| `why-it-matters` (low/0.5) | Generic "Why it matters" section |
| `grand-enabler` (med/0.7) | "Plays a crucial role in…" importance asserted, never shown |
| `navigating-abstract` (med/0.7) | "Navigating the intricacies of…" |
| `myriad-plethora` (med/0.65) | "A myriad/plethora of…" scope inflation |
| `kicker-family` (med/0.7) | False-suspense transitions ("here's where it gets interesting") |
| `imagine-world` (med/0.65) | "Imagine a world where…" futurist invitation |
| `patronizing-analogy` (med/0.65) | "Think of it as…" |
| `truth-is-simple` (low/0.55) | Asserting obviousness instead of proving |

**Chatbot artifacts** (all `high/0.9`, auto-fixed): `certainly, lets-dive, breakdown,
in-conclusion-signoff, hope-this-helps, self-reference ("as an AI"),
disclaimer-filler, worth-noting, bears-mentioning`.

**L3 style rules**: `em-dash-density, sentence-length-monotony,
sentence-opening-repetition, rule-of-three, hedge-stack, bold-everything,
title-case-headings, countdown-negation, self-answered-q, symmetric-bold-bullets,
listicle-trench-coat`.

**L4 content rules**: `fake-specificity` (high — **default hard gate**),
`unsupported-superlative, vague-authority, idea-repetition, invented-concept-label,
historical-analogy-stacking`.

### 3.2 Rhythm rules (`rules/rhythm.ts` — Pnet port of `scripts/language-gate.py`)

All soft (low/medium, suggestion-only): `repetition-opening` (same 3-word opening ≥4x),
`contrast-structure` (≥3 not-X-but-Y frames), `fragments` (≥8 slogan lines),
`em-dash-density`, `colon-density`, `semicolon-density`, `hype-density`.
Skips code fences, blockquotes, tables, URLs — mirroring the Python `strip_protected()`.

### 3.3 Editorial rules (`rules/editorial.ts` — Pnet port of `scripts/editorial-audit.py`)

Operates on raw markdown (frontmatter intact). All soft: `title-stuffer`,
`banned-title-opener`, `generic-first-heading`, `title-heading-duplicate`,
`body-opens-with-h1`, `missing-body-heading`, `description-budget`.

### 3.4 Voice extras (`rules/voice-extras.ts` — Pnet port of `config/voice/anti-patterns.json`)

Six buckets emitted as soft `voice` findings: `voice-generic-opener`, `voice-filler`,
`voice-contrast-cliche`, `voice-closer`, `voice-hype`, `voice-hedge`.
Single-word hype/hedge terms already covered by `voice-drift` are skipped to avoid
triple-flagging.

### 3.5 Precision expansion (`rules/precision.ts` — 10-rule Lead Linter set)

| # | Pattern | Cat/Layer | Sev/Conf | Detects |
| --- | --- | --- | --- | --- |
| 1 | `conclusion-cliche` | rhetorical/2 | med/0.85 | Generic closing formulae ("in conclusion", "ultimately", …) in the final section or last 15% |
| 2 | `manufactured-gravity` | rhetorical/2 | med/0.80 | "It is important/crucial/… to note/understand/…" inflation clauses |
| 3 | `symmetrical-section-pacing` | style/3 | low/0.75 | ≥3 `##` sections, >600 words, length CV < 0.15 |
| 4 | `passive-voice-density` | style/3 | low/0.70 | >4 passives per 200 words (≥80-word docs; standard technical passives exempt) |
| 5 | `unanchored-demonstrative-opening` | content/4 | med/0.85 | Section opening with "This/These + verb" and no noun anchor |
| 6 | `fluff-to-substance-ratio` | content/4 | med/0.80 | 150+ word blocks with <0.18 unique-tech-terms/stopwords ratio |
| 7 | `generic-anchor-text` | seo/3 | med/0.90 | `[click here/read more/link/here/source](…)` |
| 8 | `code-placeholder` | code/4 | **high**/0.95 | TODO/FIXME, `YOUR_SECRET_HERE`, `<YOUR_*>`, `// ... rest of code` inside fenced blocks (raw input — code is vaulted before text analysis). Soft: not a default hard gate |
| 9 | `tech-entity-capitalization-drift` | lexical/1 | med/0.85 | Two casings of one entity in a file (Next.js/NextJS, PostgreSQL/postgres, …). Skips code paths, quotes, `tailwind-*` classes |
| 10 | `missing-or-generic-alt-text` | structure/3 | med/0.90 | Empty or generic image alt (`![](…)`, `![screenshot]`, filenames) |

### 3.6 SEO / design / code / image-prompt

* `rules/seo.ts`: `keyword-stuffing, empty-definition, generic-conclusion,
  repetitive-faq, heading-repetition`.
* `rules/design.ts`: template-sequence detection (`sequence-template-saas`,
  `generic-saas-hero`), density lints (`gradient-overuse, glassmorphism,
  rounded-everything, shadow-stack, pill-excess, icon-container,
  animation-everywhere, orb-blob, gradient-text`), section monotony
  (`card-grid-monotony, proof-soup`), `generic-cta`.
* `rules/code.ts`: Tailwind/JSX density (`rounded-xl-density, shadow-density,
  gradient-classes, animate-classes`), duplicate grid layouts.
* `rules/image-prompt.ts`: render-token lint (`generic-render-tokens`,
  `neon, cyberpunk, cinematic, …`), `prompt-too-thin`, intentional-use allowance
  (`generic-render-tokens-intentional`), palette checks (`default-tech-palette`).

## 4. Quality gate (`engine/quality-gate.ts`)

16-item checklist. **Default hard gates are factual integrity only**
(`fake-specificity`, `chatbot`) — subjective style never fails a build unless a
project configures it. Standard mode passes when no hard failures exist; `--strict`
also requires every checklist item to pass.

Checklist: no AI clichés · no repetitive structures · no unsupported claims ·
no generic filler · no voice flattening · no punctuation excess · no design
convergence · no decoration · no generic CTAs · no SEO stuffing · no a11y regression
(host-owned, always pass) · no functional regression (host-owned, always pass) ·
no brand violation · no generic openers/closers · no rhythm homogenization ·
no title/heading duplication · no placeholder code · no generic links or alt text ·
no concluding formulae. (The last six are the Pnet/precision additions — soft.)

## 5. Rewrite policy (`engine/rewrite.ts`)

Minimum effective edit. Auto-fixed, in order:

1. Chatbot scaffolding excision (pleasantry openers, `let's dive in`,
   `in conclusion`, `hope this helps`, throat-clearing).
2. Conservative word swaps (`leverage/harness/utilize → use`, `in order to → to`) —
   only when the doc has ≥2 findings (anti-overcorrection: isolated single signals
   are left alone with a `skipped` note).
3. Em-dash triage: beyond 3, extras become periods (first 2 kept).

Everything else → `suggestions`, never silent rewrites. Lexical hits below
`autoFixThreshold` → `skipped`. Rhythm, voice-extras, editorial, and all 10 precision
rules are **suggestion-only by design** (the V2 restraint rule).

## 6. Protection (`engine/protected.ts`)

Never modified, never flagged: `PROTECT_START…PROTECT_END` spans, fenced/inline code,
URLs, emails, quoted material (`"…"`, `"…"`, `>` blockquotes), frontmatter, and every
explicit `protectedTerms` match. The vault is restored after rewriting.

## 7. Custom tone configuration

Resolution order: explicit `ScanOptions` > `<project>/config/anti-slop/*.json` >
bundled `config/anti-slop/*.json`.

**`VoiceProfile`** (`name, sentenceLengthPreference, vocabulary[], formality 0–1,
directness, humor, technicalDensity, emotionalIntensity, pointOfView,
preferredPunctuation[], bannedStylisticHabits[], habitAlternatives{},
brandTerms[], audience, approvedExamples[]`, plus Pnet extras:
`genericOpeners[], fillerTransitions[], contrastCliches[], rhetoricalClosers[],
marketingHype[], hedgeSuperlatives[], articleVoices{}, restraintRule, boundaries[]`).
`vocabulary` + `brandTerms` double as allowlists — those terms are never flagged.

**`ProjectProfile`** (`name, strictness lenient|standard|strict, allowlist[] (pattern
names never flagged), protectedTerms[], hardGates[], maxAutoPasses (default 2),
autoFixThreshold (default 0.85)`, plus Pnet: `titleRules{stuffers[], openerBan[],
genericHeadings[], maxSimilarity 0.8}`, `rhythmLimits{maxShortParas 8,
maxRepeatOpening 4, maxContrast 3, maxPunctDensity 0.015, maxHypeDensity 0.01}`,
`budgets{description:[12,25]}`).

**`DesignProfile`** (`visualDirection, typography[], palette[], density,
shapeLanguage, imageTreatment, illustrationStyle, motionLanguage,
layoutPrinciples[]`).

**`ScanOptions`**: `contentType, mode, voiceProfile, designProfile, projectProfile,
protectedTerms[], strictness, llmCritique(text, findings) (layer-5 hook, sync/async),
tasteMemoryPath, voiceExtras`.

**Pnet canonical extras file** (kept in place, never moved):
`<project>/config/voice/anti-patterns.json`
(`marketing_hype, generic_openers, filler_transitions, contrast_cliches,
rhetorical_closers, hedge_superlatives`), loaded by `loadVoiceExtras()` and merged
with inline `voice.json` arrays. Related voice docs: `docs/EDITORIAL.md` (voice +
V2 appendix), `docs/VOICE_MEMORY.md` (compact agent memory),
`config/voice/anti-patterns.json`, `scripts/language-gate.py` (report-only scanner),
`scripts/editorial-audit.py` (hard blacklist/superlative/title checks).

**Taste memory** (per-project `.anti-slop-memory.json`, never shared):
`feedback --pattern P --kind approve|reject|edit|mark-good|mark-slop`.
Approvals attenuate a pattern (≤0.15), rejections boost it. Taste overrides live here,
never as one-off exceptions in prose.

| Project file | Purpose |
| --- | --- |
| `config/anti-slop/voice.json` | Sentence length, formality, banned habits, brand terms, audience + inline extras arrays |
| `config/anti-slop/design.json` | Visual direction, type, palette, density, motion, layout principles |
| `config/anti-slop/rules.json` | strictness, allowlist, protectedTerms, hardGates, maxAutoPasses, autoFixThreshold, titleRules, rhythmLimits, budgets |
| `config/anti-slop/protected-terms.json` | Product/trademark/API/SEO terms never flagged or rewritten |
| `config/voice/anti-patterns.json` | Canonical Pnet voice buckets (see above) |

## 8. Interfaces

**CLI** (`node dist/cli.js`, zero-dep; reads stdin when no file given, exit 1 on gate fail):

```bash
anti-slop scan   [--type prose|markdown|seo|code|design|image-prompt] [--strict] [file|dir…]
anti-slop audit  [same]            # scan + safe edits + rescan + gate (per file for multi-inputs)
anti-slop rewrite [--type T] --out FILE [file]
anti-slop design  FILE…             # UI structure audit from source
anti-slop compare FILE_A FILE_B     # before/after finding counts
anti-slop feedback --pattern P --kind approve|reject|edit|mark-good|mark-slop
```

Repo shortcuts: `npm run anti-slop:scan | anti-slop:strict | anti-slop:test |
content:validate` (editorial + per-file audit over blog/projects/shop).
Multi-file inputs are audited **per file** (lexical frequency-vs-length is
per-document; concatenating corpora inflates counts into false highs).

**Programmatic API** (`src/api.ts`, `src/index.ts`):

```ts
import { audit, scan, guard } from '@forwardos/anti-slop';
import { handleAudit, handleBatch } from '@forwardos/anti-slop/api';

const report = await audit(text, {
  contentType: 'markdown', mode: 'audit', strictness: 'standard',
  voiceProfile, projectProfile, protectedTerms, voiceExtras,
  llmCritique, // optional layer-5 hook
});
// report: { summary, findings, textIssues, designIssues, structuralIssues,
//           seoIssues, voiceIssues, recommendedChanges, changesMade,
//           remainingRisks, qualityGate:{passed, hardFailures, softWarnings, checklist},
//           quality?, rewritten? }
```

**MCP** (Claude/Cursor/Codex/Gemini/Copilot — stdio, zero dependencies):

```json
{ "mcpServers": { "anti-slop": {
  "command": "node",
  "args": ["<repo>/modules/anti-slop/dist/mcp/server.js"] } } }
```

Tools: `anti_slop_scan, anti_slop_audit, anti_slop_rewrite, anti_slop_design_audit,
anti_slop_image_prompt, anti_slop_seo_audit, anti_slop_code_audit, anti_slop_compare,
anti_slop_quality_gate`. The server loads project profiles/extras from `cwd`, so run
it from the repo root. Rebuild first (`npm run anti-slop:build`; `dist/` is gitignored).

## 9. Tests

`npm run anti-slop:test` — 64 assertions over `tests/corpus/` (obvious slop blocked;
good technical/docs/table prose passes; SEO/design/image-prompt behavior; protected-span
survival; rewrite restraint; taste memory; MCP smoke test; voice-drift; never-write
lexicon + tropes.fyi patterns; Pnet extras; all 10 precision rules incl. the
`manufactured-gravity` regex-typo regression). Add a corpus case + assertion per new
rule (see `AGENTS.md`).

## 10. Provenance

Vendored from `pantaleone-halai-central → modules/anti-slop`
(pinned commit `9cde28363`, vendored 2026-09-20; method: file copy).
Pnet extensions on top are listed in `PROVENANCE.md` and must survive any resync —
diff them first, re-apply after copying. Quality improvement only, never authorship
deception; protected spans keep attribution, disclosures, and legal text verbatim.
Pattern taxonomies informed by community anti-slop research; all code here is original
implementation (see `ATTRIBUTION.md`).
