import type { Source } from "@/features/chat/store";

/**
 * Deterministic intents for high-value, low-ambiguity journeys.
 *
 * Retrieval + generation handles the long tail, but three classes of
 * question must never depend on it: greetings (no knowledge needed),
 * catalog browsing (needs complete, ordered links — not top-K excerpts),
 * and hiring/contact + services overviews (the corpus has no services
 * page, so RAG can only fail or hallucinate). These run before retrieval
 * and stream back in the same SSE shape as every other answer.
 *
 * Rules: only absolute https://www.pantaleone.net URLs that exist
 * (verified routes or real corpus slugs). Never invent links here.
 */
export type ChatIntent = {
  id: "greeting" | "explore-products" | "hire" | "services";
  reply: string;
  sources: Source[];
};

const SITE = "https://www.pantaleone.net";

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const GREETING_RE =
  /^(hi+|hey+|hello+|yo|sup|howdy|good\s?(morning|afternoon|evening|day))(\b|$)/;

const HIRE_RE =
  /\b(hire|hiring|freelanc|contractor|work with you|work together|get in touch|contact( you| us)?|talk to (you|someone|a human)|book( a)?( build)? call|schedule( a)? call|start (a )?project|project.{0,20}(discuss|quote|idea|proposal)|discuss.{0,20}project)\b/;

const BROWSE_RE =
  /\b(explore|browse|show|list|see|all|shop|buy|offer|sell|have|got)\b/;
const CATALOG_RE =
  /\b(products?|apps?|tools?|workflows?|catalog(ue)?|shop|store|prompts?|packs?|bundles?)\b/;
// Generic catalog nouns: a whole query made only of these (after dropping
// filler words) is browsing, not searching — "products", "your apps".
// Specific type words (prompt, bundle, saas) stay with retrieval.
const GENERIC_CATALOG = new Set([
  "ai",
  "product",
  "products",
  "app",
  "apps",
  "tool",
  "tools",
  "software",
  "shop",
  "store",
  "catalog",
  "catalogue",
]);
const FILLER = new Set([
  "my",
  "your",
  "the",
  "a",
  "an",
  "me",
  "us",
  "our",
  "all",
  "any",
]);

const SERVICES_RE =
  /\bservices?\b.*\b(what|which|offer|do you do|provide|include)\b|\b(what|which)\b.*\bservices?\b|^services?\??$|what do you do/;

const GREETING_REPLY = `Hey — I'm the Pantaleone assistant. I can help with:

- **Products** — AI apps, tools, and workflow packs in [the shop](${SITE}/shop)
- **Services** — AI automation and workflow builds for your business ([what we do](${SITE}/services))
- **Your project** — tell me what manual work hurts most and I'll point you to [contact](${SITE}/contact)

What's on your mind?`;

const EXPLORE_PRODUCTS_REPLY = `Here's what's in the shop right now:

- **[Next.js AI Starter App](${SITE}/shop/ai-apps/nextjs-ai-starter-app)** — auth, billing, and dashboard wiring so you skip the setup weekend
- **[imgsquash](${SITE}/shop/ai-apps/imgsquash-tool)** — image compression API for pipelines and uploads
- **[100k AI Prompts Pack](${SITE}/shop/ai-workflows/100k-ai-prompts-pack)** — production-tested prompt library
- **[MigrateCMS](${SITE}/shop/ai-apps/migratecms-tool)** — move any CMS to Next.js without the rewrite pain

Browse everything at [pantaleone.net/shop](${SITE}/shop), or ask me about a specific product.`;

const HIRE_REPLY = `Happy to help with that. The fastest path is a short intro through [the contact page](${SITE}/contact) — include:

- What manual work hurts the most right now
- Which systems it touches (CRM, inbox, sheets, custom tools)
- What "done" looks like for you

That usually turns into a 90-minute workflow walkthrough first, then a fixed-scope build. Details on process and pricing are on the [services page](${SITE}/services).`;

const SERVICES_REPLY = `We build AI systems that remove expensive manual work:

- **AI automation & workflow builds** — n8n or LangChain against your real APIs, tested with runbooks ([services](${SITE}/services))
- **AI readiness audits** — a walkthrough that tells you what to automate first (and what not to build)
- **B2B engagements** — ongoing automation work for teams ([B2B](${SITE}/b2b))

Start with [the contact page](${SITE}/contact) — mention the workflow you want gone.`;

export function matchIntent(message: string): ChatIntent | null {
  const q = normalize(message);
  if (!q) return null;

  if (GREETING_RE.test(q) && q.split(" ").length <= 4) {
    return { id: "greeting", reply: GREETING_REPLY, sources: [] };
  }
  if (HIRE_RE.test(q)) {
    return {
      id: "hire",
      reply: HIRE_REPLY,
      sources: [{ title: "Contact", type: "page", url: `${SITE}/contact` }],
    };
  }
  const words = q.split(" ").filter((w) => w && !FILLER.has(w));
  const isBareCatalogBrowse =
    words.length > 0 &&
    words.length <= 2 &&
    words.every((w) => GENERIC_CATALOG.has(w));
  if ((BROWSE_RE.test(q) && CATALOG_RE.test(q)) || isBareCatalogBrowse) {
    return {
      id: "explore-products",
      reply: EXPLORE_PRODUCTS_REPLY,
      sources: [
        { title: "Shop", type: "page", url: `${SITE}/shop` },
        {
          title: "Next.js AI Starter App",
          type: "product",
          url: `${SITE}/shop/ai-apps/nextjs-ai-starter-app`,
        },
        {
          title: "imgsquash",
          type: "product",
          url: `${SITE}/shop/ai-apps/imgsquash-tool`,
        },
      ],
    };
  }
  if (SERVICES_RE.test(q)) {
    return {
      id: "services",
      reply: SERVICES_REPLY,
      sources: [
        { title: "Services", type: "page", url: `${SITE}/services` },
        { title: "B2B Solutions", type: "page", url: `${SITE}/b2b` },
      ],
    };
  }
  return null;
}
