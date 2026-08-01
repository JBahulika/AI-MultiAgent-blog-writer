import OpenAI from "openai";

export type AgentRole =
  | "researcher"
  | "writer"
  | "fact-checker"
  | "reviser"
  | "polisher"
  | "query-planner";

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type LLMResult = {
  content: string;
  usage: TokenUsage;
  model: string;
  estimatedCostUsd: number;
};

type Provider = "groq" | "openai";

const FAST_ROLES = new Set<AgentRole>(["researcher", "fact-checker", "query-planner"]);

/** Rough USD per 1M tokens — approximate public list prices for estimation only. */
const PRICE_PER_1M: Record<Provider, { input: number; output: number }> = {
  groq: { input: 0.59, output: 0.79 },
  openai: { input: 0.15, output: 0.6 },
};

function estimateCost(provider: Provider, usage: TokenUsage): number {
  const rates = PRICE_PER_1M[provider];
  return (
    (usage.prompt_tokens / 1_000_000) * rates.input +
    (usage.completion_tokens / 1_000_000) * rates.output
  );
}

function getClientAndModel(role: AgentRole): {
  client: OpenAI;
  model: string;
  provider: Provider;
} {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const fast = process.env.GROQ_MODEL_FAST || "llama-3.1-8b-instant";
    const strong =
      process.env.GROQ_MODEL_STRONG ||
      process.env.GROQ_MODEL ||
      "llama-3.3-70b-versatile";
    return {
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: FAST_ROLES.has(role) ? fast : strong,
      provider: "groq",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("Missing GROQ_API_KEY or OPENAI_API_KEY");

  const fast = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";
  const strong = process.env.OPENAI_MODEL_STRONG || process.env.OPENAI_MODEL || "gpt-4o-mini";
  return {
    client: new OpenAI({ apiKey: openaiKey }),
    model: FAST_ROLES.has(role) ? fast : strong,
    provider: "openai",
  };
}

export async function askLLM(params: {
  role: AgentRole;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResult> {
  const { role, prompt, temperature = 0.4, maxTokens = 1200 } = params;
  const { client, model, provider } = getClientAndModel(role);

  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  });

  const usage: TokenUsage = {
    prompt_tokens: res.usage?.prompt_tokens ?? 0,
    completion_tokens: res.usage?.completion_tokens ?? 0,
    total_tokens: res.usage?.total_tokens ?? 0,
  };

  return {
    content: res.choices[0]?.message?.content || "",
    usage,
    model,
    estimatedCostUsd: estimateCost(provider, usage),
  };
}

/** Test seam — inject a mock askLLM in unit tests. */
export type AskLLMFn = typeof askLLM;
