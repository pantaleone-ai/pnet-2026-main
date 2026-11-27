import type { D1Database } from "@cloudflare/workers-types";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "@/drizzle/schema";

/**
 * D1 connection for the Pantaleone Chat SaaS database.
 *
 * The binding comes from the request context (getCloudflareContext) — never
 * from a module-level global, so local dev, preview, and production each
 * get the right database.
 */
export type ChatDatabase = DrizzleD1Database<typeof schema>;

export function getDb(d1: D1Database | unknown): ChatDatabase {
  if (!d1 || typeof d1 !== "object") {
    throw new Error(
      "CHAT_DB binding is missing. Configure the D1 database in wrangler.jsonc.",
    );
  }
  return drizzle(d1 as D1Database, { schema });
}

/**
 * Drizzle wraps D1 failures ("Failed query: ...", cause holds the SQLite
 * detail), so walk the chain looking for a uniqueness violation. Only
 * those mean "already seen" — everything else must stay a real error.
 */
export function isUniqueViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const message =
      current instanceof Error ? current.message : String(current);
    if (/UNIQUE constraint failed|already exists/i.test(message)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return typeof err === "string" && /UNIQUE constraint failed|already exists/i.test(err);
}
