"use client";
import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

type Status = "idle" | "uploading" | "parsing" | "embedding" | "done" | "error";

type CvUploadResult = {
  ok: boolean;
  fileName: string;
  chunks: number;
  sections: string[];
};

export function CvUploader({ onDone }: { onDone?: (r: CvUploadResult) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CvUploadResult | null>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setStatus("uploading");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      setStatus("parsing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStatus("embedding");
      setResult(json);
      setStatus("done");
      onDone?.(json);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      if (/too large|max 2 MB|max 3 pages|memory/i.test(msg)) {
        setError(msg);
      } else {
        setError(msg || "Upload failed. Try a shorter CV (max 3 pages, 2 MB).");
      }
      setStatus("error");
    }
  }

  return (
    <div className="panel p-6">
      <p className="label mb-3">Pillar 2 · RAG Core</p>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary text-xl">↑</div>
        <div>
          <p className="font-medium text-foreground">Drop your CV or click to upload</p>
          <p className="text-sm text-muted-foreground">PDF or DOCX · chunked → embedded → pgvector</p>
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
        <p className="mt-4 text-sm text-muted-foreground animate-pulse-glow">
          Uploading file…
        </p>
      )}
      {status === "parsing" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse-glow">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Parsing CV and extracting text…
        </div>
      )}
      {status === "embedding" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse-glow">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Indexing your CV… (may take 10–30 seconds)
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Upload failed</p>
          <p>{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a shorter CV (max 3 pages, 2 MB) or a PDF without scanned images.
          </p>
        </div>
      )}
      {status === "done" && result && (
        <div className="mt-4 animate-fade-up rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">
            ✓ Indexed <span className="font-mono">{result.fileName}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.chunks} chunks across:{" "}
            {result.sections.map((s: string) => (
              <span key={s} className="chip mr-1 bg-secondary text-muted-foreground">
                {s}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
