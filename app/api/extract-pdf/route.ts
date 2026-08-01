import "@/lib/mathSumPrecisePolyfill";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20_000;
const MAX_PAGES = 50;

export async function POST(req: Request) {
  try {
    const limited = await checkRateLimit(getClientIp(req), "pdf");
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "PDF is too large (max 8 MB)." }, { status: 400 });
    }

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes, {
      // Quiet PDF.js warnings (missing Math APIs / font substitution noise)
      verbosity: 0,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pageCount = Math.min(pdf.numPages || 0, MAX_PAGES);
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = String(text)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);

    if (!merged) {
      return NextResponse.json(
        { error: "No text found in this PDF. It may be image-only/scanned." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: merged, pages: pageCount });
  } catch (err) {
    console.error("PDF extract error:", err);
    return NextResponse.json({ error: "Could not read this PDF." }, { status: 500 });
  }
}
