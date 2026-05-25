"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CvUploader } from "@/components/CvUploader";
import { TopBar } from "@/components/TopBar";

type UploadResult = { fileName: string; chunks: number; sections: string[] };

const STEPS = ["Upload CV", "Confirm sections", "Start"];

export default function OnboardingPage() {
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
              One upload powers everything: job fit scores, the assistant, and your roadmap.
            </p>
          </div>

          {/* step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                    i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
              </div>
            ))}
          </div>

          {!result && (
            <div className="max-w-xl">
              <CvUploader onDone={(r) => setResult(r)} />
              <p className="mt-3 text-xs text-muted-foreground">
                PDF or DOCX. We parse it into section-tagged chunks and embed them — nothing is shared.
              </p>
            </div>
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
                  <button onClick={() => setResult(null)} className="text-primary hover:underline">
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
