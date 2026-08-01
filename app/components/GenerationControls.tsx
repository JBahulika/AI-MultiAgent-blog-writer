"use client";

import type { Tone, WordCount } from "@/lib/samplePrd";

type Props = {
  tone: Tone;
  wordCount: WordCount;
  audience: string;
  seoKeywords: string;
  disabled?: boolean;
  onToneChange: (t: Tone) => void;
  onWordCountChange: (w: WordCount) => void;
  onAudienceChange: (a: string) => void;
  onSeoKeywordsChange: (k: string) => void;
  onSamplePrd: () => void;
};

const LENGTHS: { value: WordCount; label: string; hint: string }[] = [
  { value: 300, label: "Short", hint: "~300 words" },
  { value: 600, label: "Medium", hint: "~600 words" },
  { value: 1000, label: "Long", hint: "~1000 words" },
];

const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: "casual", label: "Casual", hint: "Friendly & readable" },
  { value: "technical", label: "Technical", hint: "Precise & detailed" },
];

function Segmented<T extends string | number>({
  label,
  hint,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </div>
      <div
        className={`grid gap-1.5 p-1 rounded-xl bg-slate-900/70 border border-slate-700/80 ${
          options.length === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`rounded-lg px-3 py-2.5 text-left transition-all disabled:opacity-50 ${
                active
                  ? "bg-slate-700/90 text-cyan-100 ring-1 ring-cyan-500/35 shadow-[inset_0_1px_0_rgba(103,232,249,0.12)]"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
              }`}
            >
              <span className="block text-sm font-medium leading-none">{opt.label}</span>
              <span
                className={`block text-[11px] mt-1 leading-none ${
                  active ? "text-cyan-200/70" : "text-slate-500"
                }`}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const fieldClass =
  "w-full bg-slate-900/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 px-3.5 py-2.5 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-colors disabled:opacity-50";

export function GenerationControls({
  tone,
  wordCount,
  audience,
  seoKeywords,
  disabled,
  onToneChange,
  onWordCountChange,
  onAudienceChange,
  onSeoKeywordsChange,
  onSamplePrd,
}: Props) {
  return (
    <div className="mb-5 text-left rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 md:p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Writing options</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shape tone, length, and who you&apos;re writing for.
          </p>
        </div>
        <button
          type="button"
          onClick={onSamplePrd}
          disabled={disabled}
          className="shrink-0 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-colors disabled:opacity-50"
        >
          Use sample PRD
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Segmented
          label="Tone"
          hint="How it should sound"
          options={TONES}
          value={tone}
          disabled={disabled}
          onChange={onToneChange}
        />
        <Segmented
          label="Length"
          hint="Target post size"
          options={LENGTHS}
          value={wordCount}
          disabled={disabled}
          onChange={onWordCountChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-200">Audience</span>
            <span className="text-xs text-slate-500">Who will read this?</span>
          </span>
          <input
            className={fieldClass}
            value={audience}
            disabled={disabled}
            placeholder="e.g. startup founders"
            onChange={(e) => onAudienceChange(e.target.value)}
          />
        </label>
        <label className="space-y-2 block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-200">SEO keywords</span>
            <span className="text-xs text-slate-500">Optional, comma-separated</span>
          </span>
          <input
            className={fieldClass}
            value={seoKeywords}
            disabled={disabled}
            placeholder="analytics dashboard, MRR, SaaS"
            onChange={(e) => onSeoKeywordsChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
