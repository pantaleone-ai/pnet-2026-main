/**
 * Builds the static chat corpus: lib/chat-corpus.json.
 *
 * Why a static file: blog/shop bodies are read from disk at request time
 * (fs.readFileSync in the *Source modules). That works on Node/Vercel but
 * returns nothing on the Cloudflare Workers runtime, where chat answers
 * lost all excerpts and content-level ranking. A build-time JSON corpus
 * behaves identically on every runtime with zero request-time I/O.
 *
 * Re-run whenever site content changes:
 *   node scripts/build-chat-corpus.mjs
 * Coverage matches the site search index: blog posts + shop products.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "lib", "chat-corpus.json");
const MAX_CONTENT_CHARS = 6000;

async function mdxFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await mdxFiles(full)));
    else if (e.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

// Editorial topic aliases: human-assigned keywords for docs whose own
// title/description/slug don't contain the words people search for
// (e.g. "The Virtual Company" is the AI-companies post). Surfaced by the
// zero-result mining loop (`npm run chat:analytics`); add entries here
// with evidence, not guesses. Scored like title matches.
const KEYWORD_ALIASES = {
  "ai-companies": ["companies", "company", "AI companies", "virtual company"],
};
const PRODUCT_CATEGORY_SLUGS = {
  Apps: "ai-apps",
  "Ai Workflows": "ai-workflows",
};

async function loadDocs(contentDir, type) {
  const dir = path.join(ROOT, contentDir);
  let files = [];
  try {
    files = await mdxFiles(dir);
  } catch {
    return [];
  }
  const docs = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8");
    const { data, content } = matter(raw);
    if (!data.title) continue;
    const slug = path.basename(file, ".mdx");
    const doc = {
      type,
      slug,
      title: String(data.title),
      description: String(data.description || ""),
      content: content.trim().slice(0, MAX_CONTENT_CHARS),
    };
    const aliases = KEYWORD_ALIASES[slug];
    if (aliases) doc.aliases = aliases;
    if (type === "product" && typeof data.category === "string") {
      doc.category =
        PRODUCT_CATEGORY_SLUGS[data.category] ||
        data.category.toLowerCase().replace(/\s+/g, "-");
    }
    docs.push(doc);
  }
  return docs;
}

const blog = await loadDocs("features/blog/content", "blog");
const shop = await loadDocs("features/shop/content", "product");
const docs = [...blog, ...shop].sort((a, b) =>
  `${a.type}/${a.slug}`.localeCompare(`${b.type}/${b.slug}`),
);

// Skip the write when content is unchanged (ignoring the timestamp) so
// automated runs — e.g. as part of `npm run build` — never dirty the tree.
let unchanged = false;
try {
  const prev = JSON.parse(await fs.readFile(OUT, "utf-8"));
  unchanged =
    Array.isArray(prev.docs) &&
    JSON.stringify(prev.docs) === JSON.stringify(docs);
} catch {
  unchanged = false;
}
if (!unchanged) {
  await fs.writeFile(
    OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), count: docs.length, docs },
      null,
      0,
    ) + "\n",
  );
  console.log(`chat corpus: ${docs.length} docs (${blog.length} blog, ${shop.length} product) -> lib/chat-corpus.json`);
} else {
  console.log(`chat corpus: unchanged (${docs.length} docs), skip write`);
}
