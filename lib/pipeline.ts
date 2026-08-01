import type { SupabaseClient } from "@supabase/supabase-js";
import { askLLM as defaultAskLLM, type AskLLMFn } from "@/lib/llm";
import { getSearchFn, type SearchFn } from "@/lib/search";
import { runResearcher } from "@/lib/agents/researcher";
import { runWriter } from "@/lib/agents/writer";
import { runFactChecker } from "@/lib/agents/factChecker";
import { runReviser } from "@/lib/agents/reviser";
import { runPolisher } from "@/lib/agents/polisher";
import type {
  AgentUsage,
  GenerateOptions,
  PipelineEvent,
} from "@/lib/agents/types";

export const MAX_FACT_CHECK_ROUNDS = 2;

export type PipelineDeps = {
  askLLM?: AskLLMFn;
  search?: SearchFn;
  supabase?: SupabaseClient | null;
  onEvent: (event: PipelineEvent) => void;
};

function emptyUsage(): AgentUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    model: "",
    estimatedCostUsd: 0,
  };
}

function addUsage(a: AgentUsage, b: AgentUsage): AgentUsage {
  return {
    prompt_tokens: a.prompt_tokens + b.prompt_tokens,
    completion_tokens: a.completion_tokens + b.completion_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
    model: b.model || a.model,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

async function logAgent(
  supabase: SupabaseClient | null | undefined,
  run_id: string | undefined,
  agent: string,
  input: string,
  output: string,
  usage: AgentUsage
) {
  if (!supabase || !run_id) return;
  const row = {
    run_id,
    agent,
    input,
    output,
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    model: usage.model || null,
  };
  const { error } = await supabase.from("agent_logs").insert([row]);
  if (error) {
    // Older schemas may lack metrics columns — retry without them.
    const { error: fallbackErr } = await supabase
      .from("agent_logs")
      .insert([{ run_id, agent, input, output }]);
    if (fallbackErr) console.error(`Supabase log error for ${agent}:`, fallbackErr);
  }
}

export async function runPipeline(params: {
  prd: string;
  options: GenerateOptions;
  run_id?: string;
  deps: PipelineDeps;
}): Promise<{ finalMarkdown: string; totals: AgentUsage }> {
  const { prd, options, run_id, deps } = params;
  const askLLM = deps.askLLM ?? defaultAskLLM;
  const search = deps.search ?? getSearchFn();
  const { onEvent, supabase } = deps;

  let totals = emptyUsage();

  // --- Researcher ---
  onEvent({ agent: "researcher", status: "working" });
  const research = await runResearcher({ prd, askLLM, search });
  totals = addUsage(totals, research.usage);
  await logAgent(supabase, run_id, "researcher", prd, research.display, research.usage);
  onEvent({
    agent: "researcher",
    status: "complete",
    output: research.display,
    structured: research.data,
    usage: research.usage,
    metrics: {
      total_tokens: totals.total_tokens,
      estimatedCostUsd: totals.estimatedCostUsd,
    },
  });

  // --- Writer ---
  onEvent({ agent: "writer", status: "working" });
  const written = await runWriter({
    research: research.data,
    options,
    askLLM,
  });
  totals = addUsage(totals, written.usage);
  await logAgent(supabase, run_id, "writer", research.display, written.display, written.usage);
  onEvent({
    agent: "writer",
    status: "complete",
    output: written.display,
    structured: written.data,
    usage: written.usage,
    metrics: {
      total_tokens: totals.total_tokens,
      estimatedCostUsd: totals.estimatedCostUsd,
    },
  });

  let draft = written.data.markdown;
  let reviserRan = false;

  // --- Fact-check loop (max 2 revise rounds) ---
  for (let round = 1; round <= MAX_FACT_CHECK_ROUNDS + 1; round++) {
    onEvent({ agent: "fact-checker", status: "working", round });
    const check = await runFactChecker({
      research: research.data,
      draftMarkdown: draft,
      askLLM,
    });
    totals = addUsage(totals, check.usage);
    await logAgent(
      supabase,
      run_id,
      "fact_checker",
      draft,
      check.display,
      check.usage
    );

    if (check.data.verdict === "PASS") {
      onEvent({
        agent: "fact-checker",
        status: "complete",
        output: check.display,
        structured: check.data,
        usage: check.usage,
        round,
        metrics: {
          total_tokens: totals.total_tokens,
          estimatedCostUsd: totals.estimatedCostUsd,
        },
      });
      break;
    }

    onEvent({
      agent: "fact-checker",
      status: "revision_needed",
      output: check.display,
      structured: check.data,
      usage: check.usage,
      round,
      metrics: {
        total_tokens: totals.total_tokens,
        estimatedCostUsd: totals.estimatedCostUsd,
      },
    });

    const reviseRound = round;
    if (reviseRound > MAX_FACT_CHECK_ROUNDS) {
      onEvent({
        agent: "fact-checker",
        status: "complete",
        output: `Round ${round} reached — proceeding with the current draft.\n\n${check.display}`,
        structured: check.data,
        usage: check.usage,
        round,
        metrics: {
          total_tokens: totals.total_tokens,
          estimatedCostUsd: totals.estimatedCostUsd,
        },
      });
      break;
    }

    reviserRan = true;
    onEvent({ agent: "reviser", status: "working", round: reviseRound });
    const revised = await runReviser({
      research: research.data,
      draftMarkdown: draft,
      issues: check.data.issues,
      askLLM,
    });
    totals = addUsage(totals, revised.usage);
    draft = revised.data.markdown;
    await logAgent(
      supabase,
      run_id,
      "reviser",
      check.display,
      revised.display,
      revised.usage
    );
    onEvent({
      agent: "reviser",
      status: "complete",
      output: revised.display,
      structured: revised.data,
      usage: revised.usage,
      round: reviseRound,
      metrics: {
        total_tokens: totals.total_tokens,
        estimatedCostUsd: totals.estimatedCostUsd,
      },
    });
  }

  if (!reviserRan) {
    onEvent({ agent: "reviser", status: "skipped", output: "No revision needed." });
  }

  // --- Polisher ---
  onEvent({ agent: "polisher", status: "working" });
  const polished = await runPolisher({ draftMarkdown: draft, options, askLLM });
  totals = addUsage(totals, polished.usage);
  await logAgent(supabase, run_id, "polisher", draft, polished.display, polished.usage);
  onEvent({
    agent: "polisher",
    status: "complete",
    output: polished.display,
    structured: polished.data,
    usage: polished.usage,
    isFinal: true,
    metrics: {
      total_tokens: totals.total_tokens,
      estimatedCostUsd: totals.estimatedCostUsd,
    },
  });

  return { finalMarkdown: polished.display, totals };
}
