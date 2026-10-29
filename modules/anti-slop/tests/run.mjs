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
  // Extras widen coverage (openers/closers/rhythm), so bound is relative, not absolute.
  const orig = await scan(corpus("slop-obvious.txt"), { mode: "scan" });
  check("rewrite: rescan has fewer-or-equal findings vs scan", (r.findings.length <= orig.findings.length), `got ${r.findings.length} vs scan ${orig.findings.length}`);
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

// 14. Pnet extra voice layer (full port, soft-only).
// Portable: uses the host project's config/voice/anti-patterns.json when
// present, otherwise a minimal inline fixture covering the tested buckets.
{
  const extrasPath = join(here, "..", "..", "..", "config", "voice", "anti-patterns.json");
  let extras;
  try {
    extras = JSON.parse(readFileSync(extrasPath, "utf-8"));
  } catch {
    extras = {
      generic_openers: ["in today's ai landscape"],
      filler_transitions: ["here's the thing"],
      contrast_cliches: ["the problem isn't"],
      rhetorical_closers: ["now is the time to ship"],
      marketing_hype: ["cutting-edge"],
      hedge_superlatives: ["simply"],
    };
  }
  const vscan = (t, projectProfile) => scan(t, { mode: "scan", voiceExtras: extras, projectProfile });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern.includes(p)));

  const opener = await vscan("In today's AI landscape, we ship automation that removes manual triage.");
  check("extras: generic opener fires voice-generic-opener", has(opener, "voice-generic-opener"), JSON.stringify(opener.findings.map((f) => f.pattern)));

  const filler = await vscan("The pipeline works. Here's the thing, we kept the validator strict.");
  check("extras: filler fires voice-filler", has(filler, "voice-filler"), JSON.stringify(filler.findings.map((f) => f.pattern)));

  const closer = await vscan("The validator rejects the title before the PR opens. Now is the time to ship.");
  check("extras: closer fires voice-closer", has(closer, "voice-closer"), JSON.stringify(closer.findings.map((f) => f.pattern)));

  // Rhythm port: repeated openings + contrast + fragments.
  const rhythm = await vscan("We built the system for review. We built the pipeline for evidence. We built the validator for titles. We built the gate for merges.\n\nShip it.\nRun it.\nMerge it.\nProve it.\nKeep it.\nCut it.\nSave it.\nDone now.\n\nThe problem isn't speed. It is clarity. The goal isn't hype. It is evidence. The answer isn't more. It is less.");
  check("extras: repetition-opening fires", has(rhythm, "repetition-opening"), JSON.stringify(rhythm.findings.map((f) => f.pattern)));
  check("extras: contrast-structure fires", has(rhythm, "contrast-structure"), JSON.stringify(rhythm.findings.map((f) => f.pattern)));
  check("extras: fragments fires", has(rhythm, "fragments"), JSON.stringify(rhythm.findings.map((f) => f.pattern)));

  // Editorial port: title stuffer + banned opener + H1 + duplicate heading.
  // Body padded past the 150-word blurb exemption so heading rules apply.
  const edBody = "Writers shape each chapter around a single task the reader can finish in one sitting. Examples carry the weight, with commands shown exactly as typed. Diagrams mark the boundaries between setup, daily use, and troubleshooting. Readers follow numbered paths through configuration, then verify each stage before moving on. Mistakes get their own callouts with recovery commands attached. Appendices collect reference tables for flags, environment variables, and exit codes. The closing chapter reviews deployment checklists for staging and production targets. Nothing here assumes prior exposure to the toolchain beyond a working shell. Each section ends with a short summary of decisions made along the way. That structure keeps the page scannable while preserving enough depth for careful study and later review. Editors review each draft for broken commands before release. A changelog records updates to flags and paths across releases. Reviewers confirm screenshots match the current interface before sign-off.";
  const md = `---\ntitle: The Ultimate Guide to Free Modern AI\n---\n\n# The Ultimate Guide to Free Modern AI\n\n${edBody}`;
  const ed = await scan(md, { mode: "scan", contentType: "markdown", voiceExtras: extras });
  check("extras: title-stuffer fires", has(ed, "title-stuffer"), JSON.stringify(ed.findings.map((f) => f.pattern)));
  check("extras: banned-title-opener fires", has(ed, "banned-title-opener"), JSON.stringify(ed.findings.map((f) => f.pattern)));
  check("extras: body-opens-with-h1 fires", has(ed, "body-opens-with-h1"), JSON.stringify(ed.findings.map((f) => f.pattern)));
  check("extras: title-heading-duplicate fires", has(ed, "title-heading-duplicate"), JSON.stringify(ed.findings.map((f) => f.pattern)));
  check("extras: editorial never fails standard gate alone", ed.qualityGate.passed, JSON.stringify(ed.qualityGate.hardFailures.map((f) => f.pattern)));

  // Restraint: clean founder-technical prose stays clean with extras on.
  const clean = await vscan("The validator rejects the title before the PR opens. I use GitHub Issues as the queue because each topic needs a durable unit of work. Evidence over opinion.");
  check("extras: clean prose has no high-severity findings", !clean.findings.some((f) => f.severity === "high"), JSON.stringify(clean.findings.map((f) => f.pattern)));

  // Rewrite restraint: soft patterns are suggestion-only, never auto-fixed.
  const { audit } = await import(dist("engine/orchestrator.js"));
  const rw = await audit("In today's AI landscape, we ship. Now is the time to ship.", { mode: "rewrite", voiceExtras: extras });
  check("extras: rewrite leaves soft patterns in place", (rw.rewritten ?? "In today's AI landscape") .includes("In today's AI landscape") || rw.rewritten === undefined, JSON.stringify(rw.changesMade));
}

