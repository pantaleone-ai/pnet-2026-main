import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chatbots } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import {
  resolveChatbotConfig,
  retrieveAndGenerate,
  streamSourcesAndText,
  type TenantBindings,
} from "@/lib/tenant-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const previewSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

/**
 * Authed test drive: same retrieval + generation core as the public path,
 * but for DRAFT bots too, with no persistence and no usage events — test
 * traffic must never pollute conversations or metering. Membership-gated.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A message of 1–2000 characters is required." }, { status: 400, headers: NO_STORE });
  }

  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    AI?: { run(model: string, input: unknown): Promise<unknown> };
    VECTORIZE_SAAS?: TenantBindings["VECTORIZE_SAAS"];
    ENV_NAME?: string;
  };
  const db = getDb(e.CHAT_DB);

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, id)).limit(1);
  if (!bot) {
    return NextResponse.json({ error: "Chatbot not found." }, { status: 404, headers: NO_STORE });
  }
  const membership = await requireOrgMembership(session.user.id, bot.organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE });
  }

  // Owner preview: same settings assembly as the public path, but the
  // published-only gate is lifted so drafts are testable.
  const config = await resolveChatbotConfig(db, bot);
  const effective = { bot, ...config };

  const bindings: TenantBindings = {
    AI: e.AI ?? null,
    VECTORIZE_SAAS: e.VECTORIZE_SAAS ?? null,
    KV: null,
    ENV_NAME: e.ENV_NAME ?? "production",
  };
  const reply = await retrieveAndGenerate({
    db,
    bindings,
    bot: { id: bot.id, name: bot.name, organizationId: bot.organizationId },
    resolved: effective,
    message: parsed.data.message,
  });
  return streamSourcesAndText(reply.context, reply.text);
}
