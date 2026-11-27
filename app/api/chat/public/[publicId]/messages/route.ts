import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conversations,
  messages,
  usageEvents,
} from "@/drizzle/schema";
import { getDb, type ChatDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import {
  buildTenantSystemPrompt,
  checkTenantRateLimit,
  isOriginAllowed,
  resolvePublicChatbot,
  retrieveTenantContext,
  sseEncode,
  SSE_DONE,
  type TenantBindings,
  type TenantContextItem,
} from "@/lib/tenant-chat";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Per-isolate burst guard (strict within an isolate; KV below is the
// cross-isolate coarse layer). Module-level: shared across requests on
// the same isolate, same as /api/chat.
const isolateLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 2000 });
const ISOLATE_RATE_LIMIT_MAX = 60;

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  visitorId: z
    .string()
    .trim()
    .max(128)
    .optional(),
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

function streamText(chunks: string[], sources: TenantContextItem[]): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        sseEncode({
          sources: sources.map((s) => ({
            title: s.title,
            url: s.url,
            excerpt: s.excerpt,
          })),
        }),
      );
      for (const chunk of chunks) {
        controller.enqueue(sseEncode({ delta: chunk }));
      }
      controller.enqueue(new TextEncoder().encode(SSE_DONE));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...NO_STORE, "Content-Type": "text/event-stream" },
  });
}

function streamFallback(text: string): Response {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += 120) out.push(text.slice(i, i + 120));
  return streamText(out, []);
}

