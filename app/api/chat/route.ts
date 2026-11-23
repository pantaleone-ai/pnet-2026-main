import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  CHAT_MAX_MESSAGE_LENGTH,
  chatPayloadSchema,
} from "@/lib/validations/chat";
import { searchChatCorpus, type ChatRetrievalHit } from "@/lib/chat-retrieval";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RETRIEVAL_TOP_K = 5;
// Semantic rerank pool: lexical shortlist size before embedding rerank.
// Bounded to keep per-request embedding cost and latency predictable.
const RERANK_POOL = 12;
// Set CHAT_NO_RERANK=1 to force lexical order (debugging / eval baseline).
const RERANK_ENABLED = process.env.CHAT_NO_RERANK !== "1";
const EMBED_TEXT_CHARS = 500;
// Primary generation model (Workers AI). OpenAI remains as an optional
// secondary when Workers AI is unreachable; extractive fallback is last.
const CHAT_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const EMBED_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE_URL = "https://www.pantaleone.net";

async function getAIBinding(): Promise<CloudflareAI | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.AI ?? null;
  } catch {
    // Local dev without the Cloudflare runtime: no AI binding.
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embedding rerank: lexical shortlist first (cheap, deterministic), then
 * fuse lexical rank with embedding-similarity rank via reciprocal rank
 * fusion. Pure cosine reorder demonstrably demotes strong lexical hits on
 * this corpus (eval 19→17); RRF keeps lexical winners unless the
 * embeddings disagree across the pool. Throws on AI failure so the caller
 * keeps lexical order as fallback.
 */
async function rerankWithEmbeddings(
  ai: CloudflareAI,
  question: string,
  hits: ChatRetrievalHit[],
): Promise<ChatRetrievalHit[]> {
  const pool = hits.slice(0, RERANK_POOL);
  if (pool.length <= 1) return hits;
  const texts = [
    question.slice(0, EMBED_TEXT_CHARS),
    ...pool.map((h) =>
      `${h.title}\n${h.description}\n${h.excerpt}`.slice(
        0,
        EMBED_TEXT_CHARS,
      ),
    ),
  ];
  const result = (await ai.run(EMBED_MODEL, { text: texts })) as {
    shape?: number[];
    data?: number[][];
  };
  const vectors = result?.data;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error("Unexpected embedding response shape");
  }
  const queryVector = vectors[0];
  if (!queryVector) throw new Error("Missing query embedding");
  const embeddingRank = new Map<ChatRetrievalHit, number>(
    pool
      .map((hit, i) => ({
        hit,
        similarity: cosineSimilarity(queryVector, vectors[i + 1] ?? []),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ hit }, rank) => [hit, rank + 1] as const),
  );
  const K = 60;
  return pool
    .map((hit, lexicalRank) => ({
      hit,
      score:
        1 / (K + (lexicalRank + 1)) +
        1 / (K + (embeddingRank.get(hit) ?? pool.length + 1)),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ hit }) => hit);
}

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

function buildContext(results: ChatRetrievalHit[]) {
  return results.slice(0, RETRIEVAL_TOP_K).map((r) => ({
    title: r.title,
    type: r.type,
    url: toSourceUrl({ type: r.type, slug: r.slug }),
    excerpt: r.excerpt || "",
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

  logger.info("chat turn", {
    context: "chat-api",
    meta: {
      path: "fallback",
      sources: context.length,
      promptChars: question.length,
    },
  });

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

/**
 * Primary generation path: Workers AI chat model with streaming.
 * Accepts both the Workers AI SSE shape ({ response }) and the
 * OpenAI shape ({ choices[0].delta.content }) so gateway-proxied
 * responses keep working without code changes.
 */
async function streamFromWorkersAI(
  ai: CloudflareAI,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  context: ReturnType<typeof buildContext>,
): Promise<Response> {
  const contextBlock = context
    .map((c) => `SOURCE: ${c.title} (${c.url})\n${c.excerpt}`)
    .join("\n\n");

  const upstream = (await ai.run(
    CHAT_MODEL,
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Site context (do not repeat verbatim):\n${contextBlock || "(no matching site content)"}`,
        },
        ...history,
        { role: "user", content: message },
      ],
      stream: true,
      max_tokens: 800,
    },
  )) as unknown as ReadableStream<Uint8Array>;

  if (!upstream) throw new Error("Empty Workers AI stream");

  const sourcesChunk = sseEncode({ sources: context });
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sourcesChunk);
      const reader = upstream.getReader();
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
              const json = JSON.parse(data) as {
                response?: string;
                choices?: { delta?: { content?: string } }[];
              };
              const delta =
                json.response ?? json.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(sseEncode({ delta }));
            } catch {
              // Ignore non-JSON keepalive chunks.
            }
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        logger.error("Workers AI stream relay failed", error, {
          context: "chat-api",
        });
        controller.close();
      } finally {
        logger.info("chat turn", {
          context: "chat-api",
          meta: {
            path: "workers-ai",
            model: CHAT_MODEL,
            sources: context.length,
            promptChars: message.length,
          },
        });
      }
    },
  });

  return new Response(stream, {
    headers: { ...NO_STORE, "Content-Type": "text/event-stream" },
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
      stream_options: { include_usage: true },
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
  // Token usage arrives in the final streamed chunk when
  // stream_options.include_usage is set. Logged for cost visibility
  // (Stage 1: observability only, no billing).
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
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
              if (json?.usage) {
                promptTokens = json.usage.prompt_tokens ?? null;
                completionTokens = json.usage.completion_tokens ?? null;
              }
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
      } finally {
        logger.info("chat turn", {
          context: "chat-api",
          meta: {
            path: "model",
            model: OPENAI_MODEL,
            promptTokens,
            completionTokens,
            sources: context.length,
            promptChars: message.length,
          },
        });
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

    const ai = await getAIBinding();

    let hits = searchChatCorpus(message);
    if (RERANK_ENABLED && ai && hits.length > 1) {
      try {
        const reranked = await rerankWithEmbeddings(ai, message, hits);
        hits = reranked;
        logger.info("chat rerank", {
          context: "chat-api",
          meta: { model: EMBED_MODEL, pool: Math.min(hits.length, RERANK_POOL) },
        });
      } catch (error) {
        // Embedding rerank is an enhancement — lexical order stands.
        logger.warn("Embedding rerank failed, using lexical order", {
          context: "chat-api",
          meta: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    let context: ReturnType<typeof buildContext> = [];
    try {
      context = buildContext(hits);
    } catch (error) {
      logger.error("Chat retrieval failed", error, { context: "chat-api" });
    }

    if (ai) {
      try {
        return await streamFromWorkersAI(ai, message, history ?? [], context);
      } catch (error) {
        logger.error("Workers AI chat failed, trying OpenAI", error, {
          context: "chat-api",
        });
      }
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
