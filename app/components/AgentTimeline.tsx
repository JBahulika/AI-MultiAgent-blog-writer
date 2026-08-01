"use client";

import { useState } from "react";

export type AgentStatus = {
  status: "pending" | "working" | "complete" | "revision_needed" | "skipped";
  output?: string;
  usage?: {
    total_tokens?: number;
    estimatedCostUsd?: number;
    model?: string;
  };
  round?: number;
};

const AGENT_SEQUENCE = ["researcher", "writer", "fact-checker", "reviser", "polisher"] as const;
const AGENT_NAMES: Record<string, string> = {
  researcher: "Researcher",
  writer: "Writer",
  "fact-checker": "Fact-Checker",
  reviser: "Reviser",
  polisher: "Style-Polisher",
};

const PendingIcon = () => (
  <div className="w-4 h-4 rounded-full bg-slate-600 border border-slate-500 flex-shrink-0" />
);
const SpinnerIcon = () => (
  <div className="w-4 h-4 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin flex-shrink-0" />
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-400 flex-shrink-0">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-sky-300 flex-shrink-0">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

function AgentCard({
  agentKey,
  agent,
}: {
  agentKey: string;
  agent: AgentStatus;
}) {
  const [open, setOpen] = useState(false);
  const hasOutput = Boolean(agent.output) && agent.status !== "pending";
  const canExpand =
    hasOutput &&
    (agent.status === "complete" ||
      agent.status === "revision_needed" ||
      agent.status === "skipped");

  let icon = <PendingIcon />;
  let textColor = "text-gray-400";
  let statusHint = "";

  if (agent.status === "working") {
    icon = <SpinnerIcon />;
    textColor = "text-indigo-300";
  } else if (agent.status === "complete" || agent.status === "skipped") {
    icon = <CheckIcon />;
    textColor = "text-green-400";
  } else if (agent.status === "revision_needed") {
    // Neutral — not an error. Pipeline is sending the draft to the reviser.
    icon = <InfoIcon />;
    textColor = "text-sky-300";
    statusHint = " — sending to reviser";
  }

  const roundLabel = agent.round ? ` · round ${agent.round}` : "";

  return (
    <div className="border-b border-slate-700/60 last:border-0 py-2">
      <button
        type="button"
        className={`w-full flex items-center justify-between gap-3 text-left ${canExpand ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => canExpand && setOpen((v) => !v)}
        disabled={!canExpand}
      >
        <span className="flex items-center gap-3 min-w-0">
          {icon}
          <span className={`text-sm ${textColor} truncate`}>
            {AGENT_NAMES[agentKey]}
            {roundLabel}
            {statusHint}
          </span>
        </span>
        {canExpand && (
          <span className="text-xs text-slate-500 shrink-0">{open ? "Hide" : "Show notes"}</span>
        )}
      </button>
      {open && agent.output && (
        <pre className="mt-2 ml-7 text-left text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
          {agent.output}
        </pre>
      )}
    </div>
  );
}

export function AgentTimeline({
  statuses,
}: {
  statuses: Record<string, AgentStatus>;
}) {
  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-fade-in">
      <div className="space-y-1">
        {AGENT_SEQUENCE.map((agentKey) => {
          const agent = statuses[agentKey];
          if (!agent) return null;
          if (agentKey === "reviser" && agent.status === "pending") return null;
          return <AgentCard key={agentKey} agentKey={agentKey} agent={agent} />;
        })}
      </div>
    </div>
  );
}
