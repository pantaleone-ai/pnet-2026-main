# @forwardos/anti-slop

Reusable, production-grade **Anti-Slop system**: a quality-control and transformation
layer that detects recognizable AI-generation patterns and applies **minimum effective
edits** — across text, UI structure, SEO, code, and image prompts.

Not a "humanizer." It does not pretend AI content is human. It makes everything more
**specific, intentional, original, natural, useful, brand-appropriate, and visually
distinctive** — while preserving meaning, factual accuracy, brand voice, accessibility,
SEO value, and author intent.

## Pipeline

```
INPUT → SCAN → CLASSIFICATION → TARGETED EDITS → RE-SCAN → QUALITY GATE → OUTPUT
```

Operating rule: **DETECT → EXPLAIN → MINIMUM EFFECTIVE EDIT → RECHECK.**
Max 2 automatic revision passes. If the content is good, it is left alone.

## Install

```bash
# from the monorepo root (npm workspaces links it everywhere)
npm run build --workspace=@forwardos/anti-slop

# any other project: copy modules/anti-slop, then
npm run build && npm test
```

Zero runtime dependencies. Node 18+.

## CLI

```bash
npx anti-slop scan    [--type prose|markdown|seo|code|design|image-prompt] [--strict] [file…]
npx anti-slop audit   [same]              # scan + safe edits + rescan + gate
npx anti-slop rewrite [--type T] --out FILE [file]
npx anti-slop design  FILE…               # UI structure audit from source
npx anti-slop compare FILE_A FILE_B       # before/after finding counts
npx anti-slop feedback --pattern P --kind approve|reject|edit|mark-good|mark-slop

# root shortcuts
npm run anti-slop          # audit stdin
npm run anti-slop:scan
npm run anti-slop:strict   # fail on any hard gate
```

Reads stdin when no file is given. Exit 1 on gate failure.

## Programmatic API

```ts
import { audit, scan, guard } from '@forwardos/anti-slop';
import { handleAudit, handleBatch } from '@forwardos/anti-slop/api';

const report = await audit(text, {
  contentType: 'prose',
  mode: 'audit',               // scan | audit | rewrite | guard
  strictness: 'standard',      // lenient | standard | strict
  voiceProfile, projectProfile, protectedTerms,
  llmCritique,                 // optional layer-5 hook
});
```

HTTP-style handlers also exist for every endpoint:
`handleScan / handleAudit / handleRewrite / handleDesign / handleImagePrompt /
handleSeo / handleCode / handleBatch` — see `apps/nft-mint-app/app/api/anti-slop/route.ts`
for the wired Next.js route (`POST /api/anti-slop { action, content, … }`,
plus `{ action: 'batch', requests: [...] }`).

## MCP (Claude / Cursor / Codex / Gemini / Copilot)

Zero-dependency stdio server:

```json
{ "mcpServers": { "anti-slop": {
  "command": "node",
  "args": ["<repo>/modules/anti-slop/dist/mcp/server.js"]
} } }
```

Tools: `anti_slop_scan`, `anti_slop_audit`, `anti_slop_rewrite`,
`anti_slop_design_audit`, `anti_slop_image_prompt`, `anti_slop_seo_audit`,
`anti_slop_code_audit`, `anti_slop_compare`, `anti_slop_quality_gate`.

## Architecture

