/**
 * Pantaleone Chat retrieval eval (Stage 1).
 *
 * Hits the real POST /api/chat route and asserts the expected source slug
 * appears in the streamed `sources` event (or expected text for the
 * no-results case). Works against the extractive fallback — no model key
 * required — so it measures retrieval quality independent of generation.
 *
 * Usage:
 *   npm run dev                      # terminal 1 (port 1408)
 *   node scripts/chat-eval.mjs       # terminal 2 (defaults to http://localhost:1408)
 *   node scripts/chat-eval.mjs https://<preview-host>
 *
 * Exit code is non-zero when the citation hit rate drops below THRESHOLD.
 * Keep this green before changing retrieval; it is the migration gate for
 * any future Vectorize cutover (Stage 2).
 */
const BASE = process.argv[2] || "http://localhost:1408";
const THRESHOLD = 0.8;

const CASES = [
  { q: "How do I know if my business is ready for AI?", expect: "ai-readiness-assessment-checklist" },
  { q: "How do I build AI agents with n8n and LangChain?", expect: "building-ai-agent-workflows-n8n-langchain" },
  { q: "How do I measure ROI on AI agents?", expect: "measuring-ai-agent-roi" },
  { q: "Can I run AI models privately with Docker?", expect: "private-ai-stack-setup-in-minutes" },
  { q: "What is llms.txt and why does my site need it?", expect: "llms-txt-for-ai-agent-discovery-and-optimization" },
  { q: "What is MCP and how do I run an MCP server?", expect: "mcp-ai-server-for-highquality-ai" },
  { q: "Is there a free Next.js AI starter with authentication?", expect: "free-authentication-nextjs-ai-agent-saas-app-quickstart" },
  { q: "Prompt playbook for brand-aligned video generation", expect: "veo3-prompt-playbook-json-prompts-for-brand-alignment" },
  { q: "Claude Sonnet system prompt analysis", expect: "claude-sonnet-4-5-system-prompt-analysis" },
  { q: "GPT-5 system prompt leak", expect: "gpt5-system-prompt-leak" },
  { q: "Using local Redis with n8n", expect: "best-practices-for-local-redis-use-with-local-N8N" },
  { q: "Where is the 100k prompts pack?", expect: "100k-ai-prompts-claude-gpt-gemini-expert-system" },
  { q: "Open source ways to create synthetic audiences", expect: "best-open-source-ways-to-create-synthetic-audiences" },
  { q: "Which AI companies should I know about?", expect: "ai-companies" },
  { q: "How do I activate OAuth providers inside my app?", expect: "activate-top-oauth-providers-inapp" },
  { q: "Grok 4 system prompt tips and tricks", expect: "grok-4-systep-prompt-analysis-tips-prompting-tricks" },
  { q: "Claude Code leak agent architecture", expect: "claude-code-leak-agent-architecture" },
  { q: "Hidden blueprint inside AI system prompts", expect: "aisystem-prompts-hidden-blueprint" },
  { q: "What are AI agent workflows?", expect: "ai-agent-workflows" },
  {
    q: "How do I hire you to build something custom?",
    expectText: "contact",
    note: "no-results case: must say so and point to contact",
  },
];

async function runCase({ q, expect, expectText }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: q }),
  });
  if (!res.ok || !res.body) return { pass: false, detail: `HTTP ${res.status}` };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sources = [];
  let text = "";
  // Sources arrive in the first SSE event, before any generation tokens.
  // Stop reading as soon as we have them: retrieval is what this eval
  // measures, and it avoids paying for 20 full generations per run.
  // (expectText cases keep reading until the text matches or the stream
  // ends, capped — the fallback message arrives as deltas.)
  let haveSources = false;
  let chunks = 0;
  try {
    outer: for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (++chunks > 60) break;
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        for (const line of event.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.sources) {
              sources = json.sources;
              haveSources = true;
            }
            if (json.delta) text += json.delta;
          } catch {
            // ignore
          }
          if (haveSources && !expectText) break outer;
          if (expectText && text.toLowerCase().includes(expectText)) {
            break outer;
          }
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // already closed
    }
  }
  if (expectText) {
    const pass = text.toLowerCase().includes(expectText);
    return { pass, detail: pass ? "fallback + contact pointer" : `missing "${expectText}"` };
  }
  const pass = sources.some((s) => (s.url || "").includes(expect));
  return {
    pass,
    detail: pass
      ? sources.map((s) => s.url.split("/").pop()).join(", ")
      : `expected ${expect}; got ${sources.map((s) => (s.url || "").split("/").pop()).join(", ") || "none"}`,
  };
}

let passed = 0;
for (const c of CASES) {
  let result;
  try {
    result = await runCase(c);
  } catch (err) {
    result = { pass: false, detail: String(err?.message || err) };
  }
  if (result.pass) passed += 1;
  console.log(`${result.pass ? "PASS" : "FAIL"}  ${c.q}\n      -> ${result.detail}`);
}

const rate = passed / CASES.length;
console.log(`\n${passed}/${CASES.length} citation hits (${Math.round(rate * 100)}%, threshold ${Math.round(THRESHOLD * 100)}%)`);
if (rate < THRESHOLD) {
  console.error("Eval below threshold.");
  process.exit(1);
}
