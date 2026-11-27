import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chatbots, chatbotSettings } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { updateSettingsSchema } from "@/lib/ingest/assistant";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Replace the chatbot's retrieval + generation knobs (upsert). */
export async function PUT(
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
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: NO_STORE },
    );
  }
  const input = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(chatbotSettings)
      .where(eq(chatbotSettings.chatbotId, id))
      .limit(1);
    if (existing) {
      await db
        .update(chatbotSettings)
        .set({
          ...(input.tone !== undefined ? { tone: input.tone } : {}),
          ...(input.systemInstructions !== undefined
            ? { systemInstructions: input.systemInstructions }
            : {}),
          ...(input.suggestedQuestions !== undefined
            ? { suggestedQuestionsJson: JSON.stringify(input.suggestedQuestions) }
            : {}),
          ...(input.fallbackMessage !== undefined
            ? { fallbackMessage: input.fallbackMessage }
            : {}),
          ...(input.topK !== undefined ? { topK: input.topK } : {}),
          updatedAt: new Date(),
        })
        .where(eq(chatbotSettings.chatbotId, id));
    } else {
      await db.insert(chatbotSettings).values({
        chatbotId: id,
        tone: input.tone ?? null,
        systemInstructions: input.systemInstructions ?? null,
        suggestedQuestionsJson: JSON.stringify(input.suggestedQuestions ?? []),
        fallbackMessage: input.fallbackMessage ?? null,
        topK: input.topK ?? null,
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    logger.error("Update settings failed", err, { context: "chatbots-api" });
    return NextResponse.json({ error: "Could not update." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