```
src/
  types.ts                  Finding / QualityScore / Voice+Design+Project profiles
  engine/
    scanner.ts              L1 lexical (contextual) · L2 rhetorical/chatbot ·
                            L3 style/structure · L4 semantic heuristics
    quality-model.ts        internal 10-dimension TEXT_QUALITY_SCORE
    rewrite.ts              minimum-effective-edit (safe transforms only)
    quality-gate.ts         13-item ship checklist + configurable hard gates
    orchestrator.ts         audit/scan/guard, ≤2 passes, optional LLM hook
    protected.ts            PROTECT_START…END, code, URLs, quotes, frontmatter
    taste-memory.ts         per-project .anti-slop-memory.json feedback store
  rules/
    text.ts                 lexical signals + rhetorical frames + style + content
    seo.ts                  stuffing, empty definitions, templated FAQ, repetition
    design.ts               density + structural sequence (template detection)
    image-prompt.ts         render-token lint with intentional-use allowance
    code.ts                 Tailwind/JSX/Markdown density analysis
  profiles.ts               config/anti-slop/*.json loader (project > bundled)
  api.ts                    framework-agnostic handlers
  cli.ts                    CLI
  mcp/server.ts             MCP stdio server
```

Layer 5 (LLM critique) is an **injected hook**, never a built-in call — deterministic
layers stand alone, so the engine works offline with no API keys.

## Detection philosophy

Slop is a **combination** of lexical, sentence, rhetorical, structural, and visual
patterns — never a banned-word list. A word is a *signal*; severity comes from
frequency vs document length, clustering with other signals, and project context
(allowlist, voice profile, protected terms). Single use in a long doc stays low.

## Configuration

The bundled default voice (`config/anti-slop/voice.json`) is the Matt Pantaleone
operator voice: concise, direct, commercially aware, technically credible —
clarity over cleverness, execution over theater. Its banned habits
(corporate/AI clichés, hedging, engagement bait) are enforced as voice-drift
findings; its builder vocabulary and SEO entities are allowlisted/protected.
The never-write lexicon (~170 terms) and the structural trope rules
(countdown negation, self-answered questions, bold-bullet symmetry,
invented concept labels, analogy stacking) derive from
[tropes.fyi](https://tropes.fyi) via the project's gist — see ATTRIBUTION.md.
Two deliberate exclusions: bare "bear" (animal vs. market needs word-sense
judgment) and bare "void" (legitimate in legal language).

Per-project overrides in `<project>/config/anti-slop/`:
| file | purpose |
| ---- | ------- |
| `voice.json` | sentence length, formality, banned habits, brand terms, audience, approved examples |
| `design.json` | visual direction, type, palette, density, motion, layout principles |
| `rules.json` | strictness, allowlist, protectedTerms, hardGates, maxAutoPasses, autoFixThreshold |
| `protected-terms.json` | product/trademark/API/SEO terms never flagged or rewritten |

Defaults ship in this package's `config/anti-slop/`. Default hard gates are
**factual integrity only** (`fake-specificity`, `chatbot`) — subjective style never
fails a build unless a project configures it.

## Quality gate checklist

No AI clichés · no repetitive structures · no unsupported claims · no generic filler ·
no voice flattening · no punctuation excess · no design convergence · no decoration ·
no generic CTAs · no SEO stuffing · no a11y/functional regression (host suite owns
these) · no brand violation.

## Feedback / taste memory

```bash
anti-slop feedback --pattern "lexical-signal:robust" --kind approve
```

Approvals attenuate a pattern (≤0.15), rejections boost it. Stored per project in
`.anti-slop-memory.json`. Never shared across sites.

## Anti-overcorrection

The engine refuses novelty-for-novelty's-sake: isolated single signals are skipped,
lexical auto-edit requires corroborating findings, conventional structures pass when
justified by the user's task, and the final reviewer asks 10 checks including
"did we over-edit?" and "would this make sense without knowing AI was involved?"

## Provenance

Quality improvement only — never authorship deception. Protected spans keep
attribution, disclosures, and legal text verbatim.

## Testing

`npm test` runs 37 assertions over a mixed corpus (`tests/corpus/`): obvious slop
(blocked), good technical/docs/table prose (passes), SEO slop, UI template slop,
generic vs art-directed image prompts, protected-span survival, rewrite behavior,
taste memory, and an MCP stdio smoke test.

## Licensing of incorporated ideas

Pattern taxonomies informed by community anti-slop research; all code here is
original implementation. See ATTRIBUTION.md.
