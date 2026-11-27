/**
 * Pantaleone Chat ingest worker (P3). Plain Cloudflare Worker (not
 * OpenNext): consumes the chat-ingest queue, runs the extraction pipeline,
 * and sweeps stuck jobs on a cron schedule. Shares lib/ingest + drizzle
 * schema with the web worker — same code, separate deployment.
 */
import { and, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { knowledgeSources } from "../../../drizzle/schema";
import * as schema from "../../../drizzle/schema";
import type { IngestJob } from "../../../lib/ingest/jobs";
import { processJob, type IngestEnv } from "./pipeline";

const STUCK_JOB_MS = 30 * 60 * 1000;

export interface Env extends IngestEnv {
  CHAT_INGEST: { send(message: unknown): Promise<void> };
}

function toIngestEnv(env: Env): IngestEnv {
  return {
    CHAT_DB: env.CHAT_DB,
    CHAT_UPLOADS: env.CHAT_UPLOADS,
    VECTORIZE_SAAS: env.VECTORIZE_SAAS,
    AI: env.AI,
    ENV_NAME: env.ENV_NAME,
  };
}

const ingestWorker = {
  async queue(batch: { messages: { body: unknown; ack(): void; retry(): void }[] }, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body as IngestJob;
      if (!job || typeof job.sourceId !== "string" || typeof job.organizationId !== "string") {
        message.ack(); // Poison shape — never redeliver.
        continue;
      }
      try {
        await processJob(toIngestEnv(env), job);
        message.ack();
      } catch (err) {
        // Throw redelivers via the queue retry policy → DLQ after max_retries.
        // Marking the source failed already happened inside processJob.
        throw err;
      }
    }
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    // Sweep: sources stuck in processing past the timeout are reset to
    // pending and re-queued once. The pipeline's idempotency (ready-check
    // + wipe-before-index) makes duplicate runs converge.
    const db = drizzle(env.CHAT_DB, { schema });
    const cutoff = new Date(Date.now() - STUCK_JOB_MS);
    const stuck = await db
      .select({
        id: knowledgeSources.id,
        organizationId: knowledgeSources.organizationId,
        sourceType: knowledgeSources.sourceType,
      })
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.status, "processing"),
          lt(knowledgeSources.updatedAt, cutoff),
        ),
      )
      .limit(25);
    for (const s of stuck) {
      await db
        .update(knowledgeSources)
        .set({ status: "pending", error: null, updatedAt: new Date() })
        .where(eq(knowledgeSources.id, s.id));
      await env.CHAT_INGEST.send({
        jobId: `${s.id}:sweep-${Date.now()}`,
        organizationId: s.organizationId,
        sourceId: s.id,
        type: s.sourceType as IngestJob["type"],
        requestedAt: new Date().toISOString(),
      } satisfies IngestJob);
    }
  },
};

export default ingestWorker;
