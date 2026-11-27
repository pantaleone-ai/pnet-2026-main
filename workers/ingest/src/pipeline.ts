/**
 * Ingest pipeline: one queue job → extracted, chunked, embedded, indexed.
 * Refresh-safe: re-running a source wipes its prior documents, chunks, and
 * vectors first, so retries and refreshes converge instead of duplicating.
 */
import { eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type {
  D1Database,
  R2Bucket,
  VectorizeIndex,
} from "@cloudflare/workers-types";

import {
  chatbotKnowledgeSources,
  documentChunks,
  documents,
  knowledgeSources,
} from "../../../drizzle/schema";
import * as schema from "../../../drizzle/schema";
import type { IngestJob } from "../../../lib/ingest/jobs";
import { chunkText, extractReadableText, INGEST_LIMITS } from "../../../lib/ingest/text";
import {
  isRobotsAllowed,
  parseRobotsTxt,
  parseSitemapXml,
  sitemapCandidates,
} from "../../../lib/ingest/crawl";
import { crawlSite, fetchText } from "./fetching";
import { extractFileText } from "./extract";

export interface IngestEnv {
  CHAT_DB: D1Database;
  CHAT_UPLOADS: R2Bucket;
  VECTORIZE_SAAS: VectorizeIndex;
  AI: { run(model: string, input: unknown): Promise<unknown> };
  ENV_NAME: string;
}

const EMBED_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
const EMBED_BATCH = 50;

type Db = DrizzleD1Database<typeof schema>;

function randomId(): string {
  return crypto.randomUUID();
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ExtractedDoc {
  name: string;
  text: string;
  fileType: string;
  sizeBytes: number;
}

async function embedTexts(ai: IngestEnv["AI"], texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const result = (await ai.run(EMBED_MODEL, { text: batch })) as {
      data?: unknown;
    };
    if (!Array.isArray(result?.data) || result.data.length !== batch.length) {
      throw new Error(`Embedding batch failed at offset ${i}`);
    }
    for (const vec of result.data) {
      if (!Array.isArray(vec) || !vec.every((n) => typeof n === "number")) {
        throw new Error(`Invalid embedding vector at offset ${out.length}`);
      }
      out.push(vec as number[]);
    }
  }
  return out;
}

async function wipeSource(db: Db, env: IngestEnv, sourceId: string): Promise<void> {
  const rows = await db
    .select({ embeddingId: documentChunks.embeddingId })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(eq(documents.knowledgeSourceId, sourceId));
  const ids = rows.map((r) => r.embeddingId).filter((v): v is string => !!v);
  if (ids.length > 0) {
    try {
      await env.VECTORIZE_SAAS.deleteByIds(ids);
    } catch {
      // Vector cleanup is best-effort; D1 is the source of truth and the
      // query path filters by source_id, so orphans are unreachable.
    }
  }
  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.knowledgeSourceId, sourceId));
  for (const d of docs) {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, d.id));
  }
  await db.delete(documents).where(eq(documents.knowledgeSourceId, sourceId));
}

async function extractWebsite(args: {
  entry: URL;
  excludedPaths: string[];
}): Promise<ExtractedDoc[]> {
  const { entry, excludedPaths } = args;
  // Robots first (miss = allow all).
  let rules = { disallowed: [] as string[] };
  try {
    const robots = await fetchText(new URL("/robots.txt", entry.origin).href, 100_000);
    if (robots) rules = parseRobotsTxt(robots);
  } catch { /* allow all */ }
  const isAllowed = (pathname: string) => isRobotsAllowed(pathname, rules);

  // Sitemap seeds (website type tries sitemap.xml, then index variant).
  const seeds: string[] = [];
  for (const candidate of sitemapCandidates(entry)) {
    try {
      const xml = await fetchText(candidate, 1_000_000);
      if (!xml) continue;
      const { urls, nested } = parseSitemapXml(xml);
      seeds.push(...urls.slice(0, INGEST_LIMITS.maxPagesPerSource));
      for (const n of nested.slice(0, 10)) {
        const nestedXml = await fetchText(n, 1_000_000);
        if (nestedXml) seeds.push(...parseSitemapXml(nestedXml).urls.slice(0, 50));
      }
      if (seeds.length > 0) break;
    } catch { /* try next candidate */ }
  }

  // Sitemap-declared type: crawl ONLY listed URLs (bounded).
  const { pages } = await crawlSite({
    entry,
    seeds,
    isAllowedByRobots: isAllowed,
    excludedPaths,
    maxPages: INGEST_LIMITS.maxPagesPerSource,
    maxDepth: INGEST_LIMITS.maxDepth,
    maxBytesPerPage: INGEST_LIMITS.maxBytesPerPage,
    concurrency: INGEST_LIMITS.concurrency,
  });
  const docs: ExtractedDoc[] = [];
  const seenHashes = new Set<string>();
  for (const page of pages) {
    const text = extractReadableText(page.html);
    if (!text || text.length < 50) continue;
    const hash = await sha256Hex(text);
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    docs.push({
      name: page.url,
      text,
      fileType: "html",
      sizeBytes: text.length,
    });
  }
  return docs;
}

