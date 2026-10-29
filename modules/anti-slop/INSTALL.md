# Installing anti-slop in another project

The engine is self-contained: zero runtime dependencies, own `tsconfig.json`,
no monorepo base config. You copy one folder, build, and tune JSON configs —
no code changes needed.

## Option A — installer script (recommended)

```bash
node /path/to/anti-slop/install.mjs /path/to/your-project --apply-scripts
cd /path/to/your-project
npm run anti-slop:build && npm run anti-slop:test   # must be green
npm run anti-slop:scan -- <your content files...>
```

The installer copies `src/`, `config/` (bundled defaults), `tests/`, and docs into
`<project>/modules/anti-slop/`, scaffolds neutral starter configs under
`<project>/config/`, records provenance in `INSTALLED-FROM.md`, and — with
`--apply-scripts` — merges npm scripts without overwriting yours. It never
overwrites existing configs; re-run anytime to refresh the module copy.

Tune these four files (all soft by default; only `fake-specificity` + `chatbot`
fail builds):

| File | Purpose |
| --- | --- |
| `config/anti-slop/voice.json` | Banned habits + fixes, brand terms (never flagged), audience |
| `config/anti-slop/rules.json` | Strictness, allowlist, hard gates, title/rhythm budgets |
| `config/anti-slop/protected-terms.json` | Product/trademark/API names that never flag |
| `config/voice/anti-patterns.json` | Project phrase buckets (merged with `voice.json`) |

Then wire CI (fails on factual-integrity violations only):

```bash
node modules/anti-slop/dist/cli.js audit --strict --type markdown <content-dirs...>
```

And MCP (run from the project root):

```json
{ "mcpServers": { "anti-slop": {
  "command": "node",
  "args": ["<abs-path>/modules/anti-slop/dist/mcp/server.js"] } } }
```

## Option B — manual copy

```bash
mkdir -p your-project/modules
cp -R /path/to/anti-slop your-project/modules/anti-slop
rm -rf your-project/modules/anti-slop/dist
cd your-project
npx tsc -p modules/anti-slop && node modules/anti-slop/tests/run.mjs
```

Then create the four config files (copy the shapes from
`modules/anti-slop/config/anti-slop/*.json` and the installer template for
`config/voice/anti-patterns.json`), add the npm scripts from the installer
output, and scan.

## Option C — paste the agent prompt

Give [`AGENT-PROMPT.md`](./AGENT-PROMPT.md) to any coding agent (in any repo, any
stack). It instructs the agent to install, configure, verify, and wire CI+MCP
itself, including the per-project voice interview.

## Updating later

Re-run `install.mjs` into a scratch dir, `diff -r` the `src/` trees, and re-apply
any local tweaks. Never edit installed `src/` to fix content — tune `config/`.
Keep `INSTALLED-FROM.md` current.

## Requirements & limits

- Node 18+. No `npm install` needed inside the module at runtime.
- TypeScript + `@types/node` for the build step only:
  `npm i -D typescript @types/node` (the module itself stays zero-dependency).
- The engine is deterministic and offline; the optional layer-5 LLM critique hook
  is the only place a model call can happen, and only if you inject one.
- Default hard gates are factual-integrity only. Subjective style never fails a
  build unless you configure it to.
