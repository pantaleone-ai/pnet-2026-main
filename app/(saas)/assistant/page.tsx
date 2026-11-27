import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import Link from "next/link";

import {
  chatbotKnowledgeSources,
  chatbots,
  chatbotSettings,
  knowledgeSources,
  organizationMembers,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import AssistantForm from "./AssistantForm";

export const dynamic = "force-dynamic";

/**
 * Assistant configuration: identity, behavior, appearance, knowledge
 * selection, and publish state. Same workspace scoping as /knowledge.
 */
export default async function AssistantPage() {
  const session = await getSession();
  if (!session?.user) return null;

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);

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
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">
          No assistant yet. Contact support if this persists after signup.
        </p>
      </div>
    );
  }

  const [settings] = await db
    .select()
    .from(chatbotSettings)
    .where(eq(chatbotSettings.chatbotId, bot.id))
    .limit(1);

  const allSources = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.organizationId, bot.organizationId));
  const linked = await db
    .select({ knowledgeSourceId: chatbotKnowledgeSources.knowledgeSourceId })
    .from(chatbotKnowledgeSources)
    .where(eq(chatbotKnowledgeSources.chatbotId, bot.id));
  const linkedIds = new Set(linked.map((l) => l.knowledgeSourceId));

  let appearance: { theme?: string; launcherPosition?: string } = {};
  try {
    const parsed = JSON.parse(bot.appearanceJson ?? "{}") as unknown;
    if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      if (typeof p.theme === "string") appearance.theme = p.theme;
      if (typeof p.launcherPosition === "string") appearance.launcherPosition = p.launcherPosition;
    }
  } catch {
    appearance = {};
  }

  let suggestedQuestions: string[] = [];
  try {
    const parsed = JSON.parse(settings?.suggestedQuestionsJson ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      suggestedQuestions = parsed.filter((q): q is string => typeof q === "string").slice(0, 6);
    }
  } catch {
    suggestedQuestions = [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline underline-offset-4">
            Dashboard
          </Link>{" "}
          · <Link href="/knowledge" className="underline underline-offset-4">Knowledge</Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how your assistant talks, what it knows, and when it goes live.
        </p>
      </div>
      <AssistantForm
        chatbot={{
          id: bot.id,
          name: bot.name,
          description: bot.description,
          status: bot.status,
          publicId: bot.publicId,
          welcomeMessage: bot.welcomeMessage,
          leadCaptureMode: bot.leadCaptureMode,
          appearance,
        }}
        settings={{
          tone: settings?.tone ?? null,
          systemInstructions: settings?.systemInstructions ?? null,
          suggestedQuestions,
          fallbackMessage: settings?.fallbackMessage ?? null,
          topK: settings?.topK ?? null,
        }}
        sources={allSources.map((s) => ({
          id: s.id,
          name: s.name,
          sourceType: s.sourceType,
          status: s.status,
          linked: linkedIds.has(s.id),
        }))}
      />
    </div>
  );
}
