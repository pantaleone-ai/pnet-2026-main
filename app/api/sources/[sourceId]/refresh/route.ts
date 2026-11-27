import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { knowledgeSources } from "@/drizzle/schema";
import { getSession, requireOrgMembership } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { enqueueIngestJob, makeIngestJob, type IngestJobType } from "@/lib/ingest/jobs";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Re-ingest a source: reset to pending and enqueue a fresh job. The
 * pipeline wipes prior docs/chunks/vectors first, so refreshes converge
 * instead of duplicating. Only pending/ready/failed sources refresh —
 * processing sources are left to the worker + sweep.
 */
export async function POST(
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
    CHAT_INGEST?: { send(m: unknown): Promise<void> };
  };
  const db = getDb(e.CHAT_DB);
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId))
    .limit(1);
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404, headers: NO_STORE });
  }
  const membership = await requireOrgMembership(session.user.id, source.organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE });
  }
  if (source.status === "processing") {
    return NextResponse.json(
      { error: "This source is already being indexed. Try again in a few minutes." },
      { status: 409, headers: NO_STORE },
    );
  }
  try {
    await db
      .update(knowledgeSources)
      .set({ status: "pending", error: null, updatedAt: new Date() })
      .where(eq(knowledgeSources.id, sourceId));
    const job = makeIngestJob({
      organizationId: source.organizationId,
      sourceId,
      type: source.sourceType as IngestJobType,
    });
    const { enqueued } = await enqueueIngestJob(e.CHAT_INGEST, job);
    return NextResponse.json({ sourceId, status: "pending", enqueued }, { headers: NO_STORE });
  } catch (err) {
    logger.error("Refresh source failed", err, { context: "sources-api" });
    return NextResponse.json(
      { error: "Could not refresh the source." },
      { status: 500, headers: NO_STORE },
    );
  }
}
