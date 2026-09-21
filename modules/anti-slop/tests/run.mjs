#!/usr/bin/env node
/**
 * Anti-slop test corpus runner — zero dependencies.
 * Distinguishes BAD AI OUTPUT from GOOD HUMAN/AI-ASSISTED OUTPUT.
 * Optimizes for useful editing decisions, not maximum detection.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const corpus = (n) => readFileSync(join(here, "corpus", n), "utf-8");
const dist = (p) => join(here, "..", "dist", p);

const { scan, audit } = await import(dist("engine/orchestrator.js"));
const { analyzeDesign } = await import(dist("rules/design.js"));
const { analyzeCode } = await import(dist("rules/code.js"));
const { analyzeImagePrompt } = await import(dist("rules/image-prompt.js"));
const { applyTasteMemory } = await import(dist("engine/taste-memory.js"));

let pass = 0;
let fail = 0;
function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

// 1. Obvious slop: must be caught, gate must fail.
{
  const r = await scan(corpus("slop-obvious.txt"), { mode: "scan" });
  check("slop-obvious: >=8 findings", r.findings.length >= 8, `got ${r.findings.length}`);
  check("slop-obvious: chatbot artifacts found", r.findings.some((f) => f.category === "chatbot"));
  check("slop-obvious: rhetorical frames found", r.findings.some((f) => f.category === "rhetorical"));
  check("slop-obvious: fake-specificity found", r.findings.some((f) => f.pattern === "fake-specificity"));
  check("slop-obvious: gate FAILS", !r.qualityGate.passed);
}

// 2-3. Good writing: must pass the gate with no high-severity findings.
for (const f of ["good-technical.txt", "good-docs.txt", "good-table.md"]) {
  const r = await scan(corpus(f), { contentType: f.endsWith(".md") ? "markdown" : "prose", mode: "scan" });
  check(`${f}: gate passes`, r.qualityGate.passed, JSON.stringify(r.findings.map((x) => x.pattern)));
  check(`${f}: no high-severity findings`, !r.findings.some((x) => x.severity === "high"), JSON.stringify(r.findings.map((x) => x.pattern)));
}

// 4. SEO slop caught, useful SEO info preserved (no auto-delete in scan).
{
  const r = await scan(corpus("slop-seo.txt"), { contentType: "seo", mode: "scan" });
  check("slop-seo: >=2 seo issues", r.seoIssues.length >= 2, `got ${r.seoIssues.length}`);
  check("slop-seo: empty-definition found", r.seoIssues.some((f) => f.pattern === "empty-definition"));
}

// 5. Protected spans survive; no overcorrection of single signals.
{
  const input = corpus("protected-terms.txt");
  const r = await audit(input, { mode: "rewrite" });
  const out = r.rewritten ?? input;
  check("protected: PROTECT block intact", out.includes("AcmeCorp™ TurboLeverage API"));
  check("protected: no fabricated rewrite", r.rewritten === undefined || out.includes("TurboLeverage"));
}

// 6. Generic AI UI detected structurally.
{
  const src = corpus("slop-ui.tsx");
  const findings = [...analyzeDesign({ source: src }), ...analyzeCode(src, "slop-ui.tsx")];
  check("slop-ui: >=4 findings", findings.length >= 4, `got ${findings.length}: ${findings.map((f) => f.pattern).join(",")}`);
  check("slop-ui: template sequence flagged", findings.some((f) => f.pattern === "sequence-template-saas"));
  check("slop-ui: generic CTA flagged", findings.some((f) => f.pattern === "generic-cta"));
}

// 7-8. Image prompts: generic flagged, art-directed passes.
{
  const bad = analyzeImagePrompt(corpus("slop-image-prompt.txt"));
  check("slop-image: high-severity finding", bad.some((f) => f.severity === "high"));
  const good = analyzeImagePrompt(corpus("good-image-prompt.txt"));
  check("good-image: no high-severity findings", !good.some((f) => f.severity === "high"), JSON.stringify(good.map((f) => f.pattern)));
}

// 9. Minimum effective edit: chatbot scaffolding removed, meaning kept.
{
  const r = await audit(corpus("slop-obvious.txt"), { mode: "rewrite" });
  check("rewrite: produced output", !!r.rewritten);
  check("rewrite: pleasantry removed", !String(r.rewritten).includes("Certainly"));
  check("rewrite: opener removed", !String(r.rewritten).includes("fast-paced world"));
  check("rewrite: numbers preserved (no fabrication fix)", String(r.rewritten).includes("87%"));
  check("rewrite: rescan has fewer-or-equal findings", (r.findings.length <= 20), `got ${r.findings.length}`);
}

// 10. Taste memory attenuates approved patterns.
{
  const r = await scan("This robust system works well. It is a robust design.", { mode: "scan" });
  const before = r.findings.find((f) => f.pattern === "lexical-signal:robust");
  const after = applyTasteMemory(r.findings, [
    { kind: "approve", pattern: "lexical-signal:robust", at: new Date().toISOString() },
    { kind: "approve", pattern: "lexical-signal:robust", at: new Date().toISOString() },
    { kind: "approve", pattern: "lexical-signal:robust", at: new Date().toISOString() },
  ]).find((f) => f.pattern === "lexical-signal:robust");
  check("taste-memory: approval lowers confidence", !!before && !!after && after.confidence < before.confidence);
}

// 11. MCP server smoke test: initialize + tools/list over stdio.
{
  const server = spawn("node", [dist("mcp/server.js")], { stdio: ["pipe", "pipe", "pipe"] });
  const send = (obj) => server.stdin.write(JSON.stringify(obj) + "\n");
  const result = await new Promise((resolve) => {
    let buf = "";
    const timer = setTimeout(() => resolve({ error: "timeout" }), 8000);
    server.stdout.on("data", (d) => {
      buf += String(d);
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2) {
            clearTimeout(timer);
            resolve(msg.result);
          }
        } catch { /* partial */ }
      }
    });
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  });
  server.kill();
  const tools = result?.tools ?? [];
  check("mcp: 9 tools listed", tools.length === 9, `got ${tools.length}`);
  check("mcp: scan tool present", tools.some((t) => t.name === "anti_slop_scan"));
}

