import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import Link from "next/link";

import { chatbots, chatbotKnowledgeSources, knowledgeSources, organizationMembers } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import AddSourceForm from "./AddSourceForm";
import SourceCard from "./SourceCard";

export const dynamic = "force-dynamic";

/**
 * Knowledge base: website/sitemap/file/FAQ sources, ingestion status,
 * page exclusions, refresh, and delete. Scoped to the signed-in user's
 * first workspace + chatbot (multi-workspace UI lands in P6).
 */
export default async function KnowledgePage() {
  const session = await getSession();
  if (!session?.user) return null;

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);

  // First workspace's chatbots (P0 creates exactly one per org).
  const bots = await db
    .select()
    .from(chatbots)
    .innerJoin(
      organizationMembers,
      eq(chatbots.organizationId, organizationMembers.organizationId),
    )
    .where(eq(organizationMembers.userId, session.user.id));
  const bot = bots[0]?.chatbots;
  if (!bot) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="text-sm text-muted-foreground">
          No assistant yet. Contact support if this persists after signup.
        </p>
      </div>
    );
  }

  const links = await db
    .select({ knowledgeSource: knowledgeSources })
    .from(chatbotKnowledgeSources)
    .innerJoin(knowledgeSources, eq(chatbotKnowledgeSources.knowledgeSourceId, knowledgeSources.id))
    .where(eq(chatbotKnowledgeSources.chatbotId, bot.id));

  const sources = links.map((l) => ({
    ...l.knowledgeSource,
    createdAt: l.knowledgeSource.createdAt?.toISOString?.() ?? null,
    updatedAt: l.knowledgeSource.updatedAt?.toISOString?.() ?? null,
    lastIndexedAt: l.knowledgeSource.lastIndexedAt?.toISOString?.() ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline underline-offset-4">
            Dashboard
          </Link>{" "}
          · {bot.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the pages and files your assistant may answer from. Only
          selected sources are used — nothing else on the internet.
        </p>
      </div>

      <AddSourceForm chatbotId={bot.id} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          Sources ({sources.length})
        </h2>
        {sources.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No sources yet. Add your website above — ingestion usually takes
            a few minutes.
          </p>
        )}
        {sources.map((s) => (
          <SourceCard key={s.id} source={s} />
        ))}
      </div>
    </div>
  );
}
