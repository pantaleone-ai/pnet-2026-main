/**
 * Offline retrieval grid search. Replicates lib/chat-retrieval.ts scoring
 * over the build-time corpus to tune stopwords / floor quickly, without
 * burning Workers AI calls. The preview eval remains the final gate.
 *
 *   node scripts/chat-grid.mjs
 */
import corpusJson from "../lib/chat-corpus.json" with { type: "json" };

const BASE_STOP = new Set(
  "a,an,and,are,as,at,be,but,by,can,did,do,does,for,from,had,has,have,how,if,in,is,it,its,me,my,of,on,or,our,should,so,that,the,they,this,to,was,we,what,when,where,which,who,why,will,with,you,your".split(","),
);

function lev(a, b) {
  const m = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

// [question, expectedSlug|null(fallback), adversarial?]
const CASES = [
  ["How do I know if my business is ready for AI?", "ai-readiness-assessment-checklist"],
  ["How do I build AI agents with n8n and LangChain?", "building-ai-agent-workflows-n8n-langchain"],
  ["How do I measure ROI on AI agents?", "measuring-ai-agent-roi"],
  ["Can I run AI models privately with Docker?", "private-ai-stack-setup-in-minutes"],
  ["What is llms.txt and why does my site need it?", "llms-txt-for-ai-agent-discovery-and-optimization"],
  ["What is MCP and how do I run an MCP server?", "mcp-ai-server-for-highquality-ai"],
  ["Is there a free Next.js AI starter with authentication?", "free-authentication-nextjs-ai-agent-saas-app-quickstart"],
  ["Prompt playbook for brand-aligned video generation", "veo3-prompt-playbook-json-prompts-for-brand-alignment"],
  ["Claude Sonnet system prompt analysis", "claude-sonnet-4-5-system-prompt-analysis"],
  ["GPT-5 system prompt leak", "gpt5-system-prompt-leak"],
  ["Using local Redis with n8n", "best-practices-for-local-redis-use-with-local-N8N"],
  ["Where is the 100k prompts pack?", "100k-ai-prompts-claude-gpt-gemini-expert-system"],
  ["Open source ways to create synthetic audiences", "best-open-source-ways-to-create-synthetic-audiences"],
  ["Which AI companies should I know about?", "ai-companies"],
  ["How do I activate OAuth providers inside my app?", "activate-top-oauth-providers-inapp"],
  ["Grok 4 system prompt tips and tricks", "grok-4-systep-prompt-analysis-tips-prompting-tricks"],
  ["Claude Code leak agent architecture", "claude-code-leak-agent-architecture"],
  ["Hidden blueprint inside AI system prompts", "aisystem-prompts-hidden-blueprint"],
  ["What are AI agent workflows?", "ai-agent-workflows"],
  ["How do I hire you to build something custom?", null],
  ["Am I ready for AI?", "ai-readiness-assessment-checklist"],
  ["n8n LangChain agent tutorial", "building-ai-agent-workflows-n8n-langchain"],
  ["private LLM stack with Docker", "private-ai-stack-setup-in-minutes"],
  ["MCP server guide", "mcp-ai-server-for-highquality-ai"],
  ["measure AI return on investment", "measuring-ai-agent-roi"],
  ["free Next.js auth boilerplate", "free-authentication-nextjs-ai-agent-saas-app-quickstart"],
  ["veo3 prompts for brand videos", "veo3-prompt-playbook-json-prompts-for-brand-alignment"],
  ["Claude prompt analysis", "claude-sonnet-4-5-system-prompt-analysis"],
  ["Redis for local n8n", "best-practices-for-local-redis-use-with-local-N8N"],
  ["100k prompt bundle", "100k-ai-prompts-claude-gpt-gemini-expert-system"],
  ["AI companies overview", "ai-companies"],
  ["virtual company model", "ai-companies"],
  ["What does the Next.js AI starter app include?", "nextjs-ai-starter-app"],
  ["Is there a tool to compress images?", "imgsquash-tool"],
  ["Migrate my CMS to Next.js", "migratecms-tool"],
  ["QR code generator", "qr-generator-tool"],
  ["n8n workflows bundle", "5000-n8n-workflows-automation-bundle"],
  ["What is ProfitSignals?", "profitsignals-app"],
  ["Tell me about MixPHD", "mixphd-app"],
  ["What is SkillSnap?", "skillsnap-guide"],
  ["How much does a project cost?", null],
  ["Do you offer refunds?", null],
  ["What's the weather in Paris?", null, true],
  ["Who won the 2024 World Series?", null, true],
  ["Write a poem about the sea", null, true],
  ["What is your home address?", null, true],
  ["Give me your phone number", null, true],
];

function search(q, cfg) {
  const stop = new Set([...BASE_STOP, ...(cfg.extraStop || [])]);
  const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  let terms = words.filter((w) => w.length >= 3 && !stop.has(w));
  if (cfg.dropDigits) terms = terms.filter((w) => !/^\d+$/.test(w) || w.length > 4);
  if (terms.length === 0) terms = words;
  const scored = corpusJson.docs
    .map((d) => {
      let s = 0;
      const t = d.title.toLowerCase(), de = d.description.toLowerCase(),
        co = d.content.toLowerCase(), sl = d.slug.toLowerCase();
      for (const w of terms) {
        if (t.includes(w)) s += 10;
        if (sl.includes(w)) s += 8;
        if (de.includes(w)) s += 6;
        if (co.includes(w)) s += 4;
      }
      return { slug: d.slug, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length > 0) return scored.filter((x) => x.s >= (cfg.floor ?? 0)).slice(0, 5).map((x) => x.slug);
  // fuzzy fallback mirrors lib/chat-retrieval.ts (title+slug tokens, len>=4, threshold 2)
  const fw = terms.filter((w) => w.length >= 4);
  const fz = corpusJson.docs
    .map((d) => {
      let s = 0;
      const tt = d.title.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
      const st = d.slug.toLowerCase().split(/[-_/\s]+/).filter((t) => t.length >= 4);
      for (const w of fw) {
        if (tt.some((t) => lev(t, w) <= 2)) s += 5;
        if (st.some((t) => lev(t, w) <= 2)) s += 4;
      }
      return { slug: d.slug, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return fz.filter((x) => x.s >= (cfg.floor ?? 0)).slice(0, 5).map((x) => x.slug);
}

const CONFIGS = {
  "baseline(floor0)": {},
  "floor5": { floor: 5 },
  "floor6": { floor: 6 },
  "floor8": { floor: 8 },
  "stop+about,write,get floor5": { extraStop: ["about", "write", "get"], floor: 5 },
  "stop+about,write,get floor6": { extraStop: ["about", "write", "get"], floor: 6 },
  "stop+about,write,get,know floor6": { extraStop: ["about", "write", "get", "know"], floor: 6 },
  "stop+about,write,get floor6+nodigits": { extraStop: ["about", "write", "get"], floor: 6, dropDigits: true },
};

for (const [name, cfg] of Object.entries(CONFIGS)) {
  let pass = 0, advFail = 0;
  const misses = [];
  for (const [q, expect, adv] of CASES) {
    const hits = search(q, cfg);
    const ok = expect ? hits.includes(expect) : hits.length === 0;
    if (ok) pass++;
    else {
      if (adv) advFail++;
      if (misses.length < 6) misses.push(`${adv ? "[adv]" : ""}${q.slice(0, 42)} -> ${hits[0] || "none"}`);
    }
  }
  console.log(`${name}: ${pass}/${CASES.length} advFail=${advFail}`);
  for (const m of misses) console.log(`    ${m}`);
}
