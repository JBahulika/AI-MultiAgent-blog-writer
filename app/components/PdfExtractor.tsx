"use client";

import { useState } from "react";

export default function PdfExtractor({ onExtract }: { onExtract: (text: string) => void }) {
  const [message, setMessage] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMessage("Please upload a PDF file.");
      return;
    }

    setMessage("Extracting from PDF...");

    // ✅ Import pdf.js here — only runs in browser
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
    }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((it: any) => it.str).join(" ") + "\n";
    }

    setMessage("PDF text extracted successfully!");
    onExtract(fullText);
  };

  return (
    <div className="mb-4">
      <input type="file" accept=".pdf" onChange={handleFile} />
      {message && <p className="text-blue-600 mt-2">{message}</p>}
    </div>
  );
}
