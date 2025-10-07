"use client";

import { useState, useRef, useEffect } from "react";
import { createWorker } from 'tesseract.js';

// --- TYPE DEFINITIONS ---
interface BlogOutput {
  title: string;
  paragraphs: string[];
}
interface AgentStatus {
  status: 'pending' | 'working' | 'complete' | 'revision_needed';
  output?: string;
}
interface AgentUpdate {
  agent: string;
  status: 'working' | 'complete' | 'revision_needed';
  output?: string;
  isFinal?: boolean;
  error?: string;
  details?: string;
}

// --- SVG ICONS ---
const PlusIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SendIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const LinkedInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
const GithubIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;
const CloseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PendingIcon = () => <div className="w-4 h-4 rounded-full bg-slate-600 border border-slate-500 flex-shrink-0"></div>;
const SpinnerIcon = () => <div className="w-4 h-4 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin flex-shrink-0"></div>;
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-400 flex-shrink-0"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ErrorIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-400 flex-shrink-0"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;

// --- Component to format paragraphs with bold tags ---
const FormattedParagraph = ({ text }: { text: string }) => {
  const parts = text.split(/(\*.*?\*)/g);
  return (
    <p>
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*') ? (
          <strong key={i}>{part.slice(1, -1)}</strong>
        ) : (
          part
        )
      )}
    </p>
  );
};

// --- AGENT STATUS DISPLAY COMPONENT ---
const AGENT_SEQUENCE = ['researcher', 'writer', 'fact-checker', 'reviser', 'polisher'];
const AGENT_NAMES: { [key: string]: string } = { researcher: "Researcher", writer: "Writer", "fact-checker": "Fact-Checker", reviser: "Reviser", polisher: "Style-Polisher" };
const AgentStatusDisplay = ({ statuses }: { statuses: Record<string, AgentStatus> }) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700"><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{AGENT_SEQUENCE.map(agentKey => { const agent = statuses[agentKey]; if (!agent || (agentKey === 'reviser' && agent.status === 'pending')) { return null; } let icon, textColor = "text-gray-400"; switch (agent.status) { case 'working': icon = <SpinnerIcon />; textColor = "text-indigo-300"; break; case 'complete': icon = <CheckIcon />; textColor = "text-green-400"; break; case 'revision_needed': icon = <ErrorIcon />; textColor = "text-yellow-400"; break; default: icon = <PendingIcon />; } return (<div key={agentKey} className={`flex items-center space-x-3 animate-fade-in`}>{icon}<span className={`text-sm ${textColor} transition-colors duration-300`}>{AGENT_NAMES[agentKey]}</span></div>); })}</div></div>
);

