/**
 * Published-image registry: one image URL belongs to exactly one contentId.
 *
 * Rule: never publish two different messages with the same image. The same
 * contentId may reuse its own images (retries, screenshot re-runs).
 * Ledger: config/social-growth/syn-media.json (url -> use records).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LEDGER_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "config",
  "social-growth",
  "syn-media.json",
);

export interface MediaUse {
  issue: number;
  contentId: string;
  channel: string;
  date: string;
  /** Historical violations kept for audit (pre-registry posts). */
  duplicate?: boolean;
}

export type MediaLedger = Record<string, MediaUse[]>;

export function readMediaLedger(path: string = LEDGER_PATH): MediaLedger {
  try {
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, "utf8")) as MediaLedger;
  } catch {
    return {};
  }
}

/** Other-contentId uses of a URL (the violation set). Empty = clear to claim. */
export function conflictingUses(
  ledger: MediaLedger,
  url: string,
  contentId: string,
): MediaUse[] {
  return (ledger[url] ?? []).filter((u) => u.contentId !== contentId);
}

/** True when no other contentId has claimed the URL. */
export function imageIsFresh(
  ledger: MediaLedger,
  url: string,
  contentId: string,
): boolean {
  return conflictingUses(ledger, url, contentId).length === 0;
}

/** Claim a URL for a contentId. Throws when another contentId owns it. */
export function claimImage(
  url: string,
  use: MediaUse,
  path: string = LEDGER_PATH,
): MediaLedger {
  const ledger = readMediaLedger(path);
  const conflicts = conflictingUses(ledger, url, use.contentId);
  if (conflicts.length > 0) {
    const owners = conflicts
      .map((c) => `#${c.issue}/${c.contentId}`)
      .join(", ");
    throw new Error(`image already used by ${owners}: ${url}`);
  }
  const mine = (ledger[url] ?? []).filter((u) => u.contentId === use.contentId);
  ledger[url] = [...mine, use];
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

/** Normalized word overlap between a hook and artwork descriptors. */
export function titleMatchesArtwork(
  hook: string,
  descriptors: string[],
): boolean {
  const words = (s: string): string[] =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4);
  const hookWords = words(hook);
  const artWords = descriptors.flatMap(words);
  return hookWords.some((h) =>
    artWords.some((a) => a.includes(h) || h.includes(a)),
  );
}
