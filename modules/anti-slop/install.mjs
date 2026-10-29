#!/usr/bin/env node
/**
 * anti-slop installer — copies this self-contained module into any project
 * and scaffolds neutral starter configs. Zero dependencies (node builtins).
 *
 * Usage:
 *   node /path/to/anti-slop/install.mjs <target-dir> [--apply-scripts] [--module-dir modules/anti-slop]
 *
 *   <target-dir>      project root to install into (created if missing)
 *   --apply-scripts   merge anti-slop npm scripts into target package.json
 *                     (never overwrites existing script entries)
 *   --module-dir      install location inside target (default: modules/anti-slop)
 *
 * After install, the script prints project-specific next steps (build,
 * tune configs, scan, MCP wiring). Re-run anytime to refresh the module
 * copy — local config/* files are never overwritten.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function usage() {
  process.stderr.write(
    "anti-slop installer\n\n" +
    "Usage: node install.mjs <target-dir> [--apply-scripts] [--module-dir <dir>]\n\n" +
    "  <target-dir>     project root to install into (created if missing)\n" +
    "  --apply-scripts  merge npm scripts into target package.json (no overwrites)\n" +
    "  --module-dir     install path inside target (default: modules/anti-slop)\n"
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
const targetArg = argv.find((a) => !a.startsWith("--") && argv.indexOf(a) === argv.findIndex((b) => !b.startsWith("--")));
let moduleDir = "modules/anti-slop";
const mdIdx = argv.indexOf("--module-dir");
if (mdIdx !== -1) {
  if (!argv[mdIdx + 1]) usage();
  moduleDir = argv[mdIdx + 1].replace(/\/+$/, "");
}
const applyScripts = argv.includes("--apply-scripts");
if (!targetArg || argv.includes("--help") || argv.includes("-h")) usage();

const target = resolve(targetArg);
const dest = join(target, moduleDir);

// 1. Copy module (excluding build output and junk — target builds itself).
mkdirSync(dest, { recursive: true });
for (const entry of ["src", "config", "tests", "package.json", "tsconfig.json", "README.md", "ATTRIBUTION.md", "AGENTS.md", "INSTALL.md", "AGENT-PROMPT.md"]) {
  const from = join(here, entry);
  if (!existsSync(from)) continue;
  cpSync(from, join(dest, entry), { recursive: true });
}
try {
  // Never ship a stale dist/ — target builds from source.
  const { rmSync } = await import("node:fs");
  rmSync(join(dest, "dist"), { recursive: true, force: true });
} catch { /* already absent */ }