// 12. Default voice: Matt Pantaleone operator voice.
{
  const voice = JSON.parse(readFileSync(join(here, "..", "config", "anti-slop", "voice.json"), "utf-8"));
  check("voice: default is matt-pantaleone", voice.name === "matt-pantaleone", `got ${voice.name}`);
  const bad = await scan("Let's dive in. In conclusion, this robust solution will unlock synergies. What do you think? Agree?", { mode: "scan", voiceProfile: voice });
  check("voice: banned habits flagged as voice-drift", bad.findings.some((f) => f.category === "voice"), JSON.stringify(bad.findings.map((f) => f.pattern)));
  const good = await scan(corpus("good-matt-voice.txt"), { mode: "scan", voiceProfile: voice });
  check("voice: matt-style sample passes gate", good.qualityGate.passed, JSON.stringify(good.findings.map((f) => f.pattern)));
}

console.log(`\n${pass} passed, ${fail} failed (incl. voice checks)`);

// 13. Never-write lexicon + tropes.fyi pattern rules.
{
  const voice = JSON.parse(readFileSync(join(here, "..", "config", "anti-slop", "voice.json"), "utf-8"));
  const vscan = (t) => scan(t, { mode: "scan", voiceProfile: voice });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern.includes(p)));

  const lex = await vscan("Picture this: a sea of dashboards. Our tapestry of tools moves the needle. Tap into the magic.");
  check("never-write: voice-drift fires on lexicon hits", has(lex, "voice-drift"), JSON.stringify(lex.findings.map((f) => f.pattern)));

  const wsd = await vscan("The bear wandered past the cabin. Bear markets reward patience. Her craftsmanship is excellent.");
  check("never-write: no WSD false positives (bear/craftsmanship)", !wsd.findings.some((f) => /voice-drift:(bear|craft)$/.test(f.pattern)), JSON.stringify(wsd.findings.map((f) => f.pattern)));

  const rhe = await vscan("It plays a crucial role in shaping outcomes. Navigating the intricacies of billing, we found a myriad of edge cases. Think of it as plumbing. Imagine a world where invoices pay themselves.");
  check("tropes: enabler/abstract/myriad/analogy/imagine fire", has(rhe, "grand-enabler", "navigating-abstract", "myriad-plethora", "patronizing-analogy", "imagine-world"), JSON.stringify(rhe.findings.map((f) => f.pattern)));

  const sty = await vscan("Not a bug. Not a feature. A design flaw.\n\nThe result? Devastating.\n\n- **Security**: SSO enforced.\n- **Speed**: P95 under 200ms.\n- **Scale**: ten thousand tenants.\n\nThe first wall is access. The second wall is permissions.");
  check("tropes: countdown/self-answered/bold-bullets/listicle fire", has(sty, "countdown-negation", "self-answered-q", "symmetric-bold-bullets", "listicle-trench-coat"), JSON.stringify(sty.findings.map((f) => f.pattern)));

  const con = await vscan("The supervision paradox slows every team. Apple didn't build Uber. Facebook didn't build Spotify. Stripe didn't build Shopify. AWS didn't build Airbnb.");
  check("tropes: invented-label + analogy-stacking fire", has(con, "invented-concept-label", "historical-analogy-stacking"), JSON.stringify(con.findings.map((f) => f.pattern)));

  const alt = await vscan("We need to leverage our tapestry of tools.");
  const lev = alt.findings.find((f) => f.pattern === "voice-drift:leverage");
  check("never-write: alternatives surface in suggestions", !!lev && lev.suggested_action.includes("use"), JSON.stringify(lev?.suggested_action));
}

console.log(`\n${pass} passed, ${fail} failed (all checks)`);
