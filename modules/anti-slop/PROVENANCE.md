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