// 2. Scaffold neutral starter configs (never overwrite existing).
const writeOnce = (rel, content) => {
  const p = join(target, rel);
  if (existsSync(p)) {
    console.log(`keep  ${rel} (already exists)`);
    return;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log(`wrote ${rel}`);
};

writeOnce("config/anti-slop/voice.json", JSON.stringify({
  name: "default",
  sentenceLengthPreference: "mixed",
  vocabulary: [],
  formality: 0.5,
  directness: 0.7,
  humor: 0.2,
  technicalDensity: 0.5,
  emotionalIntensity: 0.2,
  pointOfView: "mixed",
  preferredPunctuation: [".", ",", ":"],
  bannedStylisticHabits: ["leverage", "utilize", "delve", "in conclusion", "let's dive in"],
  habitAlternatives: { leverage: "use", utilize: "use", delve: "look at, explore, study" },
  brandTerms: [],
  audience: "technical readers",
  approvedExamples: [],
}, null, 2) + "\n");

writeOnce("config/anti-slop/rules.json", JSON.stringify({
  name: "default",
  strictness: "standard",
  allowlist: [],
  protectedTerms: [],
  hardGates: ["fake-specificity", "chatbot"],
  maxAutoPasses: 2,
  autoFixThreshold: 0.85,
  titleRules: {
    stuffers: ["free ", "ultimate", "modern ", "official", "production-ready"],
    openerBan: ["the ultimate", "the complete", "a comprehensive", "the definitive", "everything you need to know"],
    genericHeadings: ["introduction", "overview", "summary", "conclusion", "background", "preface"],
    maxSimilarity: 0.8,
  },
  rhythmLimits: {
    maxShortParas: 8,
    maxRepeatOpening: 4,
    maxContrast: 3,
    maxPunctDensity: 0.015,
    maxHypeDensity: 0.01,
  },
}, null, 2) + "\n");

writeOnce("config/anti-slop/protected-terms.json", JSON.stringify({
  terms: [],
  _comment: "Add product names, trademarks, API names, required SEO keywords, and intentional stylistic terms. These are never flagged or rewritten.",
}, null, 2) + "\n");

writeOnce("config/voice/anti-patterns.json", JSON.stringify({
  note: "High-signal review set, not a literal blacklist. Terms may remain when factually necessary, part of a product name, quotation, source, or genuinely clearest wording. The engine merges these buckets with voice.json inline arrays.",
  marketing_hype: ["cutting-edge", "revolutionary", "game-changing", "seamless", "robust", "unlock", "harness", "leverage"],
  generic_openers: ["in today's rapidly changing", "in today's ai landscape", "as ai continues to evolve", "the world of ai"],
  filler_transitions: ["let's dive in", "it's important to note", "here's the thing"],
  contrast_cliches: ["the answer isn't", "the goal isn't"],
  rhetorical_closers: ["the future is", "now is the time"],
  hedge_superlatives: ["simply", "just", "clearly", "powerful"],
}, null, 2) + "\n");

// 3. Record provenance for future resyncs.
let sourceRev = "unknown";
try {
  sourceRev = execSync("git rev-parse --short HEAD", { cwd: here }).toString().trim();
} catch { /* not a git checkout */ }
writeOnce(join(moduleDir, "INSTALLED-FROM.md"), `# Installed from\n\n- Source: ${here}\n- Commit: ${sourceRev}\n- Date: ${new Date().toISOString().slice(0, 10)}\n\nTo update: re-run install.mjs into a scratch dir, diff \`src/\`, and re-apply local tweaks. Never edit installed \`src/\` to fix content — tune \`config/\` instead.\n`);

// 4. Optionally merge npm scripts.
const SCRIPTS = {
  "anti-slop:build": "tsc -p modules/anti-slop",
  "anti-slop:test": "npm run anti-slop:build && node modules/anti-slop/tests/run.mjs",
  "anti-slop:scan": `npm run anti-slop:build && node ${moduleDir}/dist/cli.js scan --type markdown`,
  "anti-slop:audit": `npm run anti-slop:build && node ${moduleDir}/dist/cli.js audit --type markdown`,
  "anti-slop:strict": `npm run anti-slop:build && node ${moduleDir}/dist/cli.js audit --strict --type markdown`,
};
if (moduleDir !== "modules/anti-slop") {
  SCRIPTS["anti-slop:build"] = `tsc -p ${moduleDir}`;
  SCRIPTS["anti-slop:test"] = `npm run anti-slop:build && node ${moduleDir}/tests/run.mjs`;
}
const pkgPath = join(target, "package.json");
if (applyScripts) {
  if (!existsSync(pkgPath)) {
    console.log("skip  package.json scripts (no package.json in target — add manually, see below)");
  } else {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.scripts = pkg.scripts ?? {};
    for (const [k, v] of Object.entries(SCRIPTS)) {
      if (pkg.scripts[k]) {
        console.log(`keep  script "${k}" (already exists)`);
      } else {
        pkg.scripts[k] = v;
        console.log(`added script "${k}"`);
      }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}

// 5. Next steps.
const rel = (p) => p;
console.log(`
Installed anti-slop to ${rel(dest)}.

Next steps (in ${rel(target)}):
  0. Build prerequisites (one time; runtime needs nothing):
       npm i -D typescript @types/node
  1. Build + self-test:
       npx tsc -p ${rel(moduleDir)} && node ${rel(join(moduleDir, "tests/run.mjs"))}
  2. Tune voice (no code changes needed):
       ${rel("config/anti-slop/voice.json")}          banned habits, brand terms, audience
       ${rel("config/anti-slop/rules.json")}          strictness, allowlist, hard gates
       ${rel("config/anti-slop/protected-terms.json")}  product names that never flag
       ${rel("config/voice/anti-patterns.json")}      project phrase buckets
  3. Scan something:
       node ${rel(join(moduleDir, "dist/cli.js"))} scan --type markdown <files...>`);
if (!applyScripts) {
  console.log(`  (optional) re-run with --apply-scripts, or add these npm scripts manually:`);
  for (const [k, v] of Object.entries(SCRIPTS)) console.log(`       "${k}": "${v}"`);
}
console.log(`
  4. MCP (Claude/Cursor/Codex/Copilot), run from the project root:
       { "mcpServers": { "anti-slop": {
           "command": "node",
           "args": ["<abs-path-to>/${rel(join(moduleDir, "dist/mcp/server.js"))}"] } } }
  5. CI gate (fail on factual-integrity violations only by default):
       node ${rel(join(moduleDir, "dist/cli.js"))} audit --strict --type markdown <content-dirs...>
`);
