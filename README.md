# 📝 AI Multi-Agent Blog Writer

🌐 **Live Demo:** [https://ai-multi-agent-blog-writer.vercel.app](https://ai-multi-agent-blog-writer.vercel.app)


> **PRD ➡ Research ➡ Draft ➡ Fact-Check ➡ Style-Polish ➡ Publish-Ready Blog**  
An **end-to-end production-grade pipeline** that uses **multiple AI agents** to transform a Product Requirements Document (PRD) into a **fact-checked, polished blog post** — deployed on **Vercel** with full logging and a clean, interactive UI.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-green?logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT4-412991?logo=openai)
![TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38bdf8?logo=tailwindcss)

---

## 🌟 Overview
The **AI Multi-Agent Blog Writer** demonstrates how an automated AI-powered content pipeline can be **scalable, auditable, and production-ready**.

Four specialized **LLM-powered agents** work in sequence:
1. **Researcher Agent** – fetches factual information, references, and citations.  
2. **Writer Agent** – generates a first draft blog using the PRD and research context.  
3. **Fact-Checker Agent** – validates every claim against the research material with an automated retry loop for inaccuracies.  
4. **Style-Polisher Agent** – adjusts tone, grammar, and clarity to produce a **publication-ready** article.

All steps and intermediate results are **logged to Supabase Postgres** and displayed on a **timeline dashboard** for transparency.

## 📸 Demo Flow
1)Paste a PRD(Product review document) → click Generate Blog
2)Pipeline runs: Research → Draft → Fact-Check (auto-retry) → Polish
3)View the Timeline Dashboard showing all intermediate steps and results
4)Inspect metrics such as fact-check passes and token usage
---

## ⚙️ Architecture

PRD → Researcher → Writer → Fact-Checker ↺ (retry if fail) → Style-Polisher → Final Blog

|______ Logs & Metrics → Supabase _________|


**Highlights**
- **Next.js 14 + TypeScript** – unified frontend + backend orchestration.
- **Supabase (Postgres)** – stores PRDs, drafts, logs, and metrics.
- **OpenAI GPT-4 / GPT-3.5-Turbo** – core LLMs for writing, fact-checking, and polishing.
- **TailwindCSS + React** – responsive, modern UI.
- **Vercel Deployment** – secure, scalable serverless environment.
- Environment variables configured for secure API key management.

---

## 🛠️ Tech Stack
| Category                 | Tools / Frameworks |
|--------------------------|--------------------|
| **Frontend & UI**        | Next.js 14, React 18, TypeScript 5, TailwindCSS |
| **Backend / Agents**     | Node.js 20, Next.js API Routes |
| **Database & Storage**   | Supabase (Postgres) |
| **LLM & NLP APIs**       | OpenAI GPT-4 / GPT-3.5-Turbo |
| **Search / Retrieval**   | Optional SerpAPI for web search |
| **Deployment**           | Vercel (Frontend + API Routes) |
| **Dev Tools**            | Git, GitHub, ESLint, Prettier |
| **Testing (optional)**   | Jest / Vitest for unit & pipeline tests |

---

## 👤 Author & Contact
J Bahulika – Final-Year AIML Student • Data Science & ML Enthusiast
🌐 Portfolio: https://jbahulika.github.io
💼 LinkedIn: https://www.linkedin.com/in/j-bahulika-8b8237207/
📧 Email: jbahulika@gmail.com

⭐ If you found this project insightful, please give it a star on GitHub!


