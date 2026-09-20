#!/usr/bin/env node
/**
 * anti-slop CLI — no dependencies, stdin/file/args input.
 *
 *   anti-slop scan   [--type prose|code|design|seo|image-prompt] [--strict] [file…]
 *   anti-slop audit  [same]            # scan + one minimum-edit pass + rescan
 *   anti-slop rewrite --out FILE       # write rewritten text
 *   anti-slop design FILE…             # UI structure audit from source
 *   anti-slop compare FILE_A FILE_B    # before/after finding counts
 *   anti-slop feedback --pattern P --kind approve|reject|edit|mark-good|mark-slop
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { audit, scan } from "./engine/orchestrator.js";
import { analyzeDesign } from "./rules/design.js";
import { analyzeCode } from "./rules/code.js";
import { runQualityGate } from "./engine/quality-gate.js";
import { loadProjectProfile, loadProtectedTerms, loadVoiceProfile } from "./profiles.js";
import { recordFeedback } from "./engine/taste-memory.js";
import type { ContentType } from "./types.js";

function usage(): never {
  stdout.write(`anti-slop — detect AI-generation patterns, apply minimum effective edits.

Usage:
  anti-slop scan [--type T] [--strict] [file…]        detect + explain (never rewrites)
  anti-slop audit [--type T] [--strict] [file…]       scan + safe edits + rescan + gate
  anti-slop rewrite [--type T] --out FILE [file]      write minimum-edit rewrite
  anti-slop design FILE…                              UI structure audit from source
  anti-slop compare FILE_A FILE_B                     before/after finding counts
  anti-slop feedback --pattern P --kind K             record taste feedback

Types: prose (default), markdown, seo, code, design, image-prompt
Reads stdin when no file is given. Exits 1 on gate failure (--strict or hard gates).
`);
  process.exit(2);
}

interface Args {
  cmd: string;
  files: string[];
  type: ContentType;
  strict: boolean;
  out?: string;
  pattern?: string;
  kind?: "approve" | "reject" | "edit" | "mark-good" | "mark-slop";
}

function parse(argv: string[]): Args {
  const cmd = argv[0] ?? "";
  const a: Args = { cmd, files: [], type: "prose", strict: false };
  for (let i = 1; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--type" && argv[i + 1]) {
      const v = argv[++i] as ContentType;
      if (!["prose", "markdown", "seo", "code", "design", "image-prompt"].includes(v)) usage();
      a.type = v;
    } else if (t === "--strict") a.strict = true;
    else if (t === "--out" && argv[i + 1]) a.out = argv[++i];
    else if (t === "--pattern" && argv[i + 1]) a.pattern = argv[++i];
    else if (t === "--kind" && argv[i + 1]) a.kind = argv[++i] as Args["kind"];
    else if (!t.startsWith("--")) a.files.push(t);
    else usage();
  }
  return a;
}

async function readInput(files: string[]): Promise<string> {
  if (files.length > 0) {
    return files
      .map((f) => {
        if (!existsSync(f)) {
          process.stderr.write(`anti-slop: file not found: ${f}\n`);
          process.exit(2);
        }
        return readFileSync(f, "utf-8");
      })
      .join("\n\n");
  }
  if (stdin.isTTY) usage();
  return new Promise((resolve) => {
    let data = "";
    stdin.setEncoding("utf-8");
    stdin.on("data", (c) => (data += c));
    stdin.on("end", () => resolve(data));
  });
}

function printReport(report: Awaited<ReturnType<typeof audit>>, opts: { showRewritten: boolean }) {
  stdout.write(`\n== ${report.summary}\n`);
  if (report.changesMade.length > 0) {
    stdout.write(`\nChanges made (minimum effective edits):\n`);
    for (const c of report.changesMade) stdout.write(`  + ${c}\n`);
  }
  if (report.findings.length > 0) {
    stdout.write(`\nFindings:\n`);
    for (const f of report.findings.slice(0, 30)) {
      stdout.write(`  [${f.severity}] ${f.category}:${f.pattern} (conf ${f.confidence})\n    → ${f.location.slice(0, 120)}\n    ↳ ${f.suggested_action.slice(0, 140)}\n`);
    }
    if (report.findings.length > 30) stdout.write(`  …and ${report.findings.length - 30} more\n`);
  }
  stdout.write(`\nQuality gate: ${report.qualityGate.passed ? "PASSED" : "FAILED"}\n`);
  for (const c of report.qualityGate.checklist) stdout.write(`  [${c.ok ? "x" : " "}] ${c.item}\n`);
  if (report.remainingRisks.length > 0) {
    stdout.write(`\nRemaining risks:\n`);
    for (const r of report.remainingRisks) stdout.write(`  ! ${r.slice(0, 160)}\n`);
  }
  if (opts.showRewritten && report.rewritten) {
    stdout.write(`\n--- rewritten ---\n${report.rewritten}\n`);
  }
}

async function main() {
  const a = parse(process.argv.slice(2));
  const projectProfile = loadProjectProfile();
  const voiceProfile = loadVoiceProfile();
  const protectedTerms = loadProtectedTerms();
  const strictness = a.strict ? "strict" : (projectProfile.strictness ?? "standard");
  const baseOpts = { contentType: a.type, projectProfile, voiceProfile, protectedTerms, strictness } as const;

  if (a.cmd === "feedback") {
    if (!a.pattern || !a.kind) usage();
    recordFeedback({ pattern: a.pattern, kind: a.kind });
    stdout.write(`Recorded ${a.kind} for pattern "${a.pattern}".\n`);
    return;
  }

  if (a.cmd === "design") {
    if (a.files.length === 0) usage();
    const src = a.files.map((f) => readFileSync(f, "utf-8")).join("\n");
    const findings = [...analyzeDesign({ source: src }), ...analyzeCode(src, a.files.join(","))];
    const gate = runQualityGate(findings, projectProfile, a.strict);
    stdout.write(`\n== ${findings.length} design/code findings. Gate ${gate.passed ? "PASSED" : "FAILED"}.\n`);
    for (const f of findings) {
      stdout.write(`  [${f.severity}] ${f.pattern} (conf ${f.confidence})\n    → ${f.location.slice(0, 120)}\n    ↳ ${f.suggested_action.slice(0, 140)}\n`);
    }
    if (!gate.passed) process.exit(1);
    return;
  }

  if (a.cmd === "compare") {
    if (a.files.length !== 2) usage();
    const [ra, rb] = await Promise.all([
      scan(readFileSync(a.files[0], "utf-8"), { ...baseOpts, mode: "scan" }),
      scan(readFileSync(a.files[1], "utf-8"), { ...baseOpts, mode: "scan" }),
    ]);
    stdout.write(`before: ${ra.summary}\nafter:  ${rb.summary}\n`);
    stdout.write(`delta: ${ra.findings.length - rb.findings.length} fewer findings\n`);
    return;
  }

  if (!["scan", "audit", "rewrite"].includes(a.cmd)) usage();
  const input = await readInput(a.files);
  if (!input.trim()) {
    process.stderr.write("anti-slop: empty input\n");
    process.exit(2);
  }
  const report = await (a.cmd === "scan"
    ? scan(input, { ...baseOpts, mode: "scan" })
    : audit(input, { ...baseOpts, mode: a.cmd === "rewrite" ? "rewrite" : "audit" }));

  if (a.cmd === "rewrite" && a.out && report.rewritten) {
    writeFileSync(a.out, report.rewritten);
    stdout.write(`Wrote rewrite to ${a.out} (${report.changesMade.length} edits).\n`);
  }
  printReport(report, { showRewritten: a.cmd !== "scan" && !a.out });

  if (!report.qualityGate.passed) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`anti-slop error: ${(err as Error).message}\n`);
  process.exit(2);
});
