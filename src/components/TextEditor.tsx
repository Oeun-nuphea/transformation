"use client";

import { useState, useCallback } from "react";
import { generatePdf } from "@/lib/pdf";
import { generateDocx } from "@/lib/docx";
import { generateCsv } from "@/lib/csv";

type FileFormat = "pdf" | "docx" | "csv";

const FORMAT_CONFIG: Record<
  FileFormat,
  { label: string; icon: string; color: string }
> = {
  pdf: { label: "PDF", icon: "📄", color: "from-rose-500 to-red-600" },
  docx: { label: "DOCX", icon: "📝", color: "from-blue-500 to-indigo-600" },
  csv: { label: "CSV", icon: "📊", color: "from-emerald-500 to-teal-600" },
};

export default function TextEditor() {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("document");
  const [loadingFormat, setLoadingFormat] = useState<FileFormat | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleDownload = useCallback(
    async (format: FileFormat) => {
      if (!text.trim()) {
        showToast("Please enter some text before downloading.");
        return;
      }

      setLoadingFormat(format);

      try {
        // Small delay so spinner renders before sync work blocks the thread
        await new Promise((r) => setTimeout(r, 50));

        switch (format) {
          case "pdf":
            generatePdf(text, filename);
            break;
          case "docx":
            await generateDocx(text, filename);
            break;
          case "csv":
            generateCsv(text, filename);
            break;
        }

        showToast(`${FORMAT_CONFIG[format].label} downloaded!`);
      } catch (err) {
        console.error(err);
        showToast(`Failed to generate ${FORMAT_CONFIG[format].label}.`);
      } finally {
        setLoadingFormat(null);
      }
    },
    [text, filename, showToast]
  );

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text ? text.split("\n").length : 0;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
          Text Transformer
        </h1>
        <p className="text-white/50 text-sm">
          Convert your text into PDF, DOCX, or CSV — entirely in your browser.
        </p>
      </div>

      {/* ── Card ───────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
        {/* Filename input */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <label
            htmlFor="filename"
            className="text-xs uppercase tracking-widest text-white/40 font-semibold shrink-0"
          >
            Filename
          </label>
          <input
            id="filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value || "document")}
            placeholder="document"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
          />
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here…"
            rows={14}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm leading-relaxed text-white placeholder:text-white/20 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-mono"
          />
          {/* Stats bar */}
          <div className="flex gap-4 text-[11px] text-white/30 mt-1.5 px-1">
            <span>{charCount} chars</span>
            <span>{wordCount} words</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Download buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(FORMAT_CONFIG) as FileFormat[]).map((format) => {
            const { label, icon, color } = FORMAT_CONFIG[format];
            const isLoading = loadingFormat === format;
            const isDisabled = loadingFormat !== null;

            return (
              <button
                key={format}
                onClick={() => handleDownload(format)}
                disabled={isDisabled}
                className={`
                  relative overflow-hidden group
                  flex items-center justify-center gap-2
                  rounded-xl px-5 py-3.5 font-semibold text-sm text-white
                  bg-linear-to-r ${color}
                  shadow-lg shadow-black/20
                  transition-all duration-200
                  hover:scale-[1.03] hover:shadow-xl hover:brightness-110
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:pointer-events-none
                `}
              >
                {/* Shimmer overlay */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/15 to-transparent" />

                {isLoading ? (
                  <Spinner />
                ) : (
                  <span className="text-lg">{icon}</span>
                )}
                <span>Download as {label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-toast">
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 text-white text-sm px-5 py-3 rounded-full shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────── */
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
