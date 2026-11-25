/**
 * Seeds the pnet-chat-index Vectorize index from the build-time corpus.
 *
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/seed-chat-index.mjs [--mode compact|full]
 *
 * Modes (embedding candidate text):
 *   compact (default) — title + description only. Asymmetric to short
 *     user queries; the fair-rematch candidate after full-body vectors
 *     underperformed (17/20 vs 19/20 baseline).
 *   full — title + description + body (capped). The original recipe.
 *
 * Idempotent: vector IDs are stable hashes of `type/slug`, so re-running
 * overwrites in place. Record the active mode in docs/PANTALEONE_CHAT.md.
 */
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const INDEX = process.env.CHAT_VECTORIZE_INDEX || "pnet-chat-index";
const EMBED_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
const EMBED_BATCH = 8;
const MODE = process.argv.includes("--mode")
  ? process.argv[process.argv.indexOf("--mode") + 1]
  : "compact";
if (MODE !== "compact" && MODE !== "full") {
  console.error(`Expected --mode compact|full, got "${MODE}"`);
  process.exit(1);
}
const TEXT_CHARS = MODE === "compact" ? 500 : 2000;

if (!ACCOUNT || !TOKEN) {
  console.error(
    "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in the environment.",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(path, options = {}) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}${path}`,
    { ...options, headers },
  );
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(
      `Cloudflare API ${res.status}: ${JSON.stringify(json.errors || json).slice(0, 400)}`,
    );
  }
  return json.result;
}

const corpus = (await import("../lib/chat-corpus.json", { with: { type: "json" } }))
  .default;
const docs = corpus.docs;
console.log(`corpus: ${docs.length} docs, mode: ${MODE}`);

// Vectorize IDs cap at 64 bytes and some slugs approach that alone, so IDs
// are stable FNV-1a hashes of `type/slug`. Human-readable mapping lives in
// metadata ({type, slug, title}), which the query path returns.
function docId(d) {
  let h = 0x811c9dc5;
  const s = `${d.type}/${d.slug}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `d${h.toString(16).padStart(8, "0")}`;
}

const texts = docs.map((d) =>
  `${d.title}\n${d.description}${d.aliases ? `\n${d.aliases.join(", ")}` : ""}${MODE === "full" ? `\n${d.content}` : ""}`.slice(
    0,
    TEXT_CHARS,
  ),
);

// Batch-embed.
const vectors = [];
for (let i = 0; i < texts.length; i += EMBED_BATCH) {
  const batch = texts.slice(i, i + EMBED_BATCH);
  const result = await api(`/ai/run/${EMBED_MODEL}`, {
    method: "POST",
    body: JSON.stringify({ text: batch }),
  });
  if (!Array.isArray(result?.data) || result.data.length !== batch.length) {
    throw new Error(`Unexpected embedding response at offset ${i}`);
  }
  vectors.push(...result.data);
  console.log(`embedded ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}`);
}
console.log(`embedding dim: ${vectors[0]?.length}`);

// Upsert (single batch is fine at this scale; limit is 1000).
const upsert = await api(`/vectorize/v2/indexes/${INDEX}/upsert`, {
  method: "POST",
  body: JSON.stringify({
    vectors: docs.map((d, i) => ({
      id: docId(d),
      values: vectors[i],
      metadata: { type: d.type, slug: d.slug, title: d.title },
    })),
  }),
});
console.log(`upserted: mutation=${upsert?.mutationId} count=${upsert?.count}`);