// 16. Copywriting pack Tier 1: core markers + deception (soft by design).
{
  const t1 = (t, ct = "prose") => scan(t, { mode: "scan", contentType: ct });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern === p));

  const phrase = await t1("This release will pave the way for faster deployments across every team.");
  check("copywriting: Tier-1 phrase fires copywriting-marker", phrase.findings.some((f) => f.pattern === "copywriting-marker:pave the way" && f.severity === "medium"), JSON.stringify(phrase.findings.map((f) => f.pattern)));

  const single = await t1("The new dashboard is a beacon for the entire platform team.");
  check("copywriting: Tier-1 single word fires medium", single.findings.some((f) => f.pattern === "copywriting-marker:beacon" && f.severity === "medium"), JSON.stringify(single.findings.map((f) => f.pattern)));

  const formal = await t1("The migration finished on schedule. Moreover, error rates stayed flat through the cutover window.");
  check("copywriting: formal-register marker stays low", formal.findings.some((f) => f.pattern === "copywriting-marker:moreover" && f.severity === "low"), JSON.stringify(formal.findings.map((f) => f.pattern)));

  const dup = await t1("The landscape shifted after the launch.");
  check("copywriting: engine-covered terms do not double-fire", !dup.findings.some((f) => f.pattern.startsWith("copywriting-marker:")), JSON.stringify(dup.findings.map((f) => f.pattern)));

  const guar = await t1("We guarantee results within thirty days of onboarding.");
  check("deception: guarantee-without-terms fires high-soft", guar.findings.some((f) => f.pattern === "deception-risk:guarantee-without-terms" && f.severity === "high"), JSON.stringify(guar.findings.map((f) => f.pattern)));
  check("deception: highs stay soft (gate passes)", guar.qualityGate.passed, JSON.stringify(guar.qualityGate.hardFailures.map((f) => f.pattern)));

  const free = await t1("Start free today, but the Starter plan bills monthly with no trial period.");
  check("deception: free-with-hidden-conditions fires (same sentence)", has(free, "deception-risk:free-with-hidden-conditions"), JSON.stringify(free.findings.map((f) => f.pattern)));
  const freeClean = await t1("Free on GitHub with instant copy-paste functionality. No account needed.");
  check("deception: genuinely free offer stays silent", !freeClean.findings.some((f) => f.pattern === "deception-risk:free-with-hidden-conditions"), JSON.stringify(freeClean.findings.map((f) => f.pattern)));
  const freeIdiom = await t1("Use the canvas to break free from the grid. Try free-form queries against the index.");
  check("deception: idioms and compounds stay silent", !freeIdiom.findings.some((f) => f.pattern === "deception-risk:free-with-hidden-conditions"), JSON.stringify(freeIdiom.findings.map((f) => f.pattern)));
  const guarNeg = await t1("A gallery is a place to publish and sell, not a guarantee of sales.");
  check("deception: negated guarantee stays silent", !guarNeg.findings.some((f) => f.pattern === "deception-risk:guarantee-without-terms"), JSON.stringify(guarNeg.findings.map((f) => f.pattern)));

  const anthro = await t1("The model understands your intent and routes the request to the right tool.");
  check("deception: anthropomorphic-knowing fires without data story", has(anthro, "deception-risk:anthropomorphic-knowing"), JSON.stringify(anthro.findings.map((f) => f.pattern)));

  const auto = await t1("Deploy fully autonomous agents that act on your behalf around the clock.");
  check("deception: autonomy-without-permissions fires", has(auto, "deception-risk:autonomy-without-permissions"), JSON.stringify(auto.findings.map((f) => f.pattern)));

  const grounded = await t1("The model understands your intent because it was trained on annotated support transcripts.");
  check("deception: grounded knowing-claim stays silent", !grounded.findings.some((f) => f.pattern === "deception-risk:anthropomorphic-knowing"), JSON.stringify(grounded.findings.map((f) => f.pattern)));
}

