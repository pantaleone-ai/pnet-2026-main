import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  CHAT_MAX_MESSAGE_LENGTH,
  chatPayloadSchema,
} from "@/lib/validations/chat";
import {
  MIN_LEXICAL_SCORE,
  docKey,
  findDocsBySlugs,
  fuseRanks,
  searchChatCorpus,
  type ChatRetrievalHit,
} from "@/lib/chat-retrieval";

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
// Kill switches (env): CHAT_NO_RERANK=1 forces lexical order.
// CHAT_VECTORIZE=0 disables the Vectorize index leg (experiment branch:
// default ON to measure the compact-vector + per-query-fallback recipe;
// keep ON only if the 50-question eval beats the 20/20 lexical baseline).
const VECTORIZE_ENABLED = process.env.CHAT_VECTORIZE !== "0";
const VECTORIZE_TOP_K = 12;
// Per-query fallback: the index leg runs only when the lexical top hit is
// weak (below a bare title match). Strong lexical matches skip the extra
// latency/cost; weak ones get semantic rescue.
const WEAK_LEXICAL_TOP_SCORE = 10;

type ChatBindings = {
  ai: CloudflareAI | null;
  vectorize: CloudflareVectorize | null;
  kv: CloudflareKV | null;
  waitUntil: ((p: Promise<unknown>) => void) | null;
};

