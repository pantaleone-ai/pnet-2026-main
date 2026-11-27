import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chatbotKnowledgeSources, chatbots, knowledgeSources } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function randomId(): string {
  return crypto.randomUUID();
}

async function loadChatbot(db: ReturnType<typeof getDb>, chatbotId: string, userId: string) {
  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
  if (!bot) return { status: 404 as const };
  const membership = await requireOrgMembership(userId, bot.organizationId);
  if (!membership) return { status: 403 as const };
  return { status: 200 as const, bot };
}

/** Link an existing org source to this chatbot. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { id, sourceId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const loaded = await loadChatbot(db, id, session.user.id);
  if (loaded.status !== 200 || !loaded.bot) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Chatbot not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId))
    .limit(1);
  if (!source || source.organizationId !== loaded.bot.organizationId) {
    return NextResponse.json({ error: "Source not found." }, { status: 404, headers: NO_STORE });
  }
  try {
    const existing = await db
      .select()
      .from(chatbotKnowledgeSources)
      .where(
        and(
          eq(chatbotKnowledgeSources.chatbotId, id),
          eq(chatbotKnowledgeSources.knowledgeSourceId, sourceId),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(chatbotKnowledgeSources).values({
        id: randomId(),
        chatbotId: id,
        knowledgeSourceId: sourceId,
      });
    }
  } catch (err) {
    logger.error("Link source failed", err, { context: "chatbots-api" });
    return NextResponse.json({ error: "Could not link." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

/** Unlink a source from this chatbot (the source itself is kept). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { id, sourceId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const loaded = await loadChatbot(db, id, session.user.id);
  if (loaded.status !== 200 || !loaded.bot) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Chatbot not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  await db
    .delete(chatbotKnowledgeSources)
    .where(
      and(
        eq(chatbotKnowledgeSources.chatbotId, id),
        eq(chatbotKnowledgeSources.knowledgeSourceId, sourceId),
      ),
    );
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