// 17. Copywriting pack Tier 2: gap rhetorical patterns (deduped vs engine).
{
  const t2 = (t) => scan(t, { mode: "scan" });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern === p));

  const nab = await t2("It is not about the model. It is about the data underneath it.");
  check("tier2: not-about-but-about fires", has(nab, "not-about-but-about"), JSON.stringify(nab.findings.map((f) => f.pattern)));

  const mi = await t2("More than a linter, it is a second pair of eyes on every draft.");
  check("tier2: more-than-inverted fires", has(mi, "more-than-inverted"), JSON.stringify(mi.findings.map((f) => f.pattern)));

  const rf = await t2("The reality is that adoption lags behind the announcements.");
  check("tier2: reality-frame fires", has(rf, "reality-frame"), JSON.stringify(rf.findings.map((f) => f.pattern)));
  const rfs = await t2("The truth is simple: shorter drafts win.");
  check("tier2: reality-frame does not double-fire truth-is-simple", rfs.findings.some((f) => f.pattern === "truth-is-simple") && !rfs.findings.some((f) => f.pattern === "reality-frame"), JSON.stringify(rfs.findings.map((f) => f.pattern)));

  const fi = await t2("Let's be honest, most style guides go unread after week one.");
  check("tier2: false-intimacy fires", has(fi, "false-intimacy"), JSON.stringify(fi.findings.map((f) => f.pattern)));

  const wit = await t2("What if I told you the gate was the feature?");
  check("tier2: what-if-told fires", has(wit, "what-if-told"), JSON.stringify(wit.findings.map((f) => f.pattern)));

  const ek = await t2("As we all know, reviews catch what linters miss.");
  check("tier2: everyone-knows fires", has(ek, "everyone-knows"), JSON.stringify(ek.findings.map((f) => f.pattern)));

  const gws = await t2("It goes without saying that deadlines shape prose.");
  check("tier2: goes-without-saying fires", has(gws, "goes-without-saying"), JSON.stringify(gws.findings.map((f) => f.pattern)));

  const mh = await t2("The real magic happens when the validator runs before the PR opens.");
  check("tier2: magic-happens fires", has(mh, "magic-happens"), JSON.stringify(mh.findings.map((f) => f.pattern)));

  const oc = await t2("Our commitment to quality means every draft gets a second pass.");
  check("tier2: our-commitment fires", has(oc, "our-commitment"), JSON.stringify(oc.findings.map((f) => f.pattern)));

  const emo = await t2("## \u{1F680} Launch checklist\n\n## \u{1F4CB} Review steps\n\nBody copy here.");
  check("tier2: emoji-headings fires on emoji-led headings", has(emo, "emoji-headings"), JSON.stringify(emo.findings.map((f) => f.pattern)));
}

