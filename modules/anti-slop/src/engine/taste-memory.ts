/**
 * Project taste memory — local feedback store.
 * APPROVE / REJECT / EDIT / MARK-GOOD / MARK-SLOP per pattern.
 * Scoped per project file; never shared across sites.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Finding, TasteFeedback } from "../types.js";

const DEFAULT_PATH = ".anti-slop-memory.json";

export function memoryPath(custom?: string): string {
  return resolve(custom ?? DEFAULT_PATH);
}

export function loadTasteMemory(customPath?: string): TasteFeedback[] {
  const p = memoryPath(customPath);
  try {
    if (!existsSync(p)) return [];
    const raw = JSON.parse(readFileSync(p, "utf-8")) as unknown;
    return Array.isArray(raw) ? (raw as TasteFeedback[]) : [];
  } catch {
    return [];
  }
}

export function recordFeedback(entry: Omit<TasteFeedback, "at">, customPath?: string): void {
  const p = memoryPath(customPath);
  const all = loadTasteMemory(p);
  all.push({ ...entry, at: new Date().toISOString() });
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(all.slice(-500), null, 2));
}

/**
 * Apply memory: each REJECT/mark-slop for a pattern boosts its confidence
 * slightly; each APPROVE/mark-good attenuates. Capped to avoid runaway.
 */
export function applyTasteMemory(findings: Finding[], memory: TasteFeedback[]): Finding[] {
  if (memory.length === 0) return findings;
  const delta = new Map<string, number>();
  for (const m of memory) {
    const d = m.kind === "reject" || m.kind === "mark-slop" ? 0.05 : m.kind === "approve" || m.kind === "mark-good" ? -0.05 : 0;
    if (d !== 0) delta.set(m.pattern, Math.max(-0.15, Math.min(0.15, (delta.get(m.pattern) ?? 0) + d)));
  }
  if (delta.size === 0) return findings;
  return findings.map((f) => {
    const key = [...delta.keys()].find((k) => f.pattern === k || f.pattern.endsWith(k));
    if (!key) return f;
    const conf = Math.max(0.1, Math.min(0.95, f.confidence + (delta.get(key) ?? 0)));
    return { ...f, confidence: Math.round(conf * 100) / 100 };
  });
}
