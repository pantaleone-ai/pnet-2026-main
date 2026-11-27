/**
 * Ingest queue contract (P3). The API worker produces; `workers/ingest/`
 * consumes. One message per source creation/refresh — the worker re-reads
 * D1 for current state, so messages stay small and idempotent: a source
 * already `ready` (or newer than the message) is a no-op.
 */

export type IngestJobType = "website" | "sitemap" | "file" | "faq";

export interface IngestJob {
  /** Idempotency key: `${sourceId}:${requestedAt}`. */
  jobId: string;
  organizationId: string;
  sourceId: string;
  chatbotId?: string;
  type: IngestJobType;
  requestedAt: string;
}

export function makeIngestJob(args: {
  organizationId: string;
  sourceId: string;
  chatbotId?: string;
  type: IngestJobType;
}): IngestJob {
  const requestedAt = new Date().toISOString();
  return {
    jobId: `${args.sourceId}:${requestedAt}`,
    organizationId: args.organizationId,
    sourceId: args.sourceId,
    ...(args.chatbotId ? { chatbotId: args.chatbotId } : {}),
    type: args.type,
    requestedAt,
  };
}

export interface QueueLike {
  send(message: unknown): Promise<void>;
}

/** Best-effort enqueue — ingestion is async; API success must not depend on it. */
export async function enqueueIngestJob(
  queue: QueueLike | undefined,
  job: IngestJob,
): Promise<{ enqueued: boolean }> {
  if (!queue) return { enqueued: false };
  await queue.send(job);
  return { enqueued: true };
}
