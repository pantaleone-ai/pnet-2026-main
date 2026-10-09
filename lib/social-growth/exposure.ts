/**
 * Artwork exposure ledger (provenance + frequency caps).
 *
 * Rule: the same artwork may re-enter only with a new angle + new crop,
 * max 3 uses per quarter. The ledger is a JSON map artworkId -> use records.
 * Reads/writes config/social-growth/syn-exposure.json (created on first use).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LEDGER_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "syn-exposure.json",
);
export const MAX_USES_PER_QUARTER = 3;

export interface ExposureRecord {
  issue: number;
  creativeId: string;
  date: string;
}

export type ExposureLedger = Record<string, ExposureRecord[]>;

export function readLedger(path: string = LEDGER_PATH): ExposureLedger {
  try {
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, "utf8")) as ExposureLedger;
  } catch {
    return {};
  }
}

function quarterOf(date: string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/** Uses of an artwork in the quarter containing `date` (default: now). */
export function usesInQuarter(
  ledger: ExposureLedger,
  artworkId: string,
  date: string = new Date().toISOString(),
): number {
  const q = quarterOf(date);
  return (ledger[artworkId] ?? []).filter((r) => quarterOf(r.date) === q)
    .length;
}

/** True when the artwork may be used again under the cap. */
export function eligible(
  ledger: ExposureLedger,
  artworkId: string,
  date?: string,
): boolean {
  return usesInQuarter(ledger, artworkId, date) < MAX_USES_PER_QUARTER;
}

/** Record a use. Returns the updated ledger (also persisted). */
export function recordUse(
  artworkId: string,
  record: ExposureRecord,
  path: string = LEDGER_PATH,
): ExposureLedger {
  const ledger = readLedger(path);
  ledger[artworkId] = [...(ledger[artworkId] ?? []), record];
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}