// 18. Copywriting pack Tier 3 (domain-filtered long tail) + Tier 4 suppression.
{
  const t3 = (t, projectProfile) => scan(t, { mode: "scan", projectProfile });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern === p));

  const pack = await t3("Our industry-leading results speak through the renewal rate alone.");
  check("tier3: uncovered phrase fires copywriting-pack low", pack.findings.some((f) => f.pattern === "copywriting-pack:industry-leading results" && f.severity === "low" && f.confidence < 0.6), JSON.stringify(pack.findings.map((f) => f.pattern)));

  const dedup = await t3("We leverage the cache to keep p99 latency flat.");
  check("tier3: engine-covered terms do not double-fire pack", !dedup.findings.some((f) => f.pattern.startsWith("copywriting-pack:") || f.pattern.startsWith("copywriting-marker:")), JSON.stringify(dedup.findings.filter((f) => f.pattern.startsWith("copywriting")).map((f) => f.pattern)));
  const single = await t3("The proposed solution handles retries with backoff. " + Array(60).fill("Supporting detail fills out the migration notes for review.").join(" "));
  check("tier3: single ordinary word stays silent (needs repetition)", !single.findings.some((f) => f.pattern.startsWith("copywriting-pack:")), JSON.stringify(single.findings.filter((f) => f.pattern.startsWith("copywriting")).map((f) => f.pattern)));

  const fin = await t3("The plan focuses on wealth creation over ten years.");
  check("tier3: finance domain filtered out by default", !fin.findings.some((f) => f.pattern.startsWith("copywriting-pack:")), JSON.stringify(fin.findings.map((f) => f.pattern)));
  const finOn = await t3("The plan focuses on wealth creation over ten years.", { copywritingCategories: ["Finance and investing"] });
  check("tier3: finance domain enabled via copywritingCategories", has(finOn, "copywriting-pack:wealth creation"), JSON.stringify(finOn.findings.map((f) => f.pattern)));

  const guard = await t3("The agent caches prompts to reduce latency. User flow stays on one screen.");
  check("tier4: literal domain terms stay silent", !guard.findings.some((f) => f.pattern.startsWith("copywriting-")), JSON.stringify(guard.findings.map((f) => f.pattern)));
}

