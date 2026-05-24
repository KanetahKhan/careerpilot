"use client";
import { useState } from "react";

export function CvUploader({ onDone }: { onDone?: (r: any) => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setStatus("uploading");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setResult(json);
      setStatus("done");
      onDone?.(json);
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div className="panel p-6">
      <p className="label mb-3">Pillar 2 · RAG Core</p>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-600 bg-ink-900/40 px-6 py-10 text-center transition-colors hover:border-signal/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-signal/15 text-signal text-xl">↑</div>
        <div>
          <p className="font-medium text-chalk">Drop your CV or click to upload</p>
          <p className="text-sm text-chalk-faint">PDF or DOCX · chunked → embedded → pgvector</p>
        </div>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {status === "uploading" && (
        <p className="mt-4 text-sm text-amber animate-pulse-glow">
          Parsing → chunking by section → embedding with Gemini…
        </p>
      )}
      {status === "error" && <p className="mt-4 text-sm text-signal">⚠ {error}</p>}
      {status === "done" && result && (
        <div className="mt-4 animate-fade-up rounded-xl border border-mint/30 bg-mint/5 p-4">
          <p className="text-sm font-medium text-mint">
            ✓ Indexed <span className="font-mono">{result.fileName}</span>
          </p>
          <p className="mt-1 text-sm text-chalk-dim">
            {result.chunks} chunks across:{" "}
            {result.sections.map((s: string) => (
              <span key={s} className="chip mr-1 bg-ink-700 text-chalk-dim">
                {s}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
