/**
 * Profile + config loader. Resolution order:
 *  1. explicit options passed programmatically
 *  2. ./config/anti-slop/*.json (project overrides)
 *  3. bundled defaults in this package's config/anti-slop/
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignProfile, ProjectProfile, VoiceProfile } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundledDir = resolve(here, "../config/anti-slop");

function readJson<T>(path: string): T | undefined {
  try {
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

export function loadVoiceProfile(projectRoot = process.cwd()): VoiceProfile {
  return (
    readJson<VoiceProfile>(join(resolve(projectRoot), "config/anti-slop/voice.json")) ??
    readJson<VoiceProfile>(join(bundledDir, "voice.json")) ?? { name: "default" }
  );
}

export function loadDesignProfile(projectRoot = process.cwd()): DesignProfile {
  return (
    readJson<DesignProfile>(join(resolve(projectRoot), "config/anti-slop/design.json")) ??
    readJson<DesignProfile>(join(bundledDir, "design.json")) ?? { name: "default" }
  );
}

export function loadProjectProfile(projectRoot = process.cwd()): ProjectProfile {
  return (
    readJson<ProjectProfile>(join(resolve(projectRoot), "config/anti-slop/rules.json")) ??
    readJson<ProjectProfile>(join(bundledDir, "rules.json")) ?? { name: "default" }
  );
}

export function loadProtectedTerms(projectRoot = process.cwd()): string[] {
  const local = readJson<{ terms?: string[] } | string[]>(join(resolve(projectRoot), "config/anti-slop/protected-terms.json"));
  const bundled = readJson<{ terms?: string[] } | string[]>(join(bundledDir, "protected-terms.json"));
  const norm = (v: { terms?: string[] } | string[] | undefined): string[] =>
    Array.isArray(v) ? v : (v?.terms ?? []);
  return [...norm(bundled), ...norm(local)];
}
