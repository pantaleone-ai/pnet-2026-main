import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chatbotKnowledgeSources, chatbots, knowledgeSources } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { updateChatbotSchema } from "@/lib/ingest/assistant";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Update chatbot identity, behavior, appearance, or publish status. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, id)).limit(1);
  if (!bot) {
    return NextResponse.json({ error: "Chatbot not found." }, { status: 404, headers: NO_STORE });
  }
  const membership = await requireOrgMembership(session.user.id, bot.organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = updateChatbotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: NO_STORE },
    );
  }
  const input = parsed.data;

  // Publishing requires at least one READY knowledge source — a bot with
  // nothing to answer from must stay a draft (same gate the onboarding
  // wizard will enforce in P4c).
  if (input.status === "published" && bot.status !== "published") {
    const ready = await db
      .select({ id: knowledgeSources.id })
      .from(chatbotKnowledgeSources)
      .innerJoin(
        knowledgeSources,
        eq(chatbotKnowledgeSources.knowledgeSourceId, knowledgeSources.id),
      )
      .where(
        and(
          eq(chatbotKnowledgeSources.chatbotId, id),
          eq(knowledgeSources.status, "ready"),
        ),
      )
      .limit(1);
    if (ready.length === 0) {
      return NextResponse.json(
        { error: "Add at least one ready knowledge source before publishing." },
        { status: 409, headers: NO_STORE },
      );
    }
  }

  try {
    await db
      .update(chatbots)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.welcomeMessage !== undefined ? { welcomeMessage: input.welcomeMessage } : {}),
        ...(input.leadCaptureMode !== undefined ? { leadCaptureMode: input.leadCaptureMode } : {}),
        ...(input.appearance !== undefined
          ? { appearanceJson: JSON.stringify(input.appearance) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(chatbots.id, id));
  } catch (err) {
    logger.error("Update chatbot failed", err, { context: "chatbots-api" });
    return NextResponse.json({ error: "Could not update." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
