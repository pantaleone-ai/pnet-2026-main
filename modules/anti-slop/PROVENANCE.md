# Provenance — vendored `@forwardos/anti-slop`

- Source: `pantaleone-halai-central` → `modules/anti-slop`
- Pinned commit: `9cde28363` ("feat(anti-slop): enforce never-write lexicon + tropes.fyi pattern rules")
- Vendored: 2026-09-20
- Method: file copy (the module README's blessed path for external projects:
  "any other project: copy modules/anti-slop, then `npm run build && npm test`").
  A git submodule was rejected because it would mount the entire central
  monorepo; this module is self-contained (zero runtime deps, own tsconfig).
- `dist/` is build output and intentionally NOT committed (matches upstream).
  Rebuild with `npm run anti-slop:build`.

## Resync

```bash
# from pantaleone-halai-central-main/modules/anti-slop
for d in src config tests; do cp -R $d <pnet>/modules/anti-slop/; done
cp package.json tsconfig.json README.md ATTRIBUTION.md <pnet>/modules/anti-slop/
# then in pnet: npm run anti-slop:build && npm run anti-slop:test
```

Keep `config/anti-slop/` (project overrides) and this file — they are pnet-owned
and must survive a resync.

## Pnet extensions (preserve on resync — not upstream)

- `src/rules/rhythm.ts`, `src/rules/editorial.ts`, `src/rules/voice-extras.ts`,
  `src/rules/precision.ts` — Pnet voice/rhythm/editorial/precision ports.
- `install.mjs`, `INSTALL.md`, `AGENT-PROMPT.md` — cross-project distribution
  (installer, human guide, paste-ready agent prompt). `tsconfig.json`
  `"types": ["node"]` — required since TypeScript 7 stopped auto-including
  `@types` (verified: clean build on TS 5.9 and 7.0).
- `src/types.ts` (`VoiceExtras`, `TitleRules`, `RhythmLimits`, extended
  `VoiceProfile`/`ProjectProfile`/`ScanOptions`), `src/profiles.ts`
  (`loadVoiceExtras`, `mergeVoiceExtras`, title/rhythm defaults),
  `src/engine/scanner.ts` (voice-extras), `src/engine/orchestrator.ts`
  (rhythm/precision/editorial wiring, per-file CLI audit), `src/engine/quality-gate.ts`
  (soft checklist items), `src/engine/quality-model.ts`, `src/api.ts`,
  `src/cli.ts`, `src/mcp/server.ts`, `src/index.ts`, `config/anti-slop/rules.json`
  (titleRules/rhythmLimits defaults), `tests/run.mjs` (§14–15).
- Upstream resync: diff these files first; re-apply Pnet blocks after copying.