async function getChatBindings(): Promise<ChatBindings> {
  const empty: ChatBindings = {
    ai: null,
    vectorize: null,
    kv: null,
    waitUntil: null,
  };
  try {
    const context = (await getCloudflareContext({
      async: true,
    })) as unknown as {
      env?: Partial<CloudflareEnv>;
      ctx?: { waitUntil?: (p: Promise<unknown>) => void };
    };
    return {
      ai: context?.env?.AI ?? null,
      vectorize: context?.env?.VECTORIZE ?? null,
      kv: context?.env?.CHAT_ANALYTICS ?? null,
      waitUntil: context?.ctx?.waitUntil ?? null,
    };
  } catch {
    // Local dev without the Cloudflare runtime: no bindings.
    return empty;
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
 * Single batched embedding call. Returns one vector per input text, in
 * order. Throws on shape mismatch so callers keep lexical order.
 */
async function embedTexts(
  ai: CloudflareAI,
  texts: string[],
): Promise<number[][]> {
  const result = (await ai.run(EMBED_MODEL, { text: texts })) as {
    shape?: number[];
    data?: number[][];
  };
  const vectors = result?.data;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error("Unexpected embedding response shape");
  }
  return vectors;
}

function orderByCosine(
  pool: ChatRetrievalHit[],
  queryVector: number[],
  vectors: number[][],
): ChatRetrievalHit[] {
  return pool
    .map((hit, i) => ({
      hit,
      similarity: cosineSimilarity(queryVector, vectors[i] ?? []),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ hit }) => hit);
}

function lengthBucket(n: number): "short" | "medium" | "long" {
  if (n < 30) return "short";
  if (n < 100) return "medium";
  return "long";
}

function hashQuery(q: string): string {
  let h = 0x811c9dc5;
  const s = q.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export type TurnReport = {
  path: string;
  model?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
};

/**
 * Usage analytics (Stage 2 foundation). Per-turn aggregates plus
 * zero-result query capture (raw text ≤200 chars, owner-approved for
 * search-term mining). Best-effort: analytics never breaks chat.
 * Keys expire after 90 days.
 */
async function recordAnalytics(
  kv: CloudflareKV,
  entry: TurnReport & {
    sources: number;
    promptChars: number;
    promptBucket: "short" | "medium" | "long";
    retrievalMs: number;
    zeroResult: boolean;
    question: string;
    via: "suggestion" | "typed" | "retry";
    depthBucket: "first" | "followup" | "deep";
  },
): Promise<void> {
  const TTL = 90 * 24 * 3600;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const dayKey = `day:${day}`;
    const cur = JSON.parse((await kv.get(dayKey)) ?? "{}") as Record<
      string,
      unknown
    >;
    const paths = (cur.paths ?? {}) as Record<string, number>;
    paths[entry.path] = (paths[entry.path] ?? 0) + 1;
    const models = (cur.models ?? {}) as Record<string, number>;
    if (entry.model) models[entry.model] = (models[entry.model] ?? 0) + 1;
    const via = (cur.via ?? {}) as Record<string, number>;
    via[entry.via] = (via[entry.via] ?? 0) + 1;
    const depth = (cur.depth ?? {}) as Record<string, number>;
    depth[entry.depthBucket] = (depth[entry.depthBucket] ?? 0) + 1;
    await kv.put(
      dayKey,
      JSON.stringify({
        turns: ((cur.turns as number) ?? 0) + 1,
        paths,
        models,
        via,
        depth,
        zeroResults: ((cur.zeroResults as number) ?? 0) + (entry.zeroResult ? 1 : 0),
      }),
      { expirationTtl: TTL },
    );
    if (entry.zeroResult) {
      const zkey = `zero:${day}:${hashQuery(entry.question)}`;
      const z = JSON.parse((await kv.get(zkey)) ?? "{}") as Record<
        string,
        unknown
      >;
      await kv.put(
        zkey,
        JSON.stringify({
          q: entry.question,
          n: ((z.n as number) ?? 0) + 1,
          first: (z.first as number) ?? Date.now(),
        }),
        { expirationTtl: TTL },
      );
    }
  } catch {
    // Analytics is observability, not the product path.
  }
}

const limiter = rateLimit({
  interval: RATE_LIMIT_WINDOW_MS,
  uniqueTokenPerInterval: 1000,
});

function toSourceUrl(item: { type: string; slug: string; category?: string }): string {
  if (item.type === "blog") return `${SITE_URL}/blog/${item.slug}`;
  if (item.category) return `${SITE_URL}/shop/${item.category}/${item.slug}`;
  return `${SITE_URL}/shop`;
}

function buildContext(results: ChatRetrievalHit[]) {
  return results.slice(0, RETRIEVAL_TOP_K).map((r) => ({
    title: r.title,
    type: r.type,
    url: toSourceUrl({ type: r.type, slug: r.slug, category: r.category }),
    excerpt: r.excerpt || "",
  }));
}

const SYSTEM_PROMPT = [
  "You are Pantaleone Chat, the site assistant for https://www.pantaleone.net.",
  "Answer in direct, plain language using ONLY the site context provided.",
  "If the context does not contain the answer, say so and point to",
  "https://www.pantaleone.net/contact.",
  "Relevance check before answering: if none of the sources actually answer",
  "the question (for example hiring, pricing, contact details, or anything",
  "off-topic), say you cannot help from site content and point to the contact",
  "page. Never force an answer from unrelated sources.",
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

    const { message, history, via } = parsed.data;
    void CHAT_MAX_MESSAGE_LENGTH;

    const bindings = await getChatBindings();
    const { ai, vectorize, kv, waitUntil } = bindings;

    const retrievalStart = Date.now();
    const lexical = searchChatCorpus(message);
    let ranked = lexical;
    let embRank: Map<string, number> | null = null;
    if (RERANK_ENABLED && ai && lexical.length > 1) {
      try {
        const pool = lexical.slice(0, RERANK_POOL);
        const vectors = await embedTexts(ai, [
          message.slice(0, EMBED_TEXT_CHARS),
          ...pool.map((h) =>
            `${h.title}\n${h.description}\n${h.excerpt}`.slice(
              0,
              EMBED_TEXT_CHARS,
            ),
          ),
        ]);
        const queryVector = vectors[0];
        if (!queryVector) throw new Error("Missing query embedding");
        const lists: ChatRetrievalHit[][] = [
          pool,
          // Lexical evidence counts twice: exact term matches are the
          // strongest signal on this corpus, embeddings break ties.
          pool,
          orderByCosine(pool, queryVector, vectors.slice(1)),
        ];
        const cosineOrder = lists[2] as ChatRetrievalHit[];
        embRank = new Map<string, number>(
          cosineOrder.map((h, i) => [docKey(h), i + 1]),
        );
        const lexicalTop = pool[0]?.score ?? 0;
        if (
          VECTORIZE_ENABLED &&
          vectorize &&
          lexicalTop < WEAK_LEXICAL_TOP_SCORE
        ) {
          try {
            const res = await vectorize.query(queryVector, {
              topK: VECTORIZE_TOP_K,
              returnMetadata: "all",
            });
            const candidates = res.matches
              .map((m) => m.metadata)
              .filter(
                (md): md is { type: string; slug: string } =>
                  !!md &&
                  typeof md.type === "string" &&
                  typeof md.slug === "string",
              );
            const vecHits = findDocsBySlugs(candidates, message);
            if (vecHits.length > 0) lists.push(vecHits);
            logger.info("chat vectorize", {
              context: "chat-api",
              meta: { matches: res.count, triggeredByWeakLexical: lexicalTop },
            });
          } catch (error) {
            // Index leg is additive — cosine fusion still applies.
            logger.warn("Vectorize query failed, skipping index leg", {
              context: "chat-api",
              meta: {
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
        const fused = fuseRanks(lists);
        const fusedKeys = new Set(fused.map(docKey));
        const usedVectorize = lists.length > 3;
        ranked = [
          ...fused,
          ...lexical.filter((h) => !fusedKeys.has(docKey(h))),
        ];
        logger.info("chat rerank", {
          context: "chat-api",
          meta: {
            model: EMBED_MODEL,
            pool: pool.length,
            vectorize: usedVectorize,
            lexicalTop,
          },
        });
      } catch (error) {
        // Semantic legs are enhancements — lexical order stands.
        logger.warn("Semantic rerank failed, using lexical order", {
          context: "chat-api",
          meta: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }
    const retrievalMs = Date.now() - retrievalStart;

    // Relevance floor: exact matches need title-level evidence (10+),
    // unless the embedding model ranks them top-3 (semantic rescue for
    // slug-only topic matches and paraphrases). Weak single-content-word
    // hits become honest fallbacks. Fuzzy typo-rescues and Vectorize
    // rescues pass through on their own signal.
    const keep = (h: ChatRetrievalHit) =>
      h.origin !== "lexical" ||
      (h.score ?? 0) >= MIN_LEXICAL_SCORE ||
      (embRank?.get(docKey(h)) ?? 99) <= 3;

    let context: ReturnType<typeof buildContext> = [];
    try {
      context = buildContext(ranked);
    } catch (error) {
      logger.error("Chat retrieval failed", error, { context: "chat-api" });
    }

    // Usage analytics: one structured KV record per turn (90-day TTL),
    // written when the generation path is chosen — not when the stream
    // finishes — so abandoned streams (navigation, early cancel) still
    // count. Token counts remain log-only. Raw question text (≤200 chars)
    // is stored owner-approved for zero-result search-term mining.
    let kvMissingWarned = false;
    const schedule = (r: TurnReport) => {
      if (!kv) {
        if (!kvMissingWarned) {
          kvMissingWarned = true;
          logger.warn("CHAT_ANALYTICS binding missing, skipping usage record", {
            context: "chat-api",
          });
        }
        return;
      }
      const historyLen = history?.length ?? 0;
      const task = recordAnalytics(kv, {
        ...r,
        sources: context.length,
        promptChars: message.length,
        promptBucket: lengthBucket(message.length),
        retrievalMs,
        zeroResult: context.length === 0,
        question: message.slice(0, 200),
        via: via ?? "typed",
        depthBucket:
          historyLen <= 0 ? "first" : historyLen <= 3 ? "followup" : "deep",
      });
      if (waitUntil) {
        try {
          waitUntil(task);
        } catch {
          void task.catch(() => {});
        }
      } else {
        void task.catch(() => {});
      }
    };

    if (ai) {
      try {
        const res = await streamFromWorkersAI(
          ai,
          message,
          history ?? [],
          context,
        );
        schedule({ path: "workers-ai", model: CHAT_MODEL });
        return res;
      } catch (error) {
        logger.error("Workers AI chat failed, trying OpenAI", error, {
          context: "chat-api",
        });
      }
    }
    if (process.env.OPENAI_API_KEY) {
      const res = await streamFromOpenAI(message, history ?? [], context);
      schedule({ path: "model", model: OPENAI_MODEL });
      return res;
    }
    const res = streamExtractiveFallback(message, context);
    schedule({ path: "fallback" });
    return res;
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
