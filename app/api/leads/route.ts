import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chatbots, conversations, leads } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const leadSchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  conversationId: z.string().trim().max(128).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  company: z.string().trim().max(160).optional(),
  inquiry: z.string().trim().min(1).max(2000),
});

function randomId(): string {
  return crypto.randomUUID();
}

function getIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Visitor lead capture. Scoped to a published chatbot by publicId;
 * conversation linkage is verified to belong to that chatbot before it is
 * attached (a forged conversation id never leaks across bots).
 * Rate-limited per chatbot + IP in KV (best-effort, fail-open).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: NO_STORE },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    CHAT_PLATFORM?: {
      get(key: string): Promise<string | null>;
      put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    };
  };
  const db = getDb(e.CHAT_DB);

  const [bot] = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.publicId, parsed.data.publicId))
    .limit(1);
  if (!bot || bot.status !== "published") {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  }
  if (bot.leadCaptureMode === "off") {
    return NextResponse.json({ error: "Lead capture is off for this assistant." }, { status: 403, headers: NO_STORE });
  }

  // Best-effort abuse limit: 10 leads/hour per chatbot+IP.
  try {
    const kv = e.CHAT_PLATFORM;
    if (kv) {
      const key = `lead-rl:${bot.id}:${getIp(request)}`;
      const raw = await kv.get(key).catch(() => null);
      const count = raw ? Number.parseInt(raw, 10) || 0 : 0;
      if (count >= 10) {
        return NextResponse.json(
          { error: "Too many submissions. Please try again later." },
          { status: 429, headers: NO_STORE },
        );
      }
      await kv.put(key, String(count + 1), { expirationTtl: 3600 }).catch(() => undefined);
    }
  } catch {
    // Fail open: capture must not break on KV trouble.
  }

  let conversationId: string | null = null;
  if (parsed.data.conversationId) {
    // Attach only when the conversation belongs to THIS chatbot —
    // a forged id degrades to an unlinked lead, never a cross-bot link.
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, parsed.data.conversationId),
          eq(conversations.chatbotId, bot.id),
        ),
      )
      .limit(1);
    if (conv) conversationId = conv.id;
  }

  try {
    await db.insert(leads).values({
      id: randomId(),
      organizationId: bot.organizationId,
      chatbotId: bot.id,
      conversationId,
      name: parsed.data.name || null,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      inquiry: parsed.data.inquiry,
    });
  } catch (err) {
    logger.error("Lead insert failed", err, { context: "leads-api" });
    return NextResponse.json({ error: "Could not save." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
