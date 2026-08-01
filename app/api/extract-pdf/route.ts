import "@/lib/mathSumPrecisePolyfill";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  MAX_PDF_PAGES,
  MAX_PRD_LENGTH,
  MAX_UPLOAD_BYTES,
  truncatePrd,
} from "@/lib/prdLimits";

export const runtime = "nodejs";

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
      verbosity: 0,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const totalPages = pdf.numPages || 0;
    if (totalPages > MAX_PDF_PAGES) {
      return NextResponse.json(
        {
          error: `This PDF has ${totalPages} pages. Please upload a shorter brief (max ${MAX_PDF_PAGES} pages).`,
        },
        { status: 422 }
      );
    }

    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = String(text).replace(/\n{3,}/g, "\n\n").trim();
    const { text: merged, truncated } = truncatePrd(cleaned);

    if (!merged) {
      return NextResponse.json(
        { error: "No text found in this PDF. It may be image-only/scanned." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: merged,
      pages: pageCount,
      truncated,
      maxChars: MAX_PRD_LENGTH,
    });
  } catch (err) {
    console.error("PDF extract error:", err);
    return NextResponse.json({ error: "Could not read this PDF." }, { status: 500 });
  }
}