export async function processJob(env: IngestEnv, job: IngestJob): Promise<void> {
  const db = drizzle(env.CHAT_DB, { schema }) as Db;
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, job.sourceId))
    .limit(1);
  if (!source) return; // Source deleted after enqueue — nothing to do.
  if (source.organizationId !== job.organizationId) {
    throw new Error("Job organization does not match source organization.");
  }
  // Idempotency: a newer successful index beats this stale job.
  if (
    source.status === "ready" &&
    source.lastIndexedAt &&
    new Date(job.requestedAt) < source.lastIndexedAt
  ) {
    return;
  }

  await db
    .update(knowledgeSources)
    .set({ status: "processing", error: null, updatedAt: new Date() })
    .where(eq(knowledgeSources.id, source.id));

  try {
    await wipeSource(db, env, source.id);

    let docs: ExtractedDoc[] = [];
    if (source.sourceType === "faq") {
      const pairs = JSON.parse(source.contentJson ?? "[]") as {
        question?: string;
        answer?: string;
      }[];
      const text = pairs
        .filter((p) => p.question && p.answer)
        .map((p) => `Q: ${p.question}\nA: ${p.answer}`)
        .join("\n\n");
      if (!text) throw new Error("FAQ source has no usable pairs.");
      docs = [{ name: source.name, text, fileType: "faq", sizeBytes: text.length }];
    } else if (source.sourceType === "file") {
      if (!source.storageKey) throw new Error("File source has no stored object.");
      const obj = await env.CHAT_UPLOADS.get(source.storageKey);
      if (!obj) throw new Error("Uploaded file is missing from storage.");
      const bytes = new Uint8Array(await obj.arrayBuffer());
      if (bytes.length > INGEST_LIMITS.maxUploadBytes) {
        throw new Error("Uploaded file exceeds the size cap.");
      }
      const [docRow] = await db
        .select()
        .from(documents)
        .where(eq(documents.knowledgeSourceId, source.id))
        .limit(1);
      const fileType = docRow?.fileType ?? "txt";
      const text = await extractFileText(bytes, fileType);
      if (!text) throw new Error(`Could not extract text from this ${fileType.toUpperCase()} file.`);
      docs = [{ name: docRow?.name ?? source.name, text, fileType, sizeBytes: bytes.length }];
      // The placeholder document row from upload is replaced below.
      await db.delete(documents).where(eq(documents.knowledgeSourceId, source.id));
    } else {
      // website | sitemap
      if (!source.sourceUrl) throw new Error("Source has no URL.");
      const entry = new URL(source.sourceUrl);
      const excluded: string[] = JSON.parse(source.excludedPathsJson ?? "[]");
      if (source.sourceType === "sitemap") {
        const xml = await fetchText(entry.href, 5_000_000);
        if (!xml) throw new Error("Could not fetch the sitemap.");
        const { urls, nested } = parseSitemapXml(xml);
        const seeds = [...urls];
        for (const n of nested.slice(0, 20)) {
          try {
            const nestedXml = await fetchText(n, 5_000_000);
            if (nestedXml) seeds.push(...parseSitemapXml(nestedXml).urls);
          } catch { /* skip bad nested sitemap */ }
        }
        const robots = await fetchText(new URL("/robots.txt", entry.origin).href, 100_000);
        const rules = robots ? parseRobotsTxt(robots) : { disallowed: [] as string[] };
        const { pages } = await crawlSite({
          entry,
          seeds: seeds.slice(0, INGEST_LIMITS.maxPagesPerSource),
          isAllowedByRobots: (p) => isRobotsAllowed(p, rules),
          excludedPaths: excluded,
          maxPages: INGEST_LIMITS.maxPagesPerSource,
          maxDepth: 0,
          maxBytesPerPage: INGEST_LIMITS.maxBytesPerPage,
          concurrency: INGEST_LIMITS.concurrency,
        });
        docs = await pagesToDocs(pages);
      } else {
        docs = await extractWebsite({ entry, excludedPaths: excluded });
      }
    }

    if (docs.length === 0) throw new Error("No indexable content found.");

    // Chunk, embed, index.
    const chatbotLinks = await db
      .select({ chatbotId: chatbotKnowledgeSources.chatbotId })
      .from(chatbotKnowledgeSources)
      .where(eq(chatbotKnowledgeSources.knowledgeSourceId, source.id));
    const primaryChatbotId = chatbotLinks[0]?.chatbotId ?? job.chatbotId ?? "";

    const chunkRecords: { documentId: string; index: number; text: string }[] = [];
    for (const doc of docs.slice(0, INGEST_LIMITS.maxPagesPerSource)) {
      const [docRow] = await db
        .insert(documents)
        .values({
          id: randomId(),
          organizationId: source.organizationId,
          knowledgeSourceId: source.id,
          name: doc.name.slice(0, 300),
          fileType: doc.fileType,
          sizeBytes: doc.sizeBytes,
          status: "ready",
        })
        .returning({ id: documents.id });
      if (!docRow) continue;
      const chunks = chunkText(doc.text);
      chunks.forEach((text, index) => {
        chunkRecords.push({ documentId: docRow.id, index, text });
      });
    }
    if (chunkRecords.length === 0) throw new Error("Content produced no chunks.");

    const vectors = await embedTexts(env.AI, chunkRecords.map((c) => c.text));
    const pairs = chunkRecords.map((c, i) => ({
      id: randomId(),
      vector: vectors[i] as number[],
      record: c,
    }));
    await env.VECTORIZE_SAAS.upsert(
      pairs.map((p) => ({
        id: p.id,
        values: p.vector,
        metadata: {
          organization_id: source.organizationId,
          chatbot_id: primaryChatbotId,
          source_id: source.id,
          document_id: p.record.documentId,
          env: env.ENV_NAME,
        },
      })),
    );
    for (const p of pairs) {
      await db.insert(documentChunks).values({
        id: randomId(),
        documentId: p.record.documentId,
        chunkIndex: p.record.index,
        text: p.record.text,
        embeddingId: p.id,
      });
    }

    await db
      .update(knowledgeSources)
      .set({
        status: "ready",
        pageCount: docs.length,
        error: null,
        lastIndexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeSources.id, source.id));
    const docIds = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.knowledgeSourceId, source.id));
    for (const d of docIds) {
      await db.update(documents).set({ status: "ready" }).where(eq(documents.id, d.id));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed.";
    await db
      .update(knowledgeSources)
      .set({ status: "failed", error: message.slice(0, 500), updatedAt: new Date() })
      .where(eq(knowledgeSources.id, source.id));
    throw err; // Let the queue retry / DLQ handle redelivery.
  }
}

async function pagesToDocs(pages: { url: string; html: string }[]): Promise<ExtractedDoc[]> {
  const docs: ExtractedDoc[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const text = extractReadableText(page.html);
    if (!text || text.length < 50) continue;
    const hash = await sha256Hex(text);
    if (seen.has(hash)) continue;
    seen.add(hash);
    docs.push({ name: page.url, text, fileType: "html", sizeBytes: text.length });
  }
  return docs;
}
