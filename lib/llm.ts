import OpenAI from "openai";
import { parseJsonLoose } from "@/lib/json";

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

function emptyUsage(): TokenUsage {
  return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
}

function getClientAndModel(role: AgentRole): {
  client: OpenAI;
  model: string;
  provider: Provider;
} {
  const groqKey = process.env.GROQ_API_KEY?.trim();
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

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
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
  /** Force JSON object output when the provider supports it (Groq/OpenAI). */
  jsonMode?: boolean;
}): Promise<LLMResult> {
  const { role, prompt, temperature = 0.4, maxTokens = 1200, jsonMode = false } = params;
  const { client, model, provider } = getClientAndModel(role);

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
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
  } catch (err: unknown) {
    // Some models reject response_format — retry once without it
    if (jsonMode) {
      const message = err instanceof Error ? err.message : String(err);
      if (/response_format|json_object|not supported/i.test(message)) {
        return askLLM({ ...params, jsonMode: false });
      }
    }

    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status: unknown }).status)
        : undefined;
    const message = err instanceof Error ? err.message : String(err);

    if (status === 429 || /rate limit|credits remaining|insufficient.?quota|billing/i.test(message)) {
      throw new Error(`LLM_QUOTA: ${message}`);
    }
    if (status === 401 || status === 403 || /invalid.?api.?key|incorrect api key|authentication/i.test(message)) {
      throw new Error(`LLM_AUTH: ${message}`);
    }
    if (status === 404 || /model.?not.?found|decommissioned|does not exist/i.test(message)) {
      throw new Error(`LLM_MODEL: ${message}`);
    }
    throw new Error(`LLM_ERROR: ${message}`);
  }
}

/**
 * Ask for JSON, parse it, and retry once with a repair prompt if parsing fails.
 */
export async function askLLMJson<T>(params: {
  role: AgentRole;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ data: T; result: LLMResult }> {
  const first = await askLLM({ ...params, jsonMode: true });
  try {
    return { data: parseJsonLoose<T>(first.content), result: first };
  } catch {
    /* repair pass */
  }

  const repair = await askLLM({
    role: params.role,
    temperature: 0,
    maxTokens: params.maxTokens ?? 1200,
    jsonMode: true,
    prompt: `Convert the following text into valid JSON only. Do not add commentary.
The JSON must match the schema requested earlier.

Text:
${first.content.slice(0, 6000)}`,
  });

  const combined: LLMResult = {
    content: repair.content,
    model: repair.model,
    usage: {
      prompt_tokens: first.usage.prompt_tokens + repair.usage.prompt_tokens,
      completion_tokens: first.usage.completion_tokens + repair.usage.completion_tokens,
      total_tokens: first.usage.total_tokens + repair.usage.total_tokens,
    },
    estimatedCostUsd: first.estimatedCostUsd + repair.estimatedCostUsd,
  };

  return { data: parseJsonLoose<T>(repair.content), result: combined };
}

export type AskLLMFn = typeof askLLM;
export type AskLLMJsonFn = typeof askLLMJson;

export { emptyUsage };
