"use client";

import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { AgentTimeline, type AgentStatus } from "@/app/components/AgentTimeline";
import { GenerationControls } from "@/app/components/GenerationControls";
import { BlogResult } from "@/app/components/BlogResult";
import { SAMPLE_PRD, type Tone, type WordCount } from "@/lib/samplePrd";

interface BlogOutput {
  title: string;
  paragraphs: string[];
}

interface AgentUpdate {
  agent: string;
  status: AgentStatus["status"];
  output?: string;
  isFinal?: boolean;
  error?: string;
  details?: string;
  usage?: AgentStatus["usage"];
  round?: number;
  metrics?: { total_tokens: number; estimatedCostUsd: number };
}

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const initialAgentStatuses: Record<string, AgentStatus> = {
  researcher: { status: "pending" },
  writer: { status: "pending" },
  "fact-checker": { status: "pending" },
  reviser: { status: "pending" },
  polisher: { status: "pending" },
};

export default function Home() {
  const [prd, setPrd] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [wordCount, setWordCount] = useState<WordCount>(300);
  const [audience, setAudience] = useState("startup founders");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [blogOutput, setBlogOutput] = useState<BlogOutput | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [agentStatuses, setAgentStatuses] = useState(initialAgentStatuses);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prd, isExtracting]);

  const resetState = () => {
    setBlogOutput(null);
    setError("");
    setIsLoading(true);
    setAgentStatuses(initialAgentStatuses);
  };

  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  const ALLOWED_UPLOAD_TYPES = new Set([
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
  ]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large. Please upload a file under 8 MB.");
      return;
    }

    const extOk = /\.(txt|md|csv|pdf|docx|png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    const typeOk = ALLOWED_UPLOAD_TYPES.has(file.type) || file.type.startsWith("image/");
    const isLegacyDoc = /\.doc$/i.test(file.name) && !/\.docx$/i.test(file.name);

    if (isLegacyDoc) {
      setError("Old .doc files aren’t supported. Please save as .docx, PDF, or TXT and try again.");
      return;
    }
    if (!extOk && !typeOk) {
      setError("Unsupported file type. Use TXT, PDF, DOCX, or an image (PNG, JPG, WEBP, GIF).");
      return;
    }

    setError("");
    setIsExtracting(true);
    setExtractionMessage("Processing file...");
    setPrd("");
    try {
      let textContent = "";
      if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
        setExtractionMessage("Recognizing text from image...");
        const worker = await createWorker("eng");
        const {
          data: { text },
        } = await worker.recognize(file);
        textContent = text;
        await worker.terminate();
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        setExtractionMessage("Extracting text from PDF...");
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Could not read this PDF."
          );
        }
        textContent = typeof data.text === "string" ? data.text : "";
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        /\.docx$/i.test(file.name)
      ) {
        setExtractionMessage("Extracting text from Word doc...");
        const mammoth = (await import("mammoth")).default;
        const { value } = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        textContent = value;
      } else {
        setExtractionMessage("Reading text file...");
        textContent = await file.text();
      }
      if (!textContent.trim()) {
        throw new Error(
          "No text found in this file. Try another document, a clearer photo, or paste the PRD manually."
        );
      }
      if (textContent.length > 20_000) textContent = textContent.slice(0, 20_000);
      setPrd(textContent);
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : "Could not read file. Check format or permissions.";
      setError(message);
    } finally {
      setIsExtracting(false);
      setExtractionMessage("");
    }
  };

  async function handleGenerate() {
    if (!prd.trim()) return;
    if (prd.trim().length < 20) {
      setError(
        "PRD is too short. Paste a fuller product brief or click “Use sample PRD”."
      );
      return;
    }
    resetState();
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prd,
          tone,
          wordCount,
          audience,
          seoKeywords: seoKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      if (response.status === 429) {
        throw new Error("Rate limit hit — please wait a minute and try again.");
      }
      if (!response.ok || !response.body) {
        let serverMessage = `Server error: ${response.status}`;
        try {
          const data = await response.json();
          if (data?.error && typeof data.error === "string") serverMessage = data.error;
        } catch {
          /* ignore */
        }
        throw new Error(serverMessage);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPostContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.substring(6);
          if (!jsonStr) continue;
          let update: AgentUpdate;
          try {
            update = JSON.parse(jsonStr) as AgentUpdate;
          } catch {
            console.error("Failed to parse stream data");
            continue;
          }
          if (update.error) throw new Error(update.details || update.error);
          if (update.agent) {
            setAgentStatuses((prev) => ({
              ...prev,
              [update.agent]: {
                status: update.status,
                output: update.output,
                usage: update.usage,
                round: update.round,
              },
            }));
          }
          if (update.isFinal && update.output) finalPostContent = update.output;
        }
      }
      if (!finalPostContent) {
        throw new Error("Generation finished, but no blog post was received.");
      }
      const contentLines = finalPostContent.split("\n").filter(Boolean);
      const rawTitle = contentLines.shift() || "Generated Blog Post";
      const title = rawTitle.replace(/^(#+\s*)/, "");
      setBlogOutput({ title, paragraphs: contentLines });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const renderOutput = () => {
    if (isLoading) return <AgentTimeline statuses={agentStatuses} />;
    if (error) {
      return (
        <div className="bg-red-900/40 p-4 rounded-lg border border-red-700 text-red-300 whitespace-pre-wrap text-left">
          {error}
        </div>
      );
    }
    if (blogOutput) {
      return (
        <div className="space-y-4">
          <AgentTimeline statuses={agentStatuses} />
          <BlogResult blog={blogOutput} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto text-center flex-grow">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 mt-12 title-animated-glow">
          What do you want to write today?
        </h1>
        <p className="text-lg text-gray-400 mb-8">
          From a PRD to a researched, fact-checked blog post in seconds.
        </p>

        <GenerationControls
          tone={tone}
          wordCount={wordCount}
          audience={audience}
          seoKeywords={seoKeywords}
          disabled={isLoading || isExtracting}
          onToneChange={setTone}
          onWordCountChange={setWordCount}
          onAudienceChange={setAudience}
          onSeoKeywordsChange={setSeoKeywords}
          onSamplePrd={() => {
            setPrd(SAMPLE_PRD);
            setSeoKeywords("analytics dashboard, MRR, SaaS");
            setError("");
          }}
        />

        <div className="prompt-textarea mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".txt,.md,.csv,.pdf,.docx,image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-upload"
              title="Upload PDF, Word (.docx), image, or text file"
              className="h-8 w-8 rounded-full bg-gray-600/80 flex items-center justify-center text-gray-400 hover:bg-gray-500 transition-colors cursor-pointer"
            >
              <PlusIcon />
            </label>
          </div>
          {isExtracting ? (
            <div className="flex items-center justify-center w-full pl-12 pr-12 min-h-[60px] text-gray-400">
              {extractionMessage}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={prd}
              onChange={(e) => setPrd(e.target.value)}
              placeholder="Type or paste a PRD, or upload PDF / Word (.docx) / image / text…"
              rows={1}
              disabled={isLoading}
            />
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || isExtracting || !prd.trim()}
              className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-all"
            >
              <SendIcon />
            </button>
          </div>
        </div>
        <div className="mt-8 w-full">{renderOutput()}</div>
      </div>
      <footer className="w-full max-w-3xl mx-auto text-center pt-20 pb-8">
        <div className="flex justify-center items-center gap-4 mb-2">
          <a
            href="https://www.linkedin.com/in/j-bahulika-8b8237207/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <LinkedInIcon />
          </a>
          <a
            href="https://github.com/JBahulika"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <GithubIcon />
          </a>
        </div>
        <p className="text-sm text-gray-500">MultiAgent blog writer Made by Bahulika</p>
      </footer>
    </div>
  );
}
