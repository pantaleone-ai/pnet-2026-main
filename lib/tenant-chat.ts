/**
 * Shared tenant-chat runtime (P4). Pure helpers + env-bound operations for
 * the public chat path. Every retrieval is filtered by organization_id
 * (Vectorize metadata) and joined to linked, ready sources (D1) — neither
 * filter may ever be omitted or made optional.
 */
import { and, eq, inArray } from "drizzle-orm";

import {
  chatbotKnowledgeSources,
  chatbotSettings,
  chatbots,
  documentChunks,
  documents,
  embedDomains,
  knowledgeSources,
  type Chatbot,
} from "@/drizzle/schema";
import { logger } from "@/lib/logger";
import type { ChatDatabase } from "@/lib/db";

export const TENANT_EMBED_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
export const TENANT_CHAT_MODEL = "@cf/google/gemma-4-26b-a4b-it";
export const TENANT_TOP_K = 8;
/** Per public chatbot per IP: messages per minute. */
export const TENANT_RATE_LIMIT_MAX = 30;
export const TENANT_RATE_LIMIT_WINDOW_S = 60;

export interface TenantBindings {
  AI: {
    run(model: string, input: unknown): Promise<unknown>;
  } | null;
  VECTORIZE_SAAS: {
    query(
      vector: number[],
      options?: {
        topK?: number;
        returnMetadata?: "none" | "indexed" | "all";
        filter?: Record<string, unknown>;
      },
    ): Promise<{ matches: { id: string; score: number; metadata?: Record<string, unknown> }[] }>;
  } | null;
  KV: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  } | null;
  ENV_NAME: string;
}

export interface ResolvedChatbot {
  bot: Chatbot;
  welcomeMessage: string | null;
  leadCaptureMode: string;
  model: string;
  topK: number;
  temperature: number | null;
  tone: string | null;
  instructions: string | null;
  fallbackMessage: string;
  suggestedQuestions: string[];
}

/** Resolve a public chatbot. Unpublished/missing → null (callers 404). */
export async function resolvePublicChatbot(
  db: ChatDatabase,
  publicId: string,
): Promise<ResolvedChatbot | null> {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.publicId, publicId))
    .limit(1);
  if (!bot || bot.status !== "published") return null;
  const [settings] = await db
    .select()
    .from(chatbotSettings)
    .where(eq(chatbotSettings.chatbotId, bot.id))
    .limit(1);
  let suggestedQuestions: string[] = [];
  try {
    const parsed = JSON.parse(settings?.suggestedQuestionsJson ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      suggestedQuestions = parsed.filter((q): q is string => typeof q === "string").slice(0, 6);
    }
  } catch {
    suggestedQuestions = [];
  }
  return {
    bot,
    welcomeMessage: bot.welcomeMessage,
    leadCaptureMode: bot.leadCaptureMode ?? "contact",
    model: settings?.model || TENANT_CHAT_MODEL,
    topK: settings?.topK && settings.topK > 0 ? Math.min(settings.topK, 20) : TENANT_TOP_K,
    temperature: settings?.temperature ?? null,
    tone: settings?.tone ?? null,
    instructions: parseInstructions(settings?.systemInstructions),
    fallbackMessage:
      settings?.fallbackMessage ||
      "I could not find that in our help content. Try different words, or leave your contact details and we will get back to you.",
    suggestedQuestions,
  };
}

function parseInstructions(settingsInstructions: unknown): string | null {
  return typeof settingsInstructions === "string" && settingsInstructions.trim()
    ? settingsInstructions.trim().slice(0, 2000)
    : null;
}

export function buildTenantSystemPrompt(args: {
  botName: string;
  tone: string | null;
  instructions: string | null;
}): string {
  const lines = [
    `You are ${args.botName}, a helpful assistant answering strictly from the provided business content.`,
    "Answer in direct, plain language using ONLY the context below.",
    "If the context does not contain the answer, say you could not find it and suggest leaving contact details.",
    "Never invent URLs, prices, dates, or facts. Mention the source names you used when you answer from them.",
  ];
  if (args.tone) lines.push(`Tone: ${args.tone.slice(0, 300)}`);
  const extra = parseInstructions(args.instructions);
  if (extra) lines.push(`Business instructions: ${extra}`);
  return lines.join(" ");
}

/** Origin allowlist: empty table = allow all (hosted page + direct API). */
export async function isOriginAllowed(
  db: ChatDatabase,
  chatbotId: string,
  request: Request,
): Promise<boolean> {
  const rows = await db
    .select({ domain: embedDomains.domain })
    .from(embedDomains)
    .where(eq(embedDomains.chatbotId, chatbotId));
  if (rows.length === 0) return true;
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  let host = "";
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return rows.some((r) => {
    const d = r.domain.toLowerCase().trim();
    return host === d || host.endsWith(`.${d}`);
  });
}

