import { describe, it, expect, vi } from "vitest";
import { runPipeline, MAX_FACT_CHECK_ROUNDS } from "@/lib/pipeline";
import { DEFAULT_OPTIONS, type PipelineEvent } from "@/lib/agents/types";
import type { AskLLMFn } from "@/lib/llm";
import type { SearchFn } from "@/lib/search";
import { parseJsonLoose } from "@/lib/json";
import { SAMPLE_PRD } from "@/lib/samplePrd";

function usage() {
  return { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };
}

function llmOk(content: string) {
  return {
    content,
    usage: usage(),
    model: "mock-model",
    estimatedCostUsd: 0.0001,
  };
}

describe("parseJsonLoose", () => {
  it("parses fenced JSON", () => {
    const raw = '```json\n{"verdict":"PASS","issues":[]}\n```';
    expect(parseJsonLoose(raw)).toEqual({ verdict: "PASS", issues: [] });
  });

  it("repairs raw newlines inside JSON string values", () => {
    const raw = '{"title":"Hello\nWorld","paragraphs":["Line 1\nLine 2"]}';
    expect(parseJsonLoose(raw)).toEqual({
      title: "Hello\nWorld",
      paragraphs: ["Line 1\nLine 2"],
    });
  });
});

describe("runPipeline", () => {
  it("runs agents and returns a final post with a # title", async () => {
    const events: PipelineEvent[] = [];
    let factCheckCalls = 0;

    const askLLM: AskLLMFn = async ({ role }) => {
      if (role === "query-planner") {
        return llmOk(JSON.stringify({ queries: ["PulseBoard analytics SaaS"] }));
      }
      if (role === "researcher") {
        return llmOk(
          JSON.stringify({
            bullets: [
              "PulseBoard connects Stripe for MRR tracking",
              "Weekly digests email founders on Mondays",
              "Pro plan is $29/month",
            ],
            sources: [{ title: "Stripe docs", url: "https://stripe.com/docs" }],
          })
        );
      }
      if (role === "writer") {
        return llmOk(
          JSON.stringify({
            markdown:
              "Founders drown in dashboards. PulseBoard pulls Stripe MRR into one weekly digest.",
          })
        );
      }
      if (role === "fact-checker") {
        factCheckCalls += 1;
        return llmOk(JSON.stringify({ verdict: "PASS", issues: [] }));
      }
      if (role === "polisher") {
        return llmOk(
          JSON.stringify({
            title: "One Dashboard for Early-Stage MRR",
            markdown:
              "# One Dashboard for Early-Stage MRR\n\nFounders drown in dashboards. PulseBoard pulls Stripe MRR into one weekly digest.",
          })
        );
      }
      return llmOk("{}");
    };

    const search: SearchFn = async () => [
      {
        title: "Stripe billing",
        url: "https://stripe.com/docs",
        snippet: "Track recurring revenue with Stripe.",
      },
    ];

    const result = await runPipeline({
      prd: SAMPLE_PRD,
      options: DEFAULT_OPTIONS,
      deps: {
        askLLM,
        search,
        onEvent: (e) => events.push(e),
      },
    });

    expect(result.finalMarkdown.trim().startsWith("# ")).toBe(true);
    expect(result.totals.total_tokens).toBeGreaterThan(0);

    const agents = events.map((e) => e.agent);
    expect(agents).toContain("researcher");
    expect(agents).toContain("writer");
    expect(agents).toContain("fact-checker");
    expect(agents).toContain("polisher");

    const final = events.find((e) => e.isFinal);
    expect(final?.output?.startsWith("# ")).toBe(true);
    expect(factCheckCalls).toBe(1);

    const reviserSkipped = events.find(
      (e) => e.agent === "reviser" && e.status === "skipped"
    );
    expect(reviserSkipped).toBeTruthy();
  });

  it("revises up to MAX_FACT_CHECK_ROUNDS then stops", async () => {
    const events: PipelineEvent[] = [];
    let factCheckCalls = 0;
    let reviseCalls = 0;

    const askLLM: AskLLMFn = async ({ role }) => {
      if (role === "query-planner") {
        return llmOk(JSON.stringify({ queries: ["test product"] }));
      }
      if (role === "researcher") {
        return llmOk(
          JSON.stringify({
            bullets: ["Claim A", "Claim B"],
            sources: [{ title: "Src", url: "https://example.com" }],
          })
        );
      }
      if (role === "writer") {
        return llmOk(JSON.stringify({ markdown: "Draft with a shaky claim." }));
      }
      if (role === "fact-checker") {
        factCheckCalls += 1;
        return llmOk(
          JSON.stringify({
            verdict: "FAIL",
            issues: [`Unsupported claim round ${factCheckCalls}`],
          })
        );
      }
      if (role === "reviser") {
        reviseCalls += 1;
        return llmOk(JSON.stringify({ markdown: `Revised draft ${reviseCalls}` }));
      }
      if (role === "polisher") {
        return llmOk(
          JSON.stringify({
            title: "Final",
            markdown: "# Final Title\n\nPolished body.",
          })
        );
      }
      return llmOk("{}");
    };

    const search: SearchFn = async () => [
      { title: "Example", url: "https://example.com", snippet: "snippet" },
    ];

    const result = await runPipeline({
      prd: SAMPLE_PRD,
      options: { ...DEFAULT_OPTIONS, tone: "technical", wordCount: 300 },
      deps: {
        askLLM,
        search,
        onEvent: (e) => events.push(e),
      },
    });

    expect(reviseCalls).toBe(MAX_FACT_CHECK_ROUNDS);
    // Initial fail + after each revise + final check without revise = rounds + 1
    expect(factCheckCalls).toBe(MAX_FACT_CHECK_ROUNDS + 1);
    expect(result.finalMarkdown.startsWith("# ")).toBe(true);

    const revisionNeeded = events.filter(
      (e) => e.agent === "fact-checker" && e.status === "revision_needed"
    );
    expect(revisionNeeded.length).toBeGreaterThanOrEqual(MAX_FACT_CHECK_ROUNDS);
  });
});
