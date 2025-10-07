"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Dynamically import the PDF extractor so it never runs on the server
const PdfExtractor = dynamic(() => import("./components/PdfExtractor"), { ssr: false });

export default function HomePage() {
  const [prdText, setPrdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    if (!prdText.trim()) {
      alert("Please provide a PRD first!");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: prdText }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
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
        const json = await res.json();
        setResult(JSON.stringify(json, null, 2));
      }
    } catch (err) {
      console.error(err);
      alert("Error generating blog.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-3xl font-bold mb-6 text-center">AI Multi-Agent Blog Writer</h1>

        {/* ✅ Client-only PDF extractor */}
        <PdfExtractor onExtract={(text) => setPrdText(text)} />

        <textarea
          className="w-full p-3 border rounded mb-4"
          rows={8}
          placeholder="Paste or upload your PRD here..."
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
