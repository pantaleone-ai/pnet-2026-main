#!/usr/bin/env node
/**
 * Minimal MCP (Model Context Protocol) stdio server — zero dependencies.
 * Exposes the anti-slop engine to Claude, Cursor, Codex, Gemini, Copilot, etc.
 *
 * Tools: anti_slop_scan, anti_slop_rewrite, anti_slop_audit,
 *        anti_slop_design_audit, anti_slop_image_prompt,
 *        anti_slop_seo_audit, anti_slop_code_audit,
 *        anti_slop_compare, anti_slop_quality_gate
 *
 * Configure in your MCP client:
 *   { "mcpServers": { "anti-slop": { "command": "node",
 *     "args": ["<repo>/modules/anti-slop/dist/mcp/server.js"] } } }
 */

import { stdin, stdout } from "node:process";
import { audit, scan } from "../engine/orchestrator.js";
import { analyzeDesign } from "../rules/design.js";
import { analyzeImagePrompt } from "../rules/image-prompt.js";
import { analyzeSeo } from "../rules/seo.js";
import { analyzeCode } from "../rules/code.js";
import { runQualityGate } from "../engine/quality-gate.js";
import type { AuditReport, ContentType } from "../types.js";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: { type: string; properties: Record<string, unknown>; required: string[] };
}

const TOOLS: ToolDef[] = [
  {
    name: "anti_slop_scan",
    description: "Detect AI-generation patterns in text. Returns findings with explanations; never rewrites.",
    inputSchema: { type: "object", properties: { content: { type: "string" }, contentType: { type: "string", enum: ["prose", "markdown", "seo"] } }, required: ["content"] },
  },
  {
    name: "anti_slop_audit",
    description: "Full audit: scan + minimum-effective-edit pass + rescan + quality gate.",
    inputSchema: { type: "object", properties: { content: { type: "string" }, contentType: { type: "string" }, strictness: { type: "string", enum: ["lenient", "standard", "strict"] } }, required: ["content"] },
  },
  {
    name: "anti_slop_rewrite",
    description: "Apply only safe minimum-effective edits; returns rewritten text plus suggestions for the rest.",
    inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] },
  },
  {
    name: "anti_slop_design_audit",
    description: "Audit UI source or section lists for template convergence and decorative excess.",
    inputSchema: { type: "object", properties: { source: { type: "string" }, sections: { type: "array", items: { type: "string" } } }, required: ["source"] },
  },
  {
    name: "anti_slop_image_prompt",
    description: "Lint an image-generation prompt for generic render-farming tokens vs real art direction.",
    inputSchema: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] },
  },
  {
    name: "anti_slop_seo_audit",
    description: "Detect keyword stuffing, empty definition sections, templated FAQs, heading repetition.",
    inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] },
  },
  {
    name: "anti_slop_code_audit",
    description: "Detect UI slop directly in React/Next.js/Tailwind/Markdown source (density-based).",
    inputSchema: { type: "object", properties: { source: { type: "string" }, fileLabel: { type: "string" } }, required: ["source"] },
  },
  {
    name: "anti_slop_compare",
    description: "Compare before/after texts; reports finding-count delta.",
    inputSchema: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } }, required: ["before", "after"] },
  },
  {
    name: "anti_slop_quality_gate",
    description: "Run the ship-gate checklist against already-gathered findings text.",
    inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] },
  },
];

function slim(r: AuditReport) {
  return {
    summary: r.summary,
    findings: r.findings.map((f) => ({
      category: f.category, severity: f.severity, pattern: f.pattern,
      location: f.location.slice(0, 200), explanation: f.explanation,
      suggested_action: f.suggested_action, confidence: f.confidence,
    })),
    changesMade: r.changesMade,
    recommendedChanges: r.recommendedChanges,
    remainingRisks: r.remainingRisks,
    qualityGate: r.qualityGate,
    rewritten: r.rewritten,
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const str = (k: string) => String(args[k] ?? "");
  switch (name) {
    case "anti_slop_scan":
      return slim(await scan(str("content"), { contentType: (args["contentType"] as ContentType) ?? "prose", mode: "scan" }));
    case "anti_slop_audit":
      return slim(await audit(str("content"), {
        contentType: (args["contentType"] as ContentType) ?? "prose",
        mode: "audit",
        strictness: (args["strictness"] as "lenient" | "standard" | "strict") ?? "standard",
      }));
    case "anti_slop_rewrite": {
      const r = await audit(str("content"), { mode: "rewrite" });
      return { rewritten: r.rewritten ?? str("content"), changesMade: r.changesMade, suggestions: r.recommendedChanges, gate: r.qualityGate.passed };
    }
    case "anti_slop_design_audit": {
      const sections = Array.isArray(args["sections"]) ? (args["sections"] as string[]) : undefined;
      const findings = analyzeDesign({ source: str("source"), sections });
      return { findings, gate: runQualityGate(findings, undefined, false) };
    }
    case "anti_slop_image_prompt":
      return { findings: analyzeImagePrompt(str("prompt")) };
    case "anti_slop_seo_audit":
      return { findings: analyzeSeo(str("content")) };
    case "anti_slop_code_audit":
      return { findings: analyzeCode(str("source"), str("fileLabel") || "source") };
    case "anti_slop_compare": {
      const [a, b] = await Promise.all([
        scan(str("before"), { mode: "scan" }),
        scan(str("after"), { mode: "scan" }),
      ]);
      return { before: a.summary, after: b.summary, delta: a.findings.length - b.findings.length };
    }
    case "anti_slop_quality_gate": {
      const r = await audit(str("content"), { mode: "scan" });
      return { passed: r.qualityGate.passed, checklist: r.qualityGate.checklist, hardFailures: r.qualityGate.hardFailures };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function respond(id: unknown, result: unknown) {
  stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function respondError(id: unknown, message: string) {
  stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message } }) + "\n");
}

let buffer = "";
stdin.setEncoding("utf-8");
stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg: { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
    try {
      msg = JSON.parse(line) as typeof msg;
    } catch {
      continue;
    }
    void (async () => {
      try {
        if (msg.method === "initialize") {
          respond(msg.id, {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "anti-slop", version: "1.0.0" },
          });
        } else if (msg.method === "notifications/initialized" || msg.method?.startsWith("notifications/")) {
          // no-op
        } else if (msg.method === "tools/list") {
          respond(msg.id, { tools: TOOLS });
        } else if (msg.method === "tools/call") {
          const result = await callTool(msg.params?.name ?? "", msg.params?.arguments ?? {});
          respond(msg.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
        } else if (msg.method === "ping") {
          respond(msg.id, {});
        } else {
          respondError(msg.id, `unsupported method: ${msg.method}`);
        }
      } catch (err) {
        respondError(msg.id, (err as Error).message);
      }
    })();
  }
});
