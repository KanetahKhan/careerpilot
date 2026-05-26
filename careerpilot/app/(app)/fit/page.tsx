"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Copy, Check, AlertTriangle } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import {
  FactorBars,
  SkillChips,
  fitScoreTextColor,
  type Fit,
} from "@/components/FitBreakdown";

type Rewrite = { original: string; suggested: string; why: string };
type TailorResult = {
  rewrites: Rewrite[];
  gaps: string[];
  citedSections: string[];
};

export default function FitPage() {
  const [jd, setJd] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [scoredJd, setScoredJd] = useState<string>("");

  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailored, setTailored] = useState<TailorResult | null>(null);

  async function onScore() {
    if (!jd.trim() && !url.trim()) {
      setScoreError("Paste a job description or a URL.");
      return;
    }
    setScoring(true);
    setScoreError(null);
    setFit(null);
    setTailored(null);
    setTailorError(null);
    try {
      const res = await fetch("/api/fit/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: jd.trim() || undefined,
          url: url.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fit scoring failed");
      setFit(json.fit);
      // Keep the exact JD text the server used so /tailor scores the same job.
      setScoredJd(jd.trim() || json.jdPreview || "");
    } catch (e: any) {
      setScoreError(e.message);
    } finally {
      setScoring(false);
    }
  }

  async function onTailor() {
    const source = (jd.trim() || scoredJd).trim();
    if (!source) {
      setTailorError("Score a job first so we have the JD text.");
      return;
    }
    setTailoring(true);
    setTailorError(null);
    setTailored(null);
    try {
      const res = await fetch("/api/fit/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: source, location: location.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Tailoring failed");
      setTailored({
        rewrites: json.rewrites ?? [],
        gaps: json.gaps ?? [],
        citedSections: json.citedSections ?? [],
      });
    } catch (e: any) {
      setTailorError(e.message);
    } finally {
      setTailoring(false);
    }
  }

  return (
    <FadeIn>
      <div className="space-y-6 py-4">
        <div>
          <p className="label mb-2">Score any job</p>
          <h1 className="font-display text-3xl font-bold">Drop a JD. Get a real fit score.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The five factors are <span className="text-primary">computed in TypeScript</span> from your
            CV — semantic similarity, skill overlap, seniority, education, location. The LLM only
            extracts skill lists and writes the tailoring prose, strictly grounded in your CV.
          </p>
        </div>

        <div className="panel space-y-3 p-4">
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={8}
            placeholder="Paste a job description here…"
            className="w-full resize-y rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or a JD URL (optional)"
              className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Job location (optional, e.g. Remote · Dhaka)"
              className="rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60 sm:w-72"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onScore}
              disabled={scoring}
              aria-busy={scoring || undefined}
              className="btn-primary disabled:opacity-50"
            >
              {scoring ? "Scoring…" : "Score fit →"}
            </button>
            {scoreError && <p className="text-sm text-primary">⚠ {scoreError}</p>}
          </div>
        </div>

        {fit && (
          <div className="panel animate-fade-up space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label">computed fit</p>
                <p className={`font-display text-5xl font-bold ${fitScoreTextColor(fit.score)}`}>
                  {fit.score}
                </p>
                {fit.explanation && (
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    {fit.explanation}
                  </p>
                )}
              </div>
              <button
                onClick={onTailor}
                disabled={tailoring}
                aria-busy={tailoring || undefined}
                className="btn-primary shrink-0 px-3 py-2 text-xs disabled:opacity-50"
                title="Rewrite real CV bullets to target this job"
              >
                <Sparkles size={14} />
                {tailoring ? "Tailoring…" : "Tailor my CV to this job"}
              </button>
            </div>

            <div>
              <p className="label mb-2">Five-factor breakdown</p>
              <FactorBars fit={fit} />
            </div>

            {(fit.matchedSkills.length > 0 || fit.missingSkills.length > 0) && (
              <div className="space-y-2">
                <p className="label">Skills</p>
                <SkillChips matched={fit.matchedSkills} missing={fit.missingSkills} />
              </div>
            )}
          </div>
        )}

        {tailorError && <p className="text-sm text-primary">⚠ {tailorError}</p>}

        {tailored && (
          <div className="space-y-4">
            <div className="panel animate-fade-up p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <p className="label">Grounded rewrites</p>
                  <p className="text-sm text-muted-foreground">
                    Every suggestion below restates something already in your CV —
                    sharpened for this role, not invented.
                  </p>
                </div>
                {tailored.citedSections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="label mr-1">grounded in</span>
                    {tailored.citedSections.map((s) => (
                      <span key={s} className="chip bg-emerald-400/10 text-emerald-400">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {tailored.rewrites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to rewrite — your CV chunks didn&apos;t cover this job&apos;s asks. See gaps below.
                </p>
              ) : (
                <div className="space-y-3">
                  {tailored.rewrites.map((r, i) => (
                    <RewriteCard key={i} rewrite={r} />
                  ))}
                </div>
              )}
            </div>

            {tailored.gaps.length > 0 && (
              <div className="panel animate-fade-up p-5">
                <p className="label mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-400" />
                  Honest gaps (not in your CV)
                </p>
                <ul className="space-y-1.5">
                  {tailored.gaps.map((g, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-400">›</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Want a plan to close these?{" "}
                  <Link href="/roadmap" className="text-primary underline-offset-4 hover:underline">
                    Build a roadmap →
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FadeIn>
  );
}

function RewriteCard({ rewrite }: { rewrite: Rewrite }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(rewrite.suggested);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — older browsers without clipboard permission
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="label mb-1">Original</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {rewrite.original}
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="label">Suggested</p>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {rewrite.suggested}
          </p>
        </div>
      </div>
      {rewrite.why && (
        <p className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span className="text-emerald-400">why:</span> {rewrite.why}
        </p>
      )}
    </div>
  );
}
