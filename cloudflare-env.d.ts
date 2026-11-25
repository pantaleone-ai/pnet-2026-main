// Minimal Cloudflare environment declarations for this project.
//
// NOTE: do NOT replace this file with `wrangler types` output. The generated
// file redeclares global fetch types (Body.json<T>()) which changes
// Response.json() from Promise<any> to Promise<unknown> repo-wide and breaks
// type checking in unrelated files. Declare only the bindings consumed here;
// extend explicitly if more are ever needed.

interface CloudflareAI {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

interface CloudflareVectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

interface CloudflareVectorize {
  query(
    vector: number[],
    options?: {
      topK?: number;
      returnMetadata?: "none" | "indexed" | "all";
    },
  ): Promise<{ matches: CloudflareVectorizeMatch[]; count: number }>;
}

interface CloudflareKV {
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  get(key: string): Promise<string | null>;
}

interface CloudflareEnv {
  AI?: CloudflareAI;
  VECTORIZE?: CloudflareVectorize;
  CHAT_ANALYTICS?: CloudflareKV;
  CHAT_DB?: import("@cloudflare/workers-types").D1Database;
  CHAT_UPLOADS?: import("@cloudflare/workers-types").R2Bucket;
  CHAT_PLATFORM?: import("@cloudflare/workers-types").KVNamespace;
  CHAT_INGEST?: import("@cloudflare/workers-types").Queue;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}
