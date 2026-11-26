import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { documentChunks, documents, knowledgeSources } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb, type ChatDatabase } from "@/lib/db";
import { updateSourceSchema } from "@/lib/ingest/sources";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

async function loadSourceForUser(db: ChatDatabase, sourceId: string, userId: string) {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId))
    .limit(1);
  if (!source) return { status: 404 as const };
  const membership = await requireOrgMembership(userId, source.organizationId);
  if (!membership) return { status: 403 as const };
  return { status: 200 as const, source };
}

/** Source detail + its documents (tenant-scoped). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { sourceId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const loaded = await loadSourceForUser(db, sourceId, session.user.id);
  if (loaded.status !== 200 || !loaded.source) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Source not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  const docs = await db
    .select({
      id: documents.id,
      name: documents.name,
      fileType: documents.fileType,
      sizeBytes: documents.sizeBytes,
      status: documents.status,
      error: documents.error,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.knowledgeSourceId, sourceId));
  return NextResponse.json({ source: loaded.source, documents: docs }, { headers: NO_STORE });
}

/** Rename or change page exclusions (re-crawl happens via refresh in P3b). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { sourceId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const loaded = await loadSourceForUser(db, sourceId, session.user.id);
  if (loaded.status !== 200 || !loaded.source) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Source not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = updateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: NO_STORE },
    );
  }
  await db
    .update(knowledgeSources)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.excludedPaths !== undefined
        ? { excludedPathsJson: JSON.stringify(parsed.data.excludedPaths) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(knowledgeSources.id, sourceId));
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

/**
 * Delete a source and its documents/chunks (FK cascades). Vector cleanup
 * is best-effort: embedding ids are removed from the SaaS index when the
 * binding is present; D1 deletion always proceeds.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const { sourceId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const e = env as {
    CHAT_DB?: unknown;
    VECTORIZE_SAAS?: { deleteByIds(ids: string[]): Promise<unknown> };
  };
  const db = getDb(e.CHAT_DB);
  const loaded = await loadSourceForUser(db, sourceId, session.user.id);
  if (loaded.status !== 200 || !loaded.source) {
    return NextResponse.json(
      { error: loaded.status === 404 ? "Source not found." : "Forbidden." },
      { status: loaded.status, headers: NO_STORE },
    );
  }
  // Tenant guard on the vector delete: only ids recorded on this org's
  // own chunks are ever submitted.
  try {
    if (e.VECTORIZE_SAAS) {
      const rows = await db
        .select({ embeddingId: documentChunks.embeddingId })
        .from(documentChunks)
        .innerJoin(documents, eq(documentChunks.documentId, documents.id))
        .where(eq(documents.knowledgeSourceId, sourceId));
      const ids = rows
        .map((r) => r.embeddingId)
        .filter((v): v is string => !!v);
      if (ids.length > 0) {
        await e.VECTORIZE_SAAS.deleteByIds(ids);
      }
    }
  } catch (err) {
    logger.error("Vector cleanup failed for source delete", err, {
      context: "sources-api",
    });
  }
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, sourceId));
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
