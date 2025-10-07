"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Dynamically import PdfExtractor so it only runs on the client
const PdfExtractor = dynamic(() => import("./components/PdfExtractor"), { ssr: false });

export default function HomePage() {
  const [prdText, setPrdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  // Handle Generate button click
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

      if (!response.ok) throw new Error("API request failed");

      // Handle streamed response if provided
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
      console.error("Error generating blog:", error);
      alert("Something went wrong. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          AI Multi-Agent Blog Writer
        </h1>

        {/* ✅ Client-only PDF Extractor */}
        <PdfExtractor onExtract={(text) => setPrdText(text)} />

        <textarea
          className="w-full border rounded p-3 mb-4"
          rows={8}
          placeholder="Paste or upload your PRD text here..."
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Blog"}
        </button>

        {result && (
          <div className="mt-6 p-4 border rounded bg-gray-100 whitespace-pre-wrap">
            {result}
          </div>
        )}
      </div>
    </main>
  );
}
