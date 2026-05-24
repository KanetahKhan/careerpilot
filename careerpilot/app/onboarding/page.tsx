"use client";
import { useState } from "react";
import Link from "next/link";
import { CvUploader } from "@/components/CvUploader";

type UploadResult = { fileName: string; chunks: number; sections: string[] };

const STEPS = ["Upload CV", "Confirm sections", "Start"];

export default function OnboardingPage() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const step = result ? 2 : 0;

  return (
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">First run · Onboarding</p>
        <h1 className="font-display text-3xl font-bold">Ground CareerPilot in your CV.</h1>
        <p className="mt-2 max-w-xl text-sm text-chalk-dim">
          One upload powers everything: job fit scores, the assistant, and your roadmap.
        </p>
      </div>

      {/* step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                i <= step ? "bg-signal text-ink-900" : "bg-ink-700 text-chalk-faint"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${i <= step ? "text-chalk" : "text-chalk-faint"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-chalk-faint">→</span>}
          </div>
        ))}
      </div>

      {!result && (
        <div className="max-w-xl">
          <CvUploader onDone={(r) => setResult(r)} />
          <p className="mt-3 text-xs text-chalk-faint">
            PDF or DOCX. We parse it into section-tagged chunks and embed them — nothing is shared.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="panel animate-fade-up p-5">
            <p className="text-sm font-medium text-mint">
              ✓ Indexed <span className="font-mono">{result.fileName}</span> into {result.chunks} chunks
            </p>
            <p className="label mt-3 mb-2">Detected sections — do these look right?</p>
            <div className="flex flex-wrap gap-1.5">
              {result.sections.map((s) => (
                <span key={s} className="chip bg-ink-700 text-chalk-dim">{s}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-chalk-faint">
              Wrong or missing a section? Re-upload a cleaner CV — headings like “Experience”,
              “Education”, “Projects”, “Skills” chunk best.{" "}
              <button onClick={() => setResult(null)} className="text-signal hover:underline">
                Upload again
              </button>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/profile" className="panel p-4 transition-transform hover:-translate-y-0.5">
              <p className="font-display font-bold text-sky">See your CV profile →</p>
              <p className="mt-1 text-xs text-chalk-faint">Inspect the exact chunks the AI retrieves.</p>
            </Link>
            <Link href="/hunter" className="panel p-4 transition-transform hover:-translate-y-0.5">
              <p className="font-display font-bold text-amber">Hunt jobs →</p>
              <p className="mt-1 text-xs text-chalk-faint">Get fit-scored matches against your CV.</p>
            </Link>
            <Link href="/assistant" className="panel p-4 transition-transform hover:-translate-y-0.5">
              <p className="font-display font-bold text-signal">Ask the assistant →</p>
              <p className="mt-1 text-xs text-chalk-faint">Readiness, gaps, roadmap, cover letters.</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
