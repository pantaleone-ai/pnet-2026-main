# AGENT PROMPT — install the anti-slop engine in this project

> Paste this whole file to a coding agent working in the target project.
> Replace `{{MODULE_SOURCE}}` with the path to a checkout containing
> `modules/anti-slop/` (e.g. `/path/to/pnet-2026-main/modules/anti-slop`).
> The agent needs: a shell, Node 18+, TypeScript (via `npx tsc`).

---

You are installing the **anti-slop engine** (deterministic AI-writing quality gate:
scan → minimum-effective-edit → quality gate) from `{{MODULE_SOURCE}}` into this
project's working tree. Follow these steps exactly. Do not skip verification.

## Step 0 — understand the engine (read-only)

1. Read `{{MODULE_SOURCE}}/README.md` (full capability + rule catalog) and
   `{{MODULE_SOURCE}}/AGENTS.md` (operator invariants — obey §3 absolutely:
   soft-by-default, no auto-fix additions, protected spans sacred, no hardcoded
   voice lists, tests for every rule).
2. Confirm the source builds: `npx tsc -p {{MODULE_SOURCE}} --noEmit`.
   If that fails, STOP and report — do not install a broken copy.

## Step 1 — install

Run (flags optional, recommended as shown):

```bash
node {{MODULE_SOURCE}}/install.mjs . --apply-scripts
```

This copies the module to `./modules/anti-slop/` and scaffolds neutral starter
configs under `./config/`. It never overwrites existing files — verify its output
lists what was written vs kept.

## Step 2 — voice interview (do this with the user, briefly)

Ask the user, in one round, and write the answers into the scaffolded configs:

1. **Banned habits**: which marketing/AI-cliché words must never ship?
   → `config/anti-slop/voice.json` → `bannedStylisticHabits` (+ `habitAlternatives`
   with the preferred replacement for each).
2. **Brand terms**: product names, trademarks, API names, SEO terms that must
   never be flagged → `config/anti-slop/protected-terms.json` → `terms`.
3. **Phrase buckets**: any project-specific openers/fillers/closers/hype/hedges?
   → `config/voice/anti-patterns.json` (keep the starter entries that apply,
   delete the rest).
4. **Strictness**: `standard` (recommended: only factual-integrity fails builds) or
   `strict` (style findings also fail CI) → `config/anti-slop/rules.json`.
   NEVER add subjective style patterns to `hardGates` without explicit user approval.
5. **Protected vocabulary**: domain terms the scanner must treat as signal, not
   noise → `voice.json` → `vocabulary` + `brandTerms`.

Keep every answer in config — never hardcode a user preference into prose or
propose one-off exceptions.

## Step 3 — verify (all must pass)

Build prerequisites first (runtime stays zero-dependency):

```bash
npm i -D typescript @types/node
npm run anti-slop:build && npm run anti-slop:test
```

The suite must be fully green. If the host project lacks
`config/voice/anti-patterns.json`, the tests use a built-in fixture — that is
expected, not a failure. If any other assertion fails, fix the install (not the
thresholds) and re-run.

## Step 4 — first scan + CI + MCP

1. Scan real content: `npm run anti-slop:scan -- <content files or dirs...>`.
   Multi-file inputs are audited per file automatically.
2. Summarize findings by severity for the user. Default hard gates are
   `fake-specificity` + `chatbot` only — highs of other patterns are advisory.
   Propose wording fixes for genuine hits; for false-positive-class hits (quoted
   material, topical vocabulary, standard terms), propose `allowlist` /
   `protected-terms` / fencing instead of prose edits. Never edit quoted, example,
   or system-prompt content to satisfy the scanner — re-fence it so the
   protection layer exempts it.
3. Wire CI with the strict audit command on the project's content dirs.
4. Wire MCP using the JSON in the installer's printed output (run from the
   project root; rebuild first since `dist/` is gitignored).
5. Report back: what was installed where, test result, first-scan summary
   (counts by severity + the top 5 patterns), and what you left for the user
   to decide.

## Constraints

- Zero runtime dependencies — if your plan adds any, stop and re-plan.
- `dist/` is build output: never commit it, never copy it between projects.
- Never weaken `hardGates` silently; never strengthen them without approval.
- Commit scoped to the module + `config/` + docs; never bundle unrelated changes.
