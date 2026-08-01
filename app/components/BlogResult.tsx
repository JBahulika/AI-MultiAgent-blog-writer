"use client";

import { useState } from "react";
import {
  downloadMarkdown,
  slugifyTitle,
  toHtml,
  toMarkdown,
  toPasteFormat,
} from "@/lib/export";

type BlogOutput = { title: string; paragraphs: string[] };

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-400">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FormattedParagraph = ({ text }: { text: string }) => {
  const parts = text.split(/(\*.*?\*)/g);
  return (
    <p>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <strong key={i}>{part.slice(1, -1)}</strong>
        ) : (
          part
        )
      )}
    </p>
  );
};

const btn =
  "bg-slate-700/50 hover:bg-slate-600/70 text-gray-300 font-medium py-1.5 px-3 rounded-lg text-sm flex items-center gap-2 transition-all";

export function BlogResult({ blog }: { blog: BlogOutput }) {
  const [copied, setCopied] = useState<string | null>(null);

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    flash(key);
  };

  return (
    <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-fade-in blog-output-container">
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        <button
          type="button"
          className={btn}
          onClick={() =>
            downloadMarkdown(
              slugifyTitle(blog.title),
              toMarkdown(blog.title, blog.paragraphs)
            )
          }
        >
          Download .md
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => copy("md", toMarkdown(blog.title, blog.paragraphs))}
        >
          {copied === "md" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Markdown</>}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => copy("html", toHtml(blog.title, blog.paragraphs))}
        >
          {copied === "html" ? <><CheckIcon /> Copied</> : <><CopyIcon /> HTML</>}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => copy("paste", toPasteFormat(blog.title, blog.paragraphs))}
          title="Paste into Notion or Dev.to"
        >
          {copied === "paste" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Notion / Dev.to</>}
        </button>
      </div>
      <h2 className="text-2xl font-bold text-cyan-300 mb-4 text-left">{blog.title}</h2>
      <article className="prose prose-invert prose-p:text-gray-300 max-w-none text-left">
        {blog.paragraphs.map((p, i) => (
          <FormattedParagraph key={i} text={p} />
        ))}
      </article>
    </div>
  );
}
