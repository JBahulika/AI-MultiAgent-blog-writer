# AI Multi-Agent Blog Writer

**Live Demo:** [https://ai-multi-agent-blog-writer.vercel.app](https://ai-multi-agent-blog-writer.vercel.app)

> **PRD → Research (Tavily) → Draft → Fact-Check ↺ → Polish → Publish-ready blog**

An end-to-end pipeline that turns a Product Requirements Document into a fact-checked blog post using specialized LLM agents, real web search, structured JSON I/O, and a transparent UI timeline.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Groq](https://img.shields.io/badge/LLM-Groq%20%2F%20OpenAI-orange)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38bdf8?logo=tailwindcss)

---

## Overview

Specialized agents run in sequence:

1. **Researcher** — plans search queries, calls **Tavily**, synthesizes sourced bullets (JSON).
2. **Writer** — drafts the post from research with tone / length / audience / SEO controls.
3. **Fact-Checker** — returns `{ verdict, issues[] }`; on FAIL, **Reviser** runs (max 2 rounds) then re-checks.
4. **Style-Polisher** — final voice pass with an SEO `# ` title.

Each step streams to the UI (expandable notes), logs to Supabase, and reports token usage / estimated cost.

---

## Demo flow

1. Paste a PRD (or click **Use sample PRD**) and set tone, length, audience, SEO keywords.
2. Pipeline runs: Research → Draft → Fact-Check (up to 2 revise rounds) → Polish.
3. Expand agent cards to inspect notes, sources, issues, and drafts.
4. Export via Download `.md`, Copy Markdown, Copy HTML, or Notion/Dev.to paste format.
5. Review token totals and estimated cost on the timeline / result panel.

---

## Architecture

```
PRD + controls
  → Researcher (+ Tavily)
  → Writer (strong model)
  → Fact-Checker (fast model) ↺ reviser ≤ 2
  → Polisher (strong model)
  → Final blog + exports
       ↘ agent_logs (Supabase) + SSE metrics
```

**Highlights**

- **Next.js 15 + React 19 + TypeScript** — App Router API routes + SSE streaming.
- **Groq-first LLMs** (OpenAI-compatible SDK), with OpenAI fallback. Fast model for research/fact-check; strong model for write/revise/polish.
- **Tavily** — real web search for researcher citations.
- **Structured JSON agent I/O** — no brittle free-text `PASS` regex.
- **Upstash Redis** rate limits when configured (in-memory fallback for local dev).
- **Supabase** — `agent_logs` for auditability and token/model fields.
- **Vitest** — pipeline fixture tests with mocked LLM + search.

---

## Tech stack

| Category | Tools |
|----------|--------|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS |
| Agents | `lib/pipeline.ts` + `lib/agents/*` |
| LLMs | Groq (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) or OpenAI |
| Search | Tavily |
| Database | Supabase Postgres (`agent_logs`) |
| Rate limits | Upstash Redis (optional) |
| Deploy | Vercel |
| Tests | Vitest |

---

## Setup

```bash
npm install
cp .env.example .env.local
# fill GROQ_API_KEY (or OPENAI_*), TAVILY_API_KEY, SUPABASE_*
npm run dev
```

### Required env

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` or `OPENAI_API_KEY` | LLM access |
| `TAVILY_API_KEY` | Optional — live web research (falls back to PRD-only) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Logging |

### Recommended env

| Variable | Purpose |
|----------|---------|
| `GROQ_MODEL_FAST` / `GROQ_MODEL_STRONG` | Per-role models |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable rate limits on Vercel |
| `GENERATE_API_SECRET` | Optional server-only header gate for `/api/generate` |
| `NEXT_PUBLIC_APP_URL` | Origin checks in production |

---

## Supabase schema (`agent_logs`)

```sql
create table if not exists agent_logs (
  id bigint generated always as identity primary key,
  run_id uuid default gen_random_uuid(),
  agent text not null,
  input text,
  output text,
  prompt_tokens int,
  completion_tokens int,
  model text,
  created_at timestamptz default now()
);

-- If the table already exists, add metrics columns:
alter table agent_logs add column if not exists prompt_tokens int;
alter table agent_logs add column if not exists completion_tokens int;
alter table agent_logs add column if not exists model text;
```

---

## Scripts

```bash
npm run dev      # local Next.js
npm run build    # production build
npm test         # Vitest pipeline tests
```

---

## Author

J Bahulika – Final-Year AIML Student · Data Science & ML Enthusiast  
Portfolio: https://jbahulika.github.io  
LinkedIn: https://www.linkedin.com/in/j-bahulika-8b8237207/

If you found this project useful, please star the repo on GitHub.
