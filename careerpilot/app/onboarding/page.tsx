"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Edit3 } from "lucide-react";
import { CvUploader } from "@/components/CvUploader";
import { TopBar } from "@/components/TopBar";

type UploadResult = { fileName: string; chunks: number; sections: string[] };

const STEPS = ["Upload CV", "Confirm sections", "Start"];

export default function OnboardingPage() {
  const [mode, setMode] = useState<"choose" | "upload" | "done">("choose");
  const [result, setResult] = useState<UploadResult | null>(null);
  const step = result ? 2 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <div className="space-y-6">
          <div>
            <p className="font-semibold text-sm text-muted-foreground mb-2">First run · Onboarding</p>
            <h1 className="text-3xl font-bold">Ground CareerPilot in your CV.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              One upload — or one form — powers everything: job fit scores, the assistant, and your roadmap.
            </p>
          </div>

          {mode === "choose" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setMode("upload")}
                className="panel group flex flex-col items-center gap-3 p-8 text-center transition-all hover:border-primary/50 hover:-translate-y-0.5"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">Upload a CV</p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX &mdash; we parse, chunk, and embed it automatically.</p>
                </div>
              </button>
              <Link
                href="/profile/edit"
                className="panel group flex flex-col items-center gap-3 p-8 text-center transition-all hover:border-primary/50 hover:-translate-y-0.5"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                  <Edit3 className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">Build one here</p>
                  <p className="mt-1 text-sm text-muted-foreground">Fill in a form &mdash; same chunking and embedding pipeline.</p>
                </div>
              </Link>
            </div>
          )}

          {mode === "upload" && !result && (
            <div className="max-w-xl">
              <CvUploader onDone={(r) => { setResult(r); setMode("done"); }} />
              <p className="mt-3 text-xs text-muted-foreground">
                PDF or DOCX. We parse it into section-tagged chunks and embed them — nothing is shared.
              </p>
            </div>
          )}

          {mode === "upload" && (
            <button
              onClick={() => setMode("choose")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Choose a different option
            </button>
          )}

          {result && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium text-emerald-400">
                  ✓ Indexed <span className="font-mono">{result.fileName}</span> into {result.chunks} chunks
                </p>
                <p className="font-semibold text-sm text-muted-foreground mt-3 mb-2">Detected sections — do these look right?</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.sections.map((s) => (
                    <span key={s} className="bg-secondary text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Wrong or missing a section? Re-upload a cleaner CV — headings like &ldquo;Experience&rdquo;,
                  &ldquo;Education&rdquo;, &ldquo;Projects&rdquo;, &ldquo;Skills&rdquo; chunk best.{" "}
                  <button onClick={() => { setResult(null); setMode("choose"); }} className="text-primary hover:underline">
                    Upload again
                  </button>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Link href="/profile" className="bg-card border border-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 block">
                  <p className="font-bold text-sky-400">See your CV profile →</p>
                  <p className="mt-1 text-xs text-muted-foreground">Inspect the exact chunks the AI retrieves.</p>
                </Link>
                <Link href="/hunter" className="bg-card border border-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 block">
                  <p className="font-bold text-amber-400">Hunt jobs →</p>
                  <p className="mt-1 text-xs text-muted-foreground">Get fit-scored matches against your CV.</p>
                </Link>
                <Link href="/assistant" className="bg-card border border-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 block">
                  <p className="font-bold text-primary">Ask the assistant →</p>
                  <p className="mt-1 text-xs text-muted-foreground">Readiness, gaps, roadmap, cover letters.</p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
