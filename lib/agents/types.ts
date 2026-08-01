export type Tone = "casual" | "technical";
export type WordCount = 300 | 600 | 1000;

export type GenerateOptions = {
  tone: Tone;
  wordCount: WordCount;
  audience: string;
  seoKeywords: string[];
};

export type ResearchSource = { title: string; url: string };

export type ResearcherOutput = {
  bullets: string[];
  sources: ResearchSource[];
};

export type DraftOutput = {
  title?: string;
  markdown: string;
};

export type FactCheckOutput = {
  verdict: "PASS" | "FAIL";
  issues: string[];
};

export type AgentUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  estimatedCostUsd: number;
};

export type PipelineEvent = {
  agent: string;
  status: "working" | "complete" | "revision_needed" | "skipped";
  output?: string;
  structured?: unknown;
  usage?: AgentUsage;
  round?: number;
  isFinal?: boolean;
  metrics?: {
    total_tokens: number;
    estimatedCostUsd: number;
  };
  error?: string;
  details?: string;
};

export const DEFAULT_OPTIONS: GenerateOptions = {
  tone: "casual",
  wordCount: 300,
  audience: "general readers",
  seoKeywords: [],
};

export function normalizeOptions(raw: unknown): GenerateOptions {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const tone: Tone = obj.tone === "technical" ? "technical" : "casual";
  const wc = Number(obj.wordCount);
  const wordCount: WordCount = wc === 600 || wc === 1000 ? wc : 300;
  const audience =
    typeof obj.audience === "string" && obj.audience.trim()
      ? obj.audience.trim().slice(0, 120)
      : "general readers";
  const seoKeywords = Array.isArray(obj.seoKeywords)
    ? obj.seoKeywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 8)
    : typeof obj.seoKeywords === "string"
      ? obj.seoKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

  return { tone, wordCount, audience, seoKeywords };
}
