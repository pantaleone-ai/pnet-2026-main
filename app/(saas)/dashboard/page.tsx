import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";

import { getDb } from "@/lib/db";
import { chatbots, organizationMembers, organizations } from "@/drizzle/schema";
import { getSession } from "@/lib/auth-session";
import { SignOutButton } from "./SignOutButton";

/**
 * Minimal P0 dashboard: proves auth, session, and org scoping end to end.
 * Grows into the full workspace dashboard in later phases.
 */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) return null;

  const { env } = await getCloudflareContext({ async: true });
  const chatDb = (env as { CHAT_DB?: unknown }).CHAT_DB;
  const db = getDb(chatDb);
  const memberships = await db
    .select({
      orgId: organizationMembers.organizationId,
      orgName: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, session.user.id));
  const firstOrg = memberships[0];
  const bots =
    firstOrg !== undefined
      ? await db
          .select()
          .from(chatbots)
          .where(eq(chatbots.organizationId, firstOrg.orgId))
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
        </div>
        <SignOutButton />
      </div>
      {memberships.map((m) => (
        <div key={m.orgId} className="rounded-lg border border-border p-4 text-left">
          <p className="text-sm font-medium">{m.orgName}</p>
          <p className="text-xs text-muted-foreground">Role: {m.role}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {bots.map((b) => (
              <li key={b.id} className="text-sm">
                {b.name} — {b.status} ·{" "}
                <Link href="/knowledge" className="underline underline-offset-4">
                  Knowledge
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {memberships.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No workspace yet. Contact support if this persists after signup.
        </p>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