/**
 * Sliding-window rate limit in KV. Fail-open when KV is missing (abuse
 * limiting must never break answering), fail-closed per bucket otherwise.
 */
export async function checkTenantRateLimit(
  kv: TenantBindings["KV"],
  publicId: string,
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!kv) return { allowed: true, remaining: TENANT_RATE_LIMIT_MAX };
  const key = `tenant-rl:${publicId}:${ip}`;
  const raw = await kv.get(key).catch(() => null);
  const count = raw ? Number.parseInt(raw, 10) || 0 : 0;
  if (count >= TENANT_RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
  await kv
    .put(key, String(count + 1), { expirationTtl: TENANT_RATE_LIMIT_WINDOW_S })
    .catch(() => undefined);
  return { allowed: true, remaining: TENANT_RATE_LIMIT_MAX - count - 1 };
}

export interface TenantContextItem {
  title: string;
  url: string | null;
  excerpt: string;
  sourceId: string;
  documentId: string;
}

async function embedQuery(ai: NonNullable<TenantBindings["AI"]>, text: string): Promise<number[] | null> {
  try {
    // Array input matches the proven seed-script shape ({ text: string[] }).
    const result = (await ai.run(TENANT_EMBED_MODEL, { text: [text] })) as { data?: unknown };
    const data = result?.data as number[][] | undefined;
    if (Array.isArray(data) && Array.isArray(data[0])) return data[0] as number[];
    return null;
  } catch {
    return null;
  }
}

/**
 * Tenant-scoped retrieval: vector query filtered by organization + env,
 * then joined to linked AND ready sources. Returns context items with
 * chunk text from D1 (vectors carry ids only).
 */
export async function retrieveTenantContext(args: {
  db: ChatDatabase;
  bindings: TenantBindings;
  organizationId: string;
  chatbotId: string;
  query: string;
  topK: number;
}): Promise<TenantContextItem[]> {
  const { db, bindings, organizationId, chatbotId, query, topK } = args;
  if (!bindings.AI || !bindings.VECTORIZE_SAAS) return [];
  const trimmed = query.trim().slice(0, 500);
  if (trimmed.length < 2) return [];
  const vector = await embedQuery(bindings.AI, trimmed);
  if (!vector) {
    logger.info("tenant retrieval: embedding failed", { context: "tenant-chat" });
    return [];
  }

  let matches: { id: string; metadata?: Record<string, unknown> }[] = [];
  try {
    const res = await bindings.VECTORIZE_SAAS.query(vector, {
      topK,
      returnMetadata: "all",
      filter: { organization_id: organizationId, env: bindings.ENV_NAME },
    });
    matches = res.matches ?? [];
  } catch {
    logger.info("tenant retrieval: vector query failed", { context: "tenant-chat" });
    return [];
  }
  if (matches.length === 0) {
    logger.info("tenant retrieval: no vector matches", { context: "tenant-chat" });
    return [];
  }

  const embeddingIds = [...new Set(matches.map((m) => m.id))];
  const rows = await db
    .select({
      embeddingId: documentChunks.embeddingId,
      text: documentChunks.text,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      sourceId: documents.knowledgeSourceId,
      sourceName: knowledgeSources.name,
      sourceUrl: knowledgeSources.sourceUrl,
      sourceStatus: knowledgeSources.status,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .innerJoin(knowledgeSources, eq(documents.knowledgeSourceId, knowledgeSources.id))
    .where(
      and(
        inArray(documentChunks.embeddingId, embeddingIds),
        eq(documents.organizationId, organizationId),
      ),
    );

  const linked = await db
    .select({ knowledgeSourceId: chatbotKnowledgeSources.knowledgeSourceId })
    .from(chatbotKnowledgeSources)
    .where(eq(chatbotKnowledgeSources.chatbotId, chatbotId));
  const linkedIds = new Set(linked.map((l) => l.knowledgeSourceId));

  const byEmbedding = new Map(rows.map((r) => [r.embeddingId, r]));
  const out: TenantContextItem[] = [];
  for (const m of matches) {
    const row = byEmbedding.get(m.id);
    if (!row) continue;
    if (!linkedIds.has(row.sourceId)) continue;
    if (row.sourceStatus !== "ready") continue;
    out.push({
      title: row.documentName,
      url: row.sourceUrl,
      excerpt: row.text.slice(0, 600),
      sourceId: row.sourceId,
      documentId: row.documentId,
    });
    if (out.length >= topK) break;
  }
  return out;
}

export function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export const SSE_DONE = "data: [DONE]\n\n";
