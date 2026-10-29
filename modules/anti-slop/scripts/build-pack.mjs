#!/usr/bin/env node
/**
 * build-pack.mjs — reproducible ingest of the external copywriting CSVs into
 * the engine's tier-tagged pack JSON. Zero dependencies.
 *
 * Usage:
 *   node scripts/build-pack.mjs <csv-path> [--out config/copywriting/pack.json] [--report-only]
 *
 * The CSVs live OUTSIDE the repo (~/Downloads). This script is the documented
 * bridge: mapping rules + severity downgrades live here, not in prose.
 *
 * Mapping (deliberate deviations from CSV severities, see COPYWRITING.md):
 *   Tier 1 markers  -> always-on lexical signals (medium 0.7 / phrase 0.8 / formal-register low 0.5)
 *   Tier 1 CRITICAL -> deception.ts surface forms (high, soft — hard-gate promotion needs approval)
 *   Tier 2 patterns -> new RHETORICAL_PATTERNS entries (case-by-case, see overlap report)
 *   Tier 3 long-tail-> pack entries, low severity frequency-scaled, domain-filtered at load
 *   Tier 4 terms    -> suppression/verification set (never findings) + legitimate-use doc table
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MODROOT = resolve(here, "..");

function usage() {
  process.stderr.write("Usage: node build-pack.mjs <csv-path> [--out <pack.json>] [--report-only]\n");
  process.exit(2);
}

// Minimal RFC-4180 reader (handles quoted commas, "" escapes, embedded newlines).
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  // Strip BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  const head = rows.shift().map((h) => h.replace(/^\uFEFF/, ""));
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const FORMAL_REGISTER = new Set(
  ["moreover", "furthermore", "additionally", "consequently", "hence", "thus", "thereby", "notably", "interestingly"]
    .map((s) => s.toLowerCase()),
);

function normTerm(t) {
  return t.toLowerCase().replace(/[""]/g, '"').trim();
}

function main() {
  const argv = process.argv.slice(2);
  const csvPath = argv.find((a) => !a.startsWith("--"));
  if (!csvPath) usage();
  const outIdx = argv.indexOf("--out");
  const outPath = resolve(outIdx !== -1 && argv[outIdx + 1] ? argv[outIdx + 1] : join(MODROOT, "config/copywriting/pack.json"));
  const reportOnly = argv.includes("--report-only");

  const rows = parseCsv(readFileSync(resolve(csvPath), "utf-8"));
  const tierOf = (r) => {
    const t = r.aiceo_Implementation_Tier || "";
    if (t.startsWith("Tier 1")) return "tier1";
    if (t.startsWith("Tier 2")) return "tier2";
    if (t.startsWith("Tier 3")) return "tier3";
    if (t.startsWith("Tier 4")) return "tier4";
    return "unknown";
  };

  // ---- engine overlap baseline (for the audit report) ----
  const textSrc = readFileSync(join(MODROOT, "src/rules/text.ts"), "utf-8");
  const lexTerms = new Set([...textSrc.matchAll(/\{ term: "([^"]+)"/g)].map((m) => m[1].toLowerCase()));
  const rhetNames = new Set([...textSrc.matchAll(/name: "([^"]+)"/g)].map((m) => m[1].toLowerCase()));
  let voiceBanned = new Set();
  try {
    const v = JSON.parse(readFileSync(join(MODROOT, "config/anti-slop/voice.json"), "utf-8"));
    voiceBanned = new Set((v.bannedStylisticHabits ?? []).map((s) => String(s).toLowerCase()));
  } catch { /* bundled fallback */ }
  const engineWords = new Set([...lexTerms, ...voiceBanned]);

  const pack = { meta: {}, tier1Markers: [], tier1Critical: [], tier2: [], tier3: [], tier4guard: { terms: [], legitimateUse: [] } };
  const seenTier1 = new Set(), seenTier3 = new Set();
  const overlap = { tier1Covered: [], tier1New: [], tier2: [], tier3Dupes: 0 };

  for (const r of rows) {
    const tier = tierOf(r);
    const term = (r.Flagged_Word_or_Pattern || "").trim();
    const why = (r.Why_It_Creates_Slop || "").trim();
    const repair = (r.Preferred_Repair || "").trim();
    const n = normTerm(term);
    if (!term) continue;
    if (tier === "tier1") {
      if (r.Rule_Type !== "Word/Phrase") {
        pack.tier1Critical.push({ id: r.Rule_ID, pattern: term, why, repair, category: r.Category });
        continue;
      }
      if (seenTier1.has(n)) continue;
      seenTier1.add(n);
      const covered = engineWords.has(n);
      const entry = { term, why, repair, register: FORMAL_REGISTER.has(n) ? "formal" : "default" };
      if (covered) { overlap.tier1Covered.push(term); entry.status = "covered-by-engine"; }
      else { overlap.tier1New.push(term); entry.status = "new"; }
      pack.tier1Markers.push(entry);
    } else if (tier === "tier2") {
      pack.tier2.push({ id: r.Rule_ID, pattern: term, why, repair, category: r.Category, severitySrc: r.Severity });
    } else if (tier === "tier3") {
      if (seenTier3.has(n)) { overlap.tier3Dupes++; continue; }
      seenTier3.add(n);
      pack.tier3.push({ term, why, repair, category: r.Category, businessFunction: r.Business_Function, severitySrc: r.Severity });
    } else if (tier === "tier4") {
      if (r.Rule_Type === "Legitimate-use rule") {
        pack.tier4guard.legitimateUse.push({ term, condition: repair || why, category: r.Category });
      } else {
        pack.tier4guard.terms.push(term);
      }
    }
  }

  pack.meta = {
    sources: ["anti_slop_copywriting_rules.csv", "aiceo_prioritized_anti_slop_rules.csv (adds aiceo_Implementation_Tier/aiceo_Deployment_Target)"],
    generated: new Date().toISOString().slice(0, 10),
    counts: {
      tier1Markers: pack.tier1Markers.length,
      tier1Critical: pack.tier1Critical.length,
      tier2: pack.tier2.length,
      tier3: pack.tier3.length,
      tier4guardTerms: pack.tier4guard.terms.length,
      tier4legitimateUse: pack.tier4guard.legitimateUse.length,
    },
    engineOverlap: {
      tier1AlreadyCovered: overlap.tier1Covered.length,
      tier1New: overlap.tier1New.length,
      tier3DuplicatesDropped: overlap.tier3Dupes,
    },
    severityMapping: "Tier1 markers -> engine medium (formal register -> low); Tier1 CRITICAL -> deception high-soft (NOT hard gates); Tier2 -> per-pattern medium/low; Tier3 -> engine low frequency-scaled; Tier4 -> never findings (suppression set).",
  };

  // ---- overlap report (Phase 3+ input) ----
  console.log(`rows: ${rows.length} | tier1 markers: ${pack.meta.counts.tier1Markers} (${overlap.tier1New.length} new, ${overlap.tier1Covered.length} engine-covered) | tier1 critical: ${pack.meta.counts.tier1Critical} | tier2: ${pack.meta.counts.tier2} | tier3: ${pack.meta.counts.tier3} (dupes dropped: ${overlap.tier3Dupes}) | tier4 terms: ${pack.meta.counts.tier4guardTerms} + ${pack.meta.counts.tier4legitimateUse} legit-use`);
  console.log(`\nTier 2 pattern families present (check against text.ts RHETORICAL_PATTERNS before implementing):`);
  const fams = {};
  for (const p of pack.tier2) {
    const k = p.category;
    fams[k] = (fams[k] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(fams)) console.log(`  ${v}x ${k}`);

  if (reportOnly) return;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(pack, null, 1) + "\n");
  console.log(`\nwrote ${outPath}`);
}

main();
