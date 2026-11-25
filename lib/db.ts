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
