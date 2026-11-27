import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";

import {
  chatbotKnowledgeSources,
  chatbots,
  documents,
  knowledgeSources,
} from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb, type ChatDatabase } from "@/lib/db";
import { enqueueIngestJob, makeIngestJob } from "@/lib/ingest/jobs";
import {
  createSourceSchema,
  fileFieldSchema,
} from "@/lib/ingest/sources";
import { INGEST_LIMITS, uploadTypeFor } from "@/lib/ingest/text";
import { logger } from "@/lib/logger";
import { validateOutboundUrl } from "@/lib/security/ssrf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function randomId(): string {
  return crypto.randomUUID();
}

async function resolveIds() {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    CHAT_UPLOADS?: { put(k: string, v: ArrayBuffer, o?: unknown): Promise<unknown> };
    CHAT_INGEST?: { send(m: unknown): Promise<void> };
  };
  const db = getDb(e.CHAT_DB);
  return { env: e, db };
}

async function loadChatbotForUser(db: ChatDatabase, chatbotId: string, userId: string) {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.id, chatbotId))
    .limit(1);
  if (!bot) return { status: 404 as const };
  const membership = await requireOrgMembership(userId, bot.organizationId);
  if (!membership) return { status: 403 as const };
  return { status: 200 as const, bot };
}

async function linkSourceToChatbot(db: ChatDatabase, chatbotId: string, sourceId: string) {
  const existing = await db
    .select()
    .from(chatbotKnowledgeSources)
    .where(
      and(
        eq(chatbotKnowledgeSources.chatbotId, chatbotId),
        eq(chatbotKnowledgeSources.knowledgeSourceId, sourceId),
      ),
    )
    .limit(1);
  if (existing.length === 0) {
    await db.insert(chatbotKnowledgeSources).values({
      id: randomId(),
      chatbotId,
      knowledgeSourceId: sourceId,
    });
  }
}

const dnsResolve = async (host: string): Promise<string[]> => {
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
};

/** List knowledge sources for a chatbot (tenant-scoped). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { id } = await params;
  const { db } = await resolveIds();
  const loaded = await loadChatbotForUser(db, id, session.user.id);
  if (loaded.status !== 200 || !loaded.bot) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Chatbot not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.organizationId, loaded.bot.organizationId));
  return NextResponse.json({ sources }, { headers: NO_STORE });
}

/**
 * Add a knowledge source. JSON body for website/sitemap/faq;
 * multipart form for file uploads. Creates D1 rows, links the source to
 * the chatbot, and enqueues an ingest job (best-effort).
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
  const { env, db } = await resolveIds();
  const loaded = await loadChatbotForUser(db, id, session.user.id);
  if (loaded.status !== 200 || !loaded.bot) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Chatbot not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  const orgId = loaded.bot.organizationId;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      return await createFileSource(request, env, db, id, orgId);
    }
    const body = await request.json();
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400, headers: NO_STORE },
      );
    }
    const input = parsed.data;
    if (input.type === "faq") {
      const sourceId = randomId();
      await db.insert(knowledgeSources).values({
        id: sourceId,
        organizationId: orgId,
        name: input.name?.trim() || "FAQs",
        sourceType: "faq",
        contentJson: JSON.stringify(input.pairs),
        status: "pending",
      });
      await linkSourceToChatbot(db, id, sourceId);
      const job = makeIngestJob({ organizationId: orgId, sourceId, chatbotId: id, type: "faq" });
      const { enqueued } = await enqueueIngestJob(env.CHAT_INGEST, job);
      return NextResponse.json(
        { sourceId, status: "pending", enqueued, pairs: input.pairs.length },
        { status: 201, headers: NO_STORE },
      );
    }
    // website | sitemap: validate reachability surface now (SSRF), crawl later.
    let url: URL;
    try {
      url = await validateOutboundUrl(input.url, dnsResolve);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "URL is not allowed." },
        { status: 400, headers: NO_STORE },
      );
    }
    const sourceId = randomId();
    await db.insert(knowledgeSources).values({
      id: sourceId,
      organizationId: orgId,
      name: input.name?.trim() || url.hostname,
      sourceType: input.type,
      sourceUrl: url.href,
      excludedPathsJson: JSON.stringify(input.excludedPaths ?? []),
      status: "pending",
    });
    await linkSourceToChatbot(db, id, sourceId);
    const job = makeIngestJob({ organizationId: orgId, sourceId, chatbotId: id, type: input.type });
    const { enqueued } = await enqueueIngestJob(env.CHAT_INGEST, job);
    return NextResponse.json(
      { sourceId, status: "pending", enqueued },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    logger.error("Create knowledge source failed", err, { context: "sources-api" });
    return NextResponse.json(
      { error: "Could not create the knowledge source." },
      { status: 500, headers: NO_STORE },
    );
  }
}

async function createFileSource(
  request: Request,
  env: {
    CHAT_UPLOADS?: { put(k: string, v: ArrayBuffer, o?: unknown): Promise<unknown> };
    CHAT_INGEST?: { send(m: unknown): Promise<void> };
  },
  db: ChatDatabase,
  chatbotId: string,
  orgId: string,
) {
  const form = await request.formData();
  const fields = fileFieldSchema().safeParse({
    type: form.get("type"),
    name: form.get("name") ?? undefined,
  });
  if (!fields.success) {
    return NextResponse.json(
      { error: "Multipart upload requires type=file." },
      { status: 400, headers: NO_STORE },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file attached." }, { status: 400, headers: NO_STORE });
  }
  const kind = uploadTypeFor(file.name, file.type);
  if (!kind) {
    return NextResponse.json(
      { error: "Only PDF, TXT, MD, and CSV uploads are supported." },
      { status: 400, headers: NO_STORE },
    );
  }
  if (file.size > INGEST_LIMITS.maxUploadBytes || file.size === 0) {
    return NextResponse.json(
      { error: `Files must be between 1 byte and 10 MB.` },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!env.CHAT_UPLOADS) {
    return NextResponse.json(
      { error: "Upload storage is not configured." },
      { status: 500, headers: NO_STORE },
    );
  }
  const sourceId = randomId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = `org/${orgId}/source/${sourceId}/${safeName}`;
  await env.CHAT_UPLOADS.put(storageKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  const displayName = fields.data.name?.trim() || file.name;
  await db.insert(knowledgeSources).values({
    id: sourceId,
    organizationId: orgId,
    name: displayName,
    sourceType: "file",
    storageKey,
    status: "pending",
  });
  const documentId = randomId();
  await db.insert(documents).values({
    id: documentId,
    organizationId: orgId,
    knowledgeSourceId: sourceId,
    name: file.name,
    fileType: kind,
    sizeBytes: file.size,
    storageKey,
    status: "pending",
  });
  await linkSourceToChatbot(db, chatbotId, sourceId);
  const job = makeIngestJob({ organizationId: orgId, sourceId, chatbotId, type: "file" });
  const { enqueued } = await enqueueIngestJob(env.CHAT_INGEST, job);
  return NextResponse.json(
    { sourceId, documentId, status: "pending", enqueued },
    { status: 201, headers: NO_STORE },
  );
}
