// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSupabase } from "../../lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function askOpenAI(prompt: string) {
  const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 800, });
  return res.choices[0].message?.content || "";
}

function sendUpdate(controller: ReadableStreamDefaultController, data: object) {
  try {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch (e) { console.error("Error sending update:", e); }
}

async function runAgent(params: { controller: ReadableStreamDefaultController, supabase: SupabaseClient, run_id: string, agentName: string, prompt: string, input: string, isFinal?: boolean }) {
  const { controller, supabase, run_id, agentName, prompt, input, isFinal = false } = params;
  sendUpdate(controller, { agent: agentName, status: 'working' });
  const output = await askOpenAI(prompt);
  supabase.from("agent_logs").insert([{ run_id, agent: agentName, input, output }]).then(({ error }) => { if (error) console.error(`Supabase log error for ${agentName}:`, error); });
  sendUpdate(controller, { agent: agentName, status: 'complete', output, isFinal });
  return output;
}

export async function POST(req: Request) {
  try {
    const { prd } = await req.json();
    if (!prd || typeof prd !== "string" || prd.trim().length < 20) {
      return NextResponse.json({ error: "Please provide a longer PRD." }, { status: 400 });
    }
    const supabase = getServerSupabase();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { data: runRow, error: runErr } = await supabase.from("agent_logs").insert([{ agent: "run_start", input: prd }]).select("run_id").single();
          if (runErr) throw runErr;
          const run_id = runRow.run_id as string;

          const researchNotes = await runAgent({ controller, supabase, run_id, agentName: 'researcher', prompt: `You are a Researcher. Extract 5–7 factual bullets from the PRD...\n\nPRD:\n${prd}`, input: prd });
          let draft = await runAgent({ controller, supabase, run_id, agentName: 'writer', prompt: `You are a Blog Writer. Write a 220–300 word blog post...\n\nBullets:\n${researchNotes}`, input: researchNotes });
          
          sendUpdate(controller, { agent: 'fact-checker', status: 'working' });
          const factCheckPrompt = `You are a Fact-Checker... If all claims are supported, reply exactly: PASS...\n\nBullets:\n${researchNotes}\n\nDraft:\n${draft}`;
          const checkOutput = await askOpenAI(factCheckPrompt);
          supabase.from("agent_logs").insert([{ run_id, agent: "fact_checker", input: `${researchNotes}\n\n${draft}`, output: checkOutput }]).then(({ error }) => { if (error) console.error('Supabase log error for fact-checker:', error) });
          
          if (!/^PASS\s*$/i.test(checkOutput.trim())) {
            sendUpdate(controller, { agent: 'fact-checker', status: 'revision_needed', output: checkOutput });
            const revisePrompt = `You are a Reviser... Issues found:\n${checkOutput}\n\nRevise the draft...\n\nBullets:\n${researchNotes}\n\nOriginal Draft:\n${draft}`;
            draft = await runAgent({ controller, supabase, run_id, agentName: 'reviser', prompt: revisePrompt, input: checkOutput });
          } else {
            sendUpdate(controller, { agent: 'fact-checker', status: 'complete', output: checkOutput });
          }

          await runAgent({ controller, supabase, run_id, agentName: 'polisher', prompt: `You are a Style-Polisher... Your first line must be a creative, SEO-friendly title starting with '# '...\n\nDraft:\n${draft}`, input: draft, isFinal: true });
          
          controller.close();
        } catch (err: any) {
           console.error("Streaming error:", err);
           sendUpdate(controller, { error: "Agent pipeline failed", details: err?.message || String(err) });
           controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (err: any) {
    console.error("Initial POST error:", err);
    return NextResponse.json({ error: "Failed to start generation", details: err?.message || String(err) }, { status: 500 });
  }
}