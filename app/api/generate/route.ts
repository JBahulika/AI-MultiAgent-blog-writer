import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { runPipeline } from "@/lib/pipeline";
import { normalizeOptions, type PipelineEvent } from "@/lib/agents/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_PRD_LENGTH = 20;
const MAX_PRD_LENGTH = 20_000;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("host");
    if (host && originHost === host) return true;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (appUrl) {
      const allowed = appUrl.startsWith("http") ? new URL(appUrl).host : appUrl;
      if (originHost === allowed) return true;
    }
  } catch {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function sendUpdate(controller: ReadableStreamDefaultController, data: object) {
  try {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch (e) {
    console.error("Error sending update:", e);
  }
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const limited = await checkRateLimit(ip, "generate");
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const expectedSecret = process.env.GENERATE_API_SECRET;
    if (expectedSecret) {
      const provided = req.headers.get("x-api-secret");
      if (!provided || provided !== expectedSecret) return unauthorized();
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const prd = record.prd;

    if (!prd || typeof prd !== "string") {
      return NextResponse.json({ error: "Please provide a PRD string." }, { status: 400 });
    }

    const trimmed = prd.trim();
    if (trimmed.length < MIN_PRD_LENGTH) {
      return NextResponse.json(
        {
          error: `PRD is too short. Please provide at least ${MIN_PRD_LENGTH} characters (paste a fuller product brief or use Sample PRD).`,
        },
        { status: 400 }
      );
    }
    if (trimmed.length > MAX_PRD_LENGTH) {
      return NextResponse.json(
        { error: `PRD is too long. Maximum ${MAX_PRD_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing GROQ_API_KEY or OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const options = normalizeOptions(record);
    const supabase = getServerSupabase();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { data: runRow, error: runErr } = await supabase
            .from("agent_logs")
            .insert([{ agent: "run_start", input: trimmed }])
            .select("run_id")
            .single();
          if (runErr) throw runErr;
          const run_id = runRow.run_id as string;

          await runPipeline({
            prd: trimmed,
            options,
            run_id,
            deps: {
              supabase,
              onEvent: (event: PipelineEvent) => sendUpdate(controller, event),
            },
          });

          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          const message = err instanceof Error ? err.message : "Agent pipeline failed";
          sendUpdate(controller, { error: "Agent pipeline failed", details: message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Initial POST error:", err);
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 });
  }
}