// 15. Precision expansion (10 rules) — all soft, schema-conformant.
{
  const sscan = (t, ct = "prose") => scan(t, { mode: "scan", contentType: ct });
  const has = (r, ...pats) => pats.every((p) => r.findings.some((f) => f.pattern === p));

  const concl = await sscan("## Results\n\nThroughput held at peak load.\n\n## Outlook\n\nIn conclusion, the system works well under load.", "markdown");
  check("precision: conclusion-cliche fires in final section", has(concl, "conclusion-cliche"), JSON.stringify(concl.findings.map((f) => f.pattern)));

  const grav = await sscan("It is important to note that the cache expires after one hour of inactivity in production.");
  check("precision: manufactured-gravity fires", has(grav, "manufactured-gravity"), JSON.stringify(grav.findings.map((f) => f.pattern)));
  const grav2 = await sscan("It is key to keep in mind that retries are bounded by policy.");
  check("precision: manufactured-gravity keep-in-mind variant fires (regex typo fixed)", has(grav2, "manufactured-gravity"), JSON.stringify(grav2.findings.map((f) => f.pattern)));

  const w220 = Array(220).fill("north").join(" ");
  const pacing = await sscan(`## Alpha\n\n${w220}\n\n## Beta\n\n${w220}\n\n## Gamma\n\n${w220}`, "markdown");
  check("precision: symmetrical-section-pacing fires on uniform sections", has(pacing, "symmetrical-section-pacing"), JSON.stringify(pacing.findings.map((f) => f.pattern)));

  const passive = await sscan("The proposal was approved after review. Two drafts were rejected for scope creep. A rollback was completed before noon. A fresh backup was created on schedule. The alerts were verified by the on-call lead. A postmortem was published the next day. Crews monitor dashboards around the clock. Leads triage tickets before lunch. Owners sign off each Friday. Deploys pause during holidays. Notes stay short and plain. The garden grows slowly through spring rain and sun. Neighbors trade seeds over the fence each weekend. Fresh bread cools on the wooden counter by noon.");
  check("precision: passive-voice-density fires", has(passive, "passive-voice-density"), JSON.stringify(passive.findings.map((f) => f.pattern)));

  const demo = await sscan("## Architecture\n\nThis allows developers to scale horizontally across regions without downtime.", "markdown");
  check("precision: unanchored-demonstrative-opening fires", has(demo, "unanchored-demonstrative-opening"), JSON.stringify(demo.findings.map((f) => f.pattern)));

  const fluffPara = Array(16).fill("Keeping a tidy desk each morning brings a calm and steady light to the whole room and makes every small daily chore feel easy and pleasant.").join(" ");
  const fluff = await sscan(fluffPara);
  check("precision: fluff-to-substance-ratio fires on low-density block", has(fluff, "fluff-to-substance-ratio"), JSON.stringify(fluff.findings.map((f) => f.pattern)));

  const anchor = await sscan("See [click here](https://example.com/docs) for details.");
  check("precision: generic-anchor-text fires", has(anchor, "generic-anchor-text"), JSON.stringify(anchor.findings.map((f) => f.pattern)));

  const codeph = await sscan('```js\n// TODO: add retries\nconst key = "<YOUR_API_KEY>";\n```', "markdown");
  check("precision: code-placeholder fires high", codeph.findings.some((f) => f.pattern === "code-placeholder" && f.severity === "high" && f.confidence >= 0.9 && f.category === "code"), JSON.stringify(codeph.findings.map((f) => f.pattern)));
  check("precision: code-placeholder stays soft (gate passes)", codeph.qualityGate.passed, JSON.stringify(codeph.qualityGate.hardFailures.map((f) => f.pattern)));

  const drift = await sscan("We use Next.js for rendering. NextJS handles routing.");
  check("precision: tech-entity-capitalization-drift fires", has(drift, "tech-entity-capitalization-drift"), JSON.stringify(drift.findings.map((f) => f.pattern)));

  const alt = await sscan("![screenshot](https://img.example.com/a.png)\n\n![](https://img.example.com/b.png)", "markdown");
  check("precision: missing-or-generic-alt-text fires", alt.findings.filter((f) => f.pattern === "missing-or-generic-alt-text").length >= 2, JSON.stringify(alt.findings.map((f) => f.pattern)));

  const clean = await sscan(corpus("good-matt-voice.txt"));
  check("precision: clean prose has no code-placeholder/conclusion findings", !clean.findings.some((f) => ["code-placeholder", "conclusion-cliche"].includes(f.pattern)), JSON.stringify(clean.findings.map((f) => f.pattern)));

  const rw = await audit("It is important to note that the cache expires after one hour.", { mode: "rewrite" });
  check("precision: gravity is suggestion-only (no auto-fix)", rw.rewritten === undefined, JSON.stringify(rw.changesMade));
}

console.log(`\n${pass} passed, ${fail} failed (all checks)`);