export default function Home() {
  const [prd, setPrd] = useState("");
  const [blogOutput, setBlogOutput] = useState<BlogOutput | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const initialAgentStatuses: Record<string, AgentStatus> = { researcher: { status: 'pending' }, writer: { status: 'pending' }, 'fact-checker': { status: 'pending' }, reviser: { status: 'pending' }, polisher: { status: 'pending' }, };
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(initialAgentStatuses);

  useEffect(() => { if (textareaRef.current && !uploadedFile) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [prd, uploadedFile]);

  const resetState = () => { setBlogOutput(null); setError(""); setIsLoading(true); setAgentStatuses(initialAgentStatuses); setIsCopied(false); };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setUploadedFile(file); setError(""); setIsExtracting(true); setExtractionMessage("Processing file..."); setPrd("");
    try {
      let textContent = "";
      if (file.type.startsWith("image/")) {
        setExtractionMessage("Recognizing text...");
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(file);
        textContent = text;
        await worker.terminate();
      } else if (file.type === "application/pdf") {
        setExtractionMessage("Extracting from PDF...");
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textData = await page.getTextContent();
          textContent += textData.items.map((s: any) => s.str).join(" ") + "\n";
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setExtractionMessage("Extracting from Word doc...");
        const mammoth = (await import('mammoth')).default;
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        textContent = value;
      } else {
        setExtractionMessage("Reading file...");
        textContent = await file.text();
      }
      setPrd(textContent);
    } catch (e) { console.error(e); setError("Could not read file. Check format or permissions."); setUploadedFile(null); } finally { setIsExtracting(false); setExtractionMessage(""); }
  };

  const clearFile = () => { setUploadedFile(null); setPrd(""); };

  // --- UPDATED: Simplified to a single copy handler ---
  const handleCopy = () => {
    if (blogOutput) {
      const cleanText = `# ${blogOutput.title}\n\n${blogOutput.paragraphs.join('\n\n')}`.replace(/\*/g, '');
      navigator.clipboard.writeText(cleanText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  async function handleGenerate() {
    if (!prd.trim()) return;
    resetState();
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prd }), });
      if (!response.ok || !response.body) { throw new Error(`Server error: ${response.status} ${response.statusText}`); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", finalPostContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            if (jsonStr) {
              try {
                const update: AgentUpdate = JSON.parse(jsonStr);
                if (update.error) { throw new Error(update.details || update.error); }
                setAgentStatuses(prev => ({ ...prev, [update.agent]: { status: update.status, output: update.output } }));
                if (update.isFinal && update.output) { finalPostContent = update.output; }
              } catch (e) { console.error("Failed to parse stream data:", e); }
            }
          }
        }
      }
      if (!finalPostContent) { throw new Error("Generation finished, but no blog post was received."); }
      const contentLines = finalPostContent.split('\n').filter(Boolean);
      const rawTitle = contentLines.shift() || "Generated Blog Post";
      const title = rawTitle.replace(/^(#+\s*)/, '');
      setBlogOutput({ title, paragraphs: contentLines });
    } catch (err: any) { setError(err.message || "An unknown error occurred."); } finally { setIsLoading(false); }
  }

  // --- UPDATED: renderOutput now has a single copy button ---
  const renderOutput = () => {
    if (isLoading) return <AgentStatusDisplay statuses={agentStatuses} />;
    if (error) return <div className="bg-red-900/40 p-4 rounded-lg border border-red-700 text-red-300 whitespace-pre-wrap">{error}</div>;
    if (blogOutput) return (
      <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-fade-in blog-output-container">
        <button onClick={handleCopy} className="absolute top-4 right-4 bg-slate-700/50 hover:bg-slate-600/70 text-gray-300 font-medium py-1.5 px-3 rounded-lg text-sm flex items-center gap-2 transition-all">
          {isCopied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
        </button>
        <h2 className="text-2xl font-bold text-cyan-300 mb-4 pr-20">{blogOutput.title}</h2>
        <article className="prose prose-invert prose-p:text-gray-300 max-w-none text-left">
          {blogOutput.paragraphs.map((p, i) => <FormattedParagraph key={i} text={p} />)}
        </article>
      </div>
    );
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto text-center flex-grow">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 mt-12 title-animated-glow">What do you want to write today?</h1>
        <p className="text-lg text-gray-400 mb-12">From a PRD to a polished blog post in seconds.</p>
        <div className="prompt-textarea mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <input type="file" id="file-upload" className="hidden" accept=".txt,.pdf,.doc,.docx,image/*" onChange={handleFileUpload} />
            <label htmlFor="file-upload" className="h-8 w-8 rounded-full bg-gray-600/80 flex items-center justify-center text-gray-400 hover:bg-gray-500 transition-colors cursor-pointer"><PlusIcon /></label>
          </div>
          {isExtracting ? (
            <div className="flex items-center justify-center w-full pl-12 pr-12 min-h-[60px] text-gray-400">{extractionMessage}</div>
          ) : uploadedFile ? (
            <div className="flex items-center w-full pl-12 pr-12 min-h-[60px]">
              <div className="bg-slate-700/60 rounded-full px-3 py-1.5 flex items-center gap-2.5">
                <span className="text-sm font-medium text-gray-200 truncate">{uploadedFile.name}</span>
                <button onClick={clearFile} className="text-gray-400 hover:text-white transition-colors flex-shrink-0"><CloseIcon /></button>
              </div>
            </div>
          ) : (<textarea ref={textareaRef} value={prd} onChange={(e) => setPrd(e.target.value)} placeholder="Type, paste, or upload a document to start..." rows={1} disabled={isLoading} />)}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button onClick={handleGenerate} disabled={isLoading || isExtracting || !prd.trim()} className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-all"><SendIcon /></button>
          </div>
        </div>
        <div className="mt-12 w-full">{renderOutput()}</div>
      </div>
      <footer className="w-full max-w-3xl mx-auto text-center pt-20 pb-8">
        <div className="flex justify-center items-center gap-4 mb-2">
          <a href="https://www.linkedin.com/in/j-bahulika-8b8237207/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><LinkedInIcon /></a>
          <a href="https://github.com/JBahulika" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><GithubIcon /></a>
        </div>
        <p className="text-sm text-gray-500">MultiAgent blog writer Made by Bahulika</p>
      </footer>
    </div>
  );
}
