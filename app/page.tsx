"use client";

import { useState } from "react";

export default function HomePage() {
  const [prdText, setPrdText] = useState("");
  const [extractionMessage, setExtractionMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      setExtractionMessage("Extracting from text file...");
      const text = await file.text();
      setPrdText(text);
      setExtractionMessage("Text extracted successfully!");
    } else if (file.type === "application/pdf") {
      setExtractionMessage("Extracting from PDF...");

      // ✅ Make sure we only import pdfjs-dist in the browser
      if (typeof window !== "undefined") {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        const pdf = await pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
        }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }

        setPrdText(fullText);
        setExtractionMessage("PDF text extracted successfully!");
      }
    } else {
      setExtractionMessage("Unsupported file type.");
    }
  };

  const handleSubmit = async () => {
    if (!prdText.trim()) {
      alert("Please provide a PRD text first!");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: prdText }),
      });

      if (!response.ok) throw new Error("API error");

      // Here you could stream or handle the response
      const result = await response.json();
      console.log(result);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        AI Multi-Agent Blog Writer
      </h1>

      <input
        type="file"
        accept=".txt,.pdf"
        onChange={handleFileUpload}
        className="mb-4"
      />

      {extractionMessage && (
        <p className="text-blue-600">{extractionMessage}</p>
      )}

      <textarea
        className="w-full p-3 border rounded mt-4"
        rows={8}
        value={prdText}
        onChange={(e) => setPrdText(e.target.value)}
        placeholder="Paste your PRD text here..."
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Blog"}
      </button>
    </main>
  );
}
