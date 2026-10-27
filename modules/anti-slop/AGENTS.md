# AGENTS.md — anti-slop engine operator guide

For AI agents working in `modules/anti-slop/`. Read this + `README.md` before touching
any engine file. Companion docs: repo `docs/CONTENT_ENGINE.md` (content pipeline),
`docs/EDITORIAL.md` (voice), `docs/VOICE_MEMORY.md` (compact voice memory),
`PROVENANCE.md` (vendored base + Pnet extension list — resync rules).

## 1. What this module is

Deterministic slop scanner → minimum-effective-edit rewriter → quality gate.
Zero runtime deps. Standalone `tsconfig.json` (no monorepo base config).
`dist/` is build output and is **gitignored** — always `npm run anti-slop:build`
before CLI/MCP/tests.

## 2. Everyday commands (run from repo root)

```bash
npm run anti-slop:build                    # tsc -p modules/anti-slop (required first)
npm run anti-slop:test                     # build + 64-assertion suite (must stay green)
npm run anti-slop:scan -- <files>          # report only, exit 0
npm run anti-slop:audit -- <files>         # scan + safe edits + rescan + gate
npm run anti-slop:strict -- <files>        # audit, fail on any hard gate
npm run content:validate                   # editorial + per-file audit (blog/projects/shop)
npm run editorial                           # python hard checks (blacklist, titles, headings)
npm run voice:gate                          # python report-only rhythm scan
```

`content:validate` failing on `fake-specificity`/`chatbot` in shop/blog copy is the
engine working — fix the copy or protected-terms, never weaken the gate silently.

## 3. Non-negotiable invariants

1. **Soft by default.** New rules are `medium`/`low`, suggestion-only, never auto-fixed,
   never added to default `hardGates` (`fake-specificity`, `chatbot` only). A `high`
   severity alone must not fail standard builds.
2. **Anti-overcorrection.** Isolated single signals are skipped; lexical auto-edit needs
   corroborating findings; conventional structures pass when the user's task justifies
   them. When in doubt, suggest — don't rewrite.
3. **Protected spans are sacred.** Code, quotes, URLs, frontmatter, `PROTECT_START…END`,
   protected terms: never flagged, never rewritten. New text analyzers run on
   `analyzedText`; anything needing raw input (frontmatter, fenced code) goes through
   `analyzeXRaw(input)` in the orchestrator's `extra[]` path.
4. **No hardcoded voice lists in `src/`.** Every Pnet phrase list lives in JSON
   (`config/anti-slop/*.json`, canonical `config/voice/anti-patterns.json`) and loads
   via `profiles.ts`. Engine code holds only generic dictionaries (tech terms,
   stopwords, verb lists).
5. **Resync preservation.** `PROVENANCE.md` lists every Pnet-owned file. Upstream resync
   = copy base files, then re-apply the Pnet blocks. Never drop them silently.
6. **Tests for every rule.** New rule = corpus case (or inline string) + assertion(s) in
   `tests/run.mjs` + `STATIC_DEFS`-style definition entry wherever findings are dumped.
   The suite must remain fully green — fix the rule, not the threshold, when a
   pre-existing test complains (threshold changes need explicit user approval).

## 4. How to add a detection rule

1. Pick the home file: `rules/text.ts` (lexical/rhetorical/style/content),
   `rules/rhythm.ts` (prose rhythm), `rules/editorial.ts` (markdown structure, RAW
   input), `rules/voice-extras.ts` (voice buckets), `rules/precision.ts`
   (cross-cutting precision checks), `rules/seo|design|code|image-prompt.ts`
   (content-type analyzers). Create a new file only for a coherent new family.
2. Pattern naming: `kebab-case`, namespaced by family
   (`voice-…`, `title-…`, `generic-…`). One pattern string per distinct actionable
   item — the CSV groups by it.
3. Finding shape: `{ category (fixed enum in types.ts), severity, confidence 0..1,
   pattern, explanation (instance-specific), suggested_action (concrete rewrite
   direction), layer (1–6), location (≤~120-char excerpt), offset? }`.
   Category must be an existing enum value (`lexical|rhetorical|style|content|
   chatbot|seo|design|structure|image-prompt|code|voice`) — update the orchestrator's
   `partition()` only if a new category is truly needed (avoid).
4. Wire-up: text rules → called from `scanText()` or via `analyzeXText(analyzedText)`
   in the orchestrator's per-pass `precisionOf`/`rhythmOf` helpers; raw rules →
   `extra[]` (runs once on original input). Gate: add a **soft** checklist item in
   `quality-gate.ts` (fails strict only). Rewrite: do NOT add auto-fixes without
   explicit user approval — suggestions only.
5. Respect `allowlist` (skip when `projectProfile.allowlist` contains the pattern),
   `isAllowed()` for lexical terms, and `guard`-style density minimums for
   short inputs (rates spike on tiny docs).
6. Docs: add the rule to `README.md` §3 table + `PROVENANCE.md` if it's a new file.

## 5. How to tune voice (no code changes)

1. One-off taste: `anti-slop feedback --pattern "<pattern>" --kind approve|reject`
   (attenuates/boosts ≤0.15, stored in `.anti-slop-memory.json`, per-project).
2. Permanent vocabulary: add to `voice.json` (`vocabulary`/`brandTerms` = never-flag),
   `bannedStylisticHabits` + `habitAlternatives` (emits `voice-drift` with the fix).
3. New phrase family: extend `config/voice/anti-patterns.json` buckets, or inline
   arrays on `VoiceProfile` (`genericOpeners`, `fillerTransitions`, …) — the loader
   merges both.
4. Project behavior: `config/anti-slop/rules.json` (`strictness`, `allowlist`,
   `hardGates`, `titleRules`, `rhythmLimits`, `budgets`). Never add subjective style
   patterns to `hardGates` without explicit user approval.
5. Verify: `npm run anti-slop:test` + `npm run content:validate`; compare
   before/after finding counts (`anti-slop compare`) on 2–3 real posts.

## 6. Debugging a finding

* Reproduce: `node modules/anti-slop/dist/cli.js scan --type markdown <file>`.
* Locate the rule: `grep -rn "<pattern-prefix>" src/rules/ | head`.
* Full-corpus CSV: `node <tmp>/dump-findings.mjs <out>.csv` (script lives outside the
  repo; schema `[file, severity, category, rule_name, confidence, layer,
  offending_text, rule_definition, reason, suggested_action]`).
* Excerpt shows `[protected]` where the vault masked spans; raw NUL bytes in output
  mean the dumper's `norm()` needs the placeholder cleanup (see script).
* Gate failure? Check `hardFailures` (default: only `fake-specificity`/`chatbot`) —
  everything else is advisory in standard mode.

## 7. PR checklist for engine changes

- [ ] `npm run anti-slop:build` clean, `npm run anti-slop:test` fully green
- [ ] `npm run content:validate` run; deltas explained (failing files listed)
- [ ] New/changed rules documented in `README.md` §3 (+ `PROVENANCE.md` if new file)
- [ ] No new `hardGates`, no new auto-fix rewrites, no hardcoded phrase lists
- [ ] Protected spans + allowlist + short-input guards honored
- [ ] Commit scoped to `modules/anti-slop/` (+ `docs/` notes); never bundle
      unrelated workspace changes