/**
 * Public visitor chat (SSE): sources event, delta chunks, [DONE] — the same
 * contract as /api/chat. Resolves by publicId, enforces published +
 * origin allowlist + rate limit, retrieves tenant-scoped context, streams
 * the model, and persists conversation/messages/usage.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A message of 1–2000 characters is required." }, { status: 400, headers: NO_STORE });
  }

  const { env, ctx } = (await getCloudflareContext({ async: true })) as unknown as {
    env: {
      CHAT_DB?: unknown;
      AI?: { run(model: string, input: unknown): Promise<unknown> };
      VECTORIZE_SAAS?: TenantBindings["VECTORIZE_SAAS"];
      CHAT_PLATFORM?: TenantBindings["KV"];
      ENV_NAME?: string;
    };
    ctx?: { waitUntil?: (p: Promise<unknown>) => void };
  };
  const e = env;
  const runAfterResponse = (p: Promise<unknown>) => {
    if (ctx?.waitUntil) ctx.waitUntil(p.catch(() => undefined));
    else void p.catch(() => undefined);
  };
  const db = getDb(e.CHAT_DB);
  const resolved = await resolvePublicChatbot(db, publicId);
  if (!resolved) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  }

  if (!(await isOriginAllowed(db, resolved.bot.id, request))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE });
  }

  // Burst guard first (cheap, no side effects), then the cross-isolate
  // KV layer (coarse under KV eventual consistency — see runbook).
  try {
    await isolateLimiter.check(ISOLATE_RATE_LIMIT_MAX, `tenant:${publicId}:${getIdentifier(request)}`);
  } catch {
    return NextResponse.json(
      { error: "Too many messages. Please wait a minute and try again." },
      { status: 429, headers: NO_STORE },
    );
  }
  const rl = await checkTenantRateLimit(
    (e.CHAT_PLATFORM as TenantBindings["KV"]) ?? null,
    publicId,
    getIp(request),
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a minute and try again." },
      { status: 429, headers: NO_STORE },
    );
  }

  const bindings: TenantBindings = {
    AI: e.AI ?? null,
    VECTORIZE_SAAS: e.VECTORIZE_SAAS ?? null,
    KV: (e.CHAT_PLATFORM as TenantBindings["KV"]) ?? null,
    ENV_NAME: e.ENV_NAME ?? "production",
  };

  const context = await retrieveTenantContext({
    db,
    bindings,
    organizationId: resolved.bot.organizationId,
    chatbotId: resolved.bot.id,
    query: parsed.data.message,
    topK: resolved.topK,
  });

  // Empty-context guard (ported from /api/chat): never force an answer.
  if (context.length === 0) {
    const reply = await persistTurn(db, resolved.bot.organizationId, resolved.bot.id, parsed.data.visitorId, parsed.data.message, resolved.fallbackMessage, [], resolved.model);
    void reply;
    return streamFallback(resolved.fallbackMessage);
  }

  const system = buildTenantSystemPrompt({
    botName: resolved.bot.name,
    tone: resolved.tone,
    instructions: resolved.instructions,
  });
  const contextBlock = context
    .map((c, i) => `[${i + 1}] ${c.title}\n${c.excerpt}`)
    .join("\n\n");

  const sourcesPayload = context.map((c) => ({
    title: c.title,
    url: c.url,
    excerpt: c.excerpt,
  }));

  // No model binding (local dev without AI): deterministic fallback, persisted.
  if (!bindings.AI) {
    const lines = [
      `Here is what I found for "${parsed.data.message}":`,
      "",
      ...context.map((c, i) => `${i + 1}. ${c.title}${c.url ? ` — ${c.url}` : ""}\n${c.excerpt}`),
    ];
    const full = lines.join("\n");
    await persistTurn(db, resolved.bot.organizationId, resolved.bot.id, parsed.data.visitorId, parsed.data.message, full, context, resolved.model);
    const out: string[] = [];
    for (let i = 0; i < full.length; i += 120) out.push(full.slice(i, i + 120));
    return streamText(out, context);
  }

  let upstream: ReadableStream<Uint8Array> | null = null;
  try {
    upstream = (await bindings.AI.run(resolved.model, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${contextBlock}\n\nVisitor: ${parsed.data.message}` },
      ],
      stream: true,
    })) as unknown as ReadableStream<Uint8Array>;
  } catch (err) {
    logger.warn("Tenant generation failed, using fallback", {
      context: "tenant-chat",
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // Generation unavailable: extractive fallback over retrieved context.
  if (!upstream) {
    const lines = [
      `Here is what I found for "${parsed.data.message}":`,
      "",
      ...context.map((c, i) => `${i + 1}. ${c.title}${c.url ? ` — ${c.url}` : ""}\n${c.excerpt}`),
    ];
    const full = lines.join("\n");
    await persistTurn(db, resolved.bot.organizationId, resolved.bot.id, parsed.data.visitorId, parsed.data.message, full, context, resolved.model);
    const out: string[] = [];
    for (let i = 0; i < full.length; i += 120) out.push(full.slice(i, i + 120));
    return streamText(out, context);
  }

  // Streaming relay (proven /api/chat shape): sources first, deltas live,
  // persistence via waitUntil after the full text is known.
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let emitted = "";
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEncode({ sources: sourcesPayload }));
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                response?: string;
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.response ?? json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                emitted += delta;
                controller.enqueue(sseEncode({ delta }));
              }
            } catch {
              // Ignore non-JSON keepalive chunks.
            }
          }
        }
        let finalText = emitted.trim();
        if (!finalText) {
          // Empty-generation guard: extractive fallback, same as /api/chat.
          const lines = [
            `Here is what I found for "${parsed.data.message}":`,
            "",
            ...context.map((c, i) => `${i + 1}. ${c.title}${c.url ? ` — ${c.url}` : ""}\n${c.excerpt}`),
          ];
          finalText = lines.join("\n");
          for (let i = 0; i < finalText.length; i += 120) {
            controller.enqueue(sseEncode({ delta: finalText.slice(i, i + 120) }));
          }
          logger.warn("Tenant model returned empty completion, using fallback", {
            context: "tenant-chat",
          });
        }
        const toPersist = finalText;
        runAfterResponse(
          persistTurn(db, resolved.bot.organizationId, resolved.bot.id, parsed.data.visitorId, parsed.data.message, toPersist, context, resolved.model),
        );
        controller.enqueue(new TextEncoder().encode(SSE_DONE));
        controller.close();
      } catch (error) {
        logger.error("Tenant stream relay failed", error as Error, {
          context: "tenant-chat",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...NO_STORE, "Content-Type": "text/event-stream" },
  });
}

async function persistTurn(
  db: ChatDatabase,
  organizationId: string,
  chatbotId: string,
  visitorId: string | undefined,
  visitorMessage: string,
  assistantMessage: string,
  context: TenantContextItem[],
  model: string,
): Promise<string> {
  const vid = visitorId?.trim().slice(0, 128) || randomId();
  let conversation = (
    await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.chatbotId, chatbotId), eq(conversations.visitorId, vid)))
      .limit(1)
  )[0];
  if (!conversation) {
    const [created] = await db
      .insert(conversations)
      .values({
        id: randomId(),
        organizationId,
        chatbotId,
        visitorId: vid,
        title: visitorMessage.slice(0, 80),
        status: "open",
      })
      .returning({ id: conversations.id });
    if (!created) throw new Error("Could not create conversation.");
    conversation = (
      await db.select().from(conversations).where(eq(conversations.id, created.id)).limit(1)
    )[0];
    if (!conversation) throw new Error("Could not load conversation.");
  } else {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
  }
  await db.insert(messages).values({
    id: randomId(),
    conversationId: conversation.id,
    role: "user",
    content: visitorMessage,
  });
  await db.insert(messages).values({
    id: randomId(),
    conversationId: conversation.id,
    role: "assistant",
    content: assistantMessage,
    citationsJson: JSON.stringify(
      context.map((c) => ({ title: c.title, url: c.url })),
    ),
    tokensJson: JSON.stringify({
      inputChars: visitorMessage.length,
      outputChars: assistantMessage.length,
    }),
  });
  await db.insert(usageEvents).values({
    id: randomId(),
    organizationId,
    chatbotId,
    conversationId: conversation.id,
    eventType: "message",
    model,
    inputChars: visitorMessage.length,
    outputChars: assistantMessage.length,
  });
  return conversation.id;
}
