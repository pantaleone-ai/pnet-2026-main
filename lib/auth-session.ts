import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";

import { organizationMembers } from "@/drizzle/schema";
import { getAuth, type AuthEnv } from "./auth";
import { getDb, type ChatDatabase } from "./db";

async function getEnv(): Promise<AuthEnv> {
  const { env } = (await getCloudflareContext({
    async: true,
  })) as unknown as { env: AuthEnv };
  return env;
}

async function getDbFromContext(): Promise<ChatDatabase> {
  const env = await getEnv();
  if (!env.CHAT_DB) {
    throw new Error(
      "CHAT_DB binding is missing. Configure the D1 database in wrangler.jsonc.",
    );
  }
  return getDb(env.CHAT_DB);
}

/**
 * Current session (or null) for server components and route handlers.
 * Reads the request headers — never trust client-supplied identity.
 */
export async function getSession() {
  const env = await getEnv();
  const auth = getAuth(env);
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Organization membership check. Every protected SaaS operation must go
 * through this (or an equivalent server-side check) — never trust a
 * browser-provided organization ID as authorization.
 */
export async function requireOrgMembership(userId: string, organizationId: string) {
  const db = await getDbFromContext();
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return membership ?? null;
}
