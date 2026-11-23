import { NextResponse } from "next/server";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  CHAT_MAX_MESSAGE_LENGTH,
  chatPayloadSchema,
} from "@/lib/validations/chat";
import { getPostsBySearchQuery } from "@/lib/search-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RETRIEVAL_TOP_K = 5;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE_URL = "https://www.pantaleone.net";

const limiter = rateLimit({
  interval: RATE_LIMIT_WINDOW_MS,
  uniqueTokenPerInterval: 1000,
});

function toSourceUrl(item: {
  type: string;
  slug: string;
}): string {
  if (item.type === "blog") return `${SITE_URL}/blog/${item.slug}`;
  return `${SITE_URL}/shop`;
}

function buildContext(results: Awaited<ReturnType<typeof getPostsBySearchQuery>>) {
  return results.slice(0, RETRIEVAL_TOP_K).map((r) => ({
    title: r.title,
    type: r.type,
    url: toSourceUrl({ type: r.type, slug: r.slug }),
    excerpt:
      typeof r.content === "string" ? r.content.slice(0, 600) : "",
  }));
}

const SYSTEM_PROMPT = [
  "You are Pantaleone Chat, the site assistant for https://www.pantaleone.net.",
  "Answer in direct, plain language using ONLY the site context provided.",
  "If the context does not contain the answer, say so and point to",
  "https://www.pantaleone.net/contact.",
  "Never invent URLs, prices, dates, or facts. Cite the source titles you used.",
].join(" ");

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function streamExtractiveFallback(
  question: string,
  context: ReturnType<typeof buildContext>,
): Response {
  const lines =
    context.length > 0
      ? [
          `Based on https://www.pantaleone.net, here is what I found for "${question}":`,
          "",
          ...context.map(
            (c, i) => `${i + 1}. ${c.title} — ${c.excerpt || c.url}`,
          ),
          "",
          "Ask a follow-up, or use the contact page for anything not covered above.",
        ]
      : [
          "I could not find that on https://www.pantaleone.net.",
          "Try different words, or ask via https://www.pantaleone.net/contact.",
        ];

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sseEncode({ sources: context }));
      const full = lines.join("\n");
      const chunkSize = 120;
      for (let i = 0; i < full.length; i += chunkSize) {
        controller.enqueue(
          sseEncode({ delta: full.slice(i, i + chunkSize) }),
        );
      }
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/event-stream",
      "X-Chat-Fallback": "extractive",
    },
  });
}

async function streamFromOpenAI(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  context: ReturnType<typeof buildContext>,
): Promise<Response> {
  const contextBlock = context
    .map((c) => `SOURCE: ${c.title} (${c.url})\n${c.excerpt}`)
    .join("\n\n");

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      stream: true,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Site context (do not repeat verbatim):\n${contextBlock || "(no matching site content)"}`,
        },
        ...history,
        { role: "user", content: message },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    logger.error("OpenAI chat upstream error", undefined, {
      context: "chat-api",
      meta: { status: upstream.status },
    });
    return streamExtractiveFallback(message, context);
  }

  const sourcesChunk = sseEncode({ sources: context });
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sourcesChunk);
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta: string =
                json?.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(sseEncode({ delta }));
            } catch {
              // Ignore non-JSON keepalive chunks.
            }
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        logger.error("Chat stream relay failed", error, {
          context: "chat-api",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...NO_STORE, "Content-Type": "text/event-stream" },
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405, headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  try {
    const identifier = getIdentifier(request);
    try {
      await limiter.check(RATE_LIMIT_MAX, identifier);
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: NO_STORE },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413, headers: NO_STORE },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = chatPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400, headers: NO_STORE },
      );
    }

    const { message, history } = parsed.data;
    void CHAT_MAX_MESSAGE_LENGTH;

    let context: ReturnType<typeof buildContext> = [];
    try {
      const results = await getPostsBySearchQuery(message);
      context = buildContext(results);
    } catch (error) {
      logger.error("Chat retrieval failed", error, { context: "chat-api" });
    }

    if (process.env.OPENAI_API_KEY) {
      return streamFromOpenAI(message, history ?? [], context);
    }
    return streamExtractiveFallback(message, context);
  } catch (error) {
    logger.error("Unexpected error in chat API", error, {
      context: "chat-api",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500, headers: NO_STORE },
    );
  }
}
