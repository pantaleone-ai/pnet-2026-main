/**
 * Chat analytics report — reads the CHAT_ANALYTICS KV namespace written by
 * POST /api/chat (day aggregates + zero-result query capture).
 *
 *   node scripts/chat-analytics.mjs            # last 14 days
 *   node scripts/chat-analytics.mjs --days 30  # last 30 days
 *
 * Uses the wrangler CLI (same auth as deploys). Namespace defaults to the
 * id in wrangler.jsonc; override with CHAT_KV_NAMESPACE_ID.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import corpusJson from "../lib/chat-corpus.json" with { type: "json" };

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const DAYS = daysIdx >= 0 ? Number(args[daysIdx + 1]) || 14 : 14;

function namespaceId() {
  if (process.env.CHAT_KV_NAMESPACE_ID) return process.env.CHAT_KV_NAMESPACE_ID;
  // wrangler.jsonc has comments — strip them before parsing.
  const raw = readFileSync("wrangler.jsonc", "utf-8").replace(
    /\/\/.*$/gm,
    "",
  );
  const config = JSON.parse(raw);
  const ns = (config.kv_namespaces || []).find(
    (n) => n.binding === "CHAT_ANALYTICS",
  );
  if (!ns) throw new Error("CHAT_ANALYTICS namespace not in wrangler.jsonc");
  return ns.id;
}

function wrangler(...a) {
  return execFileSync("npx", ["wrangler", ...a], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// NOTE: wrangler kv commands default to LOCAL dev storage. Analytics must
// read the production namespace, hence --remote on every command.
const REMOTE = ["--remote"];

const NS = namespaceId();
const keys = JSON.parse(
  wrangler("kv", "key", "list", "--namespace-id", NS, ...REMOTE),
).map((k) => k.name);

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - DAYS);
const cutoffDay = cutoff.toISOString().slice(0, 10);

const dayKeys = keys
  .filter((k) => k.startsWith("day:") && k.slice(4) >= cutoffDay)
  .sort();
const zeroKeys = keys.filter(
  (k) => k.startsWith("zero:") && k.slice(5, 15) >= cutoffDay,
);

function get(key) {
  try {
    const out = wrangler(
      "kv",
      "key",
      "get",
      key,
      "--namespace-id",
      NS,
      ...REMOTE,
    );
    return JSON.parse(out);
  } catch {
    return null;
  }
}

let turns = 0;
let zeroResults = 0;
const paths = {};
const models = {};
const via = {};
const depth = {};
for (const k of dayKeys) {
  const d = get(k);
  if (!d) continue;
  turns += d.turns || 0;
  zeroResults += d.zeroResults || 0;
  for (const [p, n] of Object.entries(d.paths || {})) paths[p] = (paths[p] || 0) + n;
  for (const [m, n] of Object.entries(d.models || {})) models[m] = (models[m] || 0) + n;
  for (const [v, n] of Object.entries(d.via || {})) via[v] = (via[v] || 0) + n;
  for (const [t, n] of Object.entries(d.depth || {})) depth[t] = (depth[t] || 0) + n;
}

const questions = [];
for (const k of zeroKeys) {
  const z = get(k);
  if (z?.q) questions.push(z);
}
questions.sort((a, b) => b.n - a.n);

console.log(`\nPantaleone Chat — last ${DAYS}d`);
console.log(`turns: ${turns}   zero-result turns: ${zeroResults}`);
console.log("paths:", JSON.stringify(paths));
console.log("models:", JSON.stringify(models));
console.log("via (suggestion vs typed vs retry):", JSON.stringify(via));
console.log("depth (first vs followup vs deep):", JSON.stringify(depth));

// Coverage hints: zero-result queries that share a real token with an
// existing doc are probably vocabulary mismatches, not content gaps —
// candidates for corpus keywords or an alias, not new pages.
const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did",
  "do", "does", "for", "from", "had", "has", "have", "how", "if", "in",
  "is", "it", "its", "me", "my", "of", "on", "or", "our", "should",
  "so", "that", "the", "they", "this", "to", "was", "we", "what",
  "when", "where", "which", "who", "why", "will", "with", "you", "your",
]);
function hintsFor(q) {
  const tokens = new Set(
    q.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)),
  );
  const hits = [];
  for (const d of corpusJson.docs) {
    const hay = `${d.title} ${d.slug}`.toLowerCase();
    let s = 0;
    for (const t of tokens) if (hay.includes(t)) s++;
    if (s > 0) hits.push({ slug: `${d.type}/${d.slug}`, s });
  }
  return hits.sort((a, b) => b.s - a.s).slice(0, 3).map((h) => h.slug);
}

console.log(`\nzero-result questions (${questions.length} unique):`);
for (const z of questions.slice(0, 20)) {
  console.log(`  ${z.n}x  ${z.q}`);
  const hints = hintsFor(z.q);
  if (hints.length > 0) {
    console.log(`       possibly covered by: ${hints.join(", ")}`);
  } else {
    console.log(`       genuine gap candidate — consider new content or alias`);
  }
}
if (questions.length === 0) {
  console.log("  (none — every turn found sources, or no traffic yet)");
}
