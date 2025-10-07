"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Load PdfExtractor only in browser to avoid bundling `canvas` on server
const PdfExtractor = dynamic(() => import("./components/PdfExtractor"), { ssr: false });

export default function Home() {
  const [prd, setPrd] = useState("");
  const [loading, setLoading] = useState(false);
  const [blogPost, setBlogPost] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setBlogPost("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlogPost(data.blogPost);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center px-4 py-12">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <h1 className="text-4xl font-extrabold text-indigo-700 text-center mb-6">
          Multi-Agent AI Blog Writer
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Paste your Product Requirements Document (PRD) below or upload a PDF to generate a polished blog post powered by AI.
        </p>

        {/* ✅ PDF Extractor */}
        <div className="mb-6">
          <PdfExtractor onExtract={(text) => setPrd(text)} />
        </div>

        {/* PRD Input */}
        <label htmlFor="prd" className="block text-sm font-medium text-gray-700 mb-2">
          Enter PRD:
        </label>
        <textarea
          id="prd"
          rows={10}
          value={prd}
          onChange={(e) => setPrd(e.target.value)}
          placeholder="Paste your PRD here..."
          className="w-full p-4 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700 placeholder-gray-400 transition"
        />

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prd.trim()}
          className={`mt-4 w-full py-3 rounded-xl font-semibold text-white transition ${
            loading || !prd.trim()
              ? "bg-indigo-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Generating..." : "Generate Blog Post"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 text-red-700 bg-red-100 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Output */}
        {blogPost && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Generated Blog Post</h2>
            <article className="prose max-w-none">
              {blogPost.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </article>
          </div>
        )}
      </div>
    </main>
  );
}
