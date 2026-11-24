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

const NS = namespaceId();
const keys = JSON.parse(
  wrangler("kv", "key", "list", "--namespace-id", NS),
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
    const out = wrangler("kv", "key", "get", key, "--namespace-id", NS);
    return JSON.parse(out);
  } catch {
    return null;
  }
}

let turns = 0;
let zeroResults = 0;
const paths = {};
const models = {};
for (const k of dayKeys) {
  const d = get(k);
  if (!d) continue;
  turns += d.turns || 0;
  zeroResults += d.zeroResults || 0;
  for (const [p, n] of Object.entries(d.paths || {})) paths[p] = (paths[p] || 0) + n;
  for (const [m, n] of Object.entries(d.models || {})) models[m] = (models[m] || 0) + n;
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
console.log(`\nzero-result questions (${questions.length} unique):`);
for (const z of questions.slice(0, 20)) {
  console.log(`  ${z.n}x  ${z.q}`);
}
if (questions.length === 0) {
  console.log("  (none — every turn found sources, or no traffic yet)");
}
