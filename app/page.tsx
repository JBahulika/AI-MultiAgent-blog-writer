"use client";

import { useState } from "react";

export default function HomePage() {
  const [prdText, setPrdText] = useState("");
  const [extractionMessage, setExtractionMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  // Handle file upload (txt or pdf)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      // TXT file
      setExtractionMessage("Extracting from text file...");
      const text = await file.text();
      setPrdText(text);
      setExtractionMessage("Text extracted successfully!");
    } else if (file.type === "application/pdf") {
      // PDF file
      setExtractionMessage("Extracting from PDF...");

      // ✅ Only import pdf.js in the browser
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
      setExtractionMessage("Unsupported file type. Please upload a .txt or .pdf file.");
    }
  };

  // Handle the generate button
  const handleGenerate = async () => {
    if (!prdText.trim()) {
      alert("Please provide a PRD first!");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: prdText }),
      });

      if (!response.ok) {
        throw new Error("API request failed.");
      }

      // If your API streams output, handle it as text/event-stream:
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let data = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          data += decoder.decode(value, { stream: true });
          setResult(data);
        }
      } else {
        const json = await response.json();
        setResult(JSON.stringify(json, null, 2));
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Something went wrong. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-6">
          AI Multi-Agent Blog Writer
        </h1>

        {/* File Upload */}
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileUpload}
          className="block mb-4 w-full"
        />

        {extractionMessage && (
          <p className="text-blue-600 mb-4">{extractionMessage}</p>
        )}

        {/* PRD Textarea */}
        <textarea
          className="w-full border rounded-md p-3 mb-4"
          rows={8}
          placeholder="Paste or upload your PRD text here..."
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
        />

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Blog"}
        </button>

        {/* Output */}
        {result && (
          <div className="mt-6 p-4 border rounded bg-gray-100 whitespace-pre-wrap">
            {result}
          </div>
        )}
      </div>
    </main>
  );
}
