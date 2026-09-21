// Model abstraction: AIProvider with generate() / generateStructured() / embed().
// Uses existing AI stack (OPENAI_API_KEY / OPENROUTER_API_KEY / OPENAI_BASE_URL,
// EVAL_MODEL). Falls back to deterministic local synthesis when no keys are set,
// so tests and demo run without credentials. Small models for extraction/QA,
// stronger models for strategy/generation — routed via latency_tier hint.
export interface GenerateOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  latencyTier?: "fast" | "reasoning" | "turbo";
  json?: boolean;
}

export interface AIProvider {
  name: string;
  generate(
    opts: GenerateOptions,
  ): Promise<{ text: string; tokensUsed: number; model: string }>;
  generateStructured<T>(opts: GenerateOptions): Promise<T>;
  embed(text: string): Promise<number[]>;
  trackUsage(tokens: number, model: string): void;
  usage(): { tokens: number; estimatedCostUsd: number };
}

const PRICE_PER_1K: Record<string, number> = {
  "gpt-4o-mini": 0.00015,
  "gpt-4o": 0.005,
  default: 0.0002,
};

function deterministicText(
  system: string | undefined,
  prompt: string,
  maxTokens: number,
): string {
  // Deterministic, specific, non-generic synthesis from prompt context.
  const key = `${system ?? ""}\n${prompt}`.slice(0, 1200);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `draft-${(h % 100000).toString(36)}::${key
    .slice(0, Math.min(400, maxTokens * 2))
    .replace(/\s+/g, " ")
    .trim()}`;
}

export function createAIProvider(): AIProvider {
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const apiKey =
    process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "";
  const strongModel =
    process.env.AI_MODEL ?? process.env.EVAL_MODEL ?? "openai/gpt-4o-mini";
  let tokens = 0;
  let cost = 0;
  const trackUsage = (t: number, model: string): void => {
    tokens += t;
    const price = PRICE_PER_1K[model] ?? PRICE_PER_1K.default ?? 0.0002;
    cost += (t / 1000) * price;
  };
  const generate = async (
    opts: GenerateOptions,
  ): Promise<{ text: string; tokensUsed: number; model: string }> => {
    const maxTokens = opts.maxTokens ?? 800;
    const model =
      opts.latencyTier === "reasoning"
        ? strongModel
        : (process.env.AI_FAST_MODEL ?? "gpt-4o-mini");
    if (!apiKey) {
      const text = deterministicText(opts.system, opts.prompt, maxTokens);
      trackUsage(Math.ceil(text.length / 4), model);
      return { text, tokensUsed: Math.ceil(text.length / 4), model };
    }
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: opts.temperature ?? 0.4,
        response_format: opts.json ? { type: "json_object" } : undefined,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI provider error: ${res.status}`);
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const used = json.usage?.total_tokens ?? Math.ceil(text.length / 4);
    trackUsage(used, model);
    return { text, tokensUsed: used, model };
  };
  const generateStructured = async <T>(opts: GenerateOptions): Promise<T> => {
    const out = await generate({ ...opts, json: true });
    const start = out.text.indexOf("{");
    const end = out.text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("malformed AI JSON output");
    return JSON.parse(out.text.slice(start, end + 1)) as T;
  };
  const embed = async (text: string): Promise<number[]> => {
    // Deterministic lightweight embedding (no network). 64-dim hashed vector.
    const dim = 64;
    const vec = new Array<number>(dim).fill(0);
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    for (const w of words) {
      let h = 0;
      for (let i = 0; i < w.length; i++) h = (h * 33 + w.charCodeAt(i)) >>> 0;
      vec[h % dim] = (vec[h % dim] ?? 0) + 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  };
  return {
    name: apiKey ? "openai-compatible" : "deterministic-local",
    generate,
    generateStructured,
    embed,
    trackUsage,
    usage: () => ({ tokens, estimatedCostUsd: cost }),
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < n; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) * (a[i] ?? 0);
    nb += (b[i] ?? 0) * (b[i] ?? 0);
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
