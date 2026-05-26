"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/StaggerContainer";
import { FactorBars, fitScoreTextColor, type Fit } from "@/components/FitBreakdown";

type Job = {
  id: string; role: string; company: string; location: string;
  salary: string | null; link: string | null; description?: string;
  deadline?: string | null; fit: Fit;
};

export default function HunterPage() {
  return (
    <Suspense fallback={null}>
      <HunterInner />
    </Suspense>
  );
}

function HunterInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q")?.trim();
  const [query, setQuery] = useState(initialQ || "remote react frontend internship");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trace, setTrace] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Job | null>(null);
  const autoRanRef = useRef(false);

  const run = useCallback(async (q: string) => {
    setLoading(true);
    setJobs([]);
    setTrace([]);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      setJobs(json.jobs ?? []);
      setTrace(json.trace ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run once on first mount when ?q= is supplied (e.g. arriving from a nudge).
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!initialQ) return;
    autoRanRef.current = true;
    run(initialQ);
  }, [initialQ, run]);

  async function track(j: Job) {
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: j.role, company: j.company, location: j.location,
        fit_score: j.fit.score, link: j.link, status: "applied",
      }),
    });
    setSaved((s) => new Set(s).add(j.id));
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Pillar 1 · Job Hunter Agent</p>
        <h1 className="font-display text-3xl font-bold">Hunt jobs in plain English.</h1>
      </div>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(query)}
          placeholder='e.g. "ML internships in Dhaka open this month"'
          className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
        />
        <button onClick={() => run(query)} disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Agent working…" : "Hunt jobs →"}
        </button>
      </div>

      {/* agent trace — makes "agentic" visible */}
      {(loading || trace.length > 0) && (
        <div className="panel p-4">
          <p className="label mb-2">Agent trace</p>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            {trace.map((t, i) => (
              <span key={i} className="chip bg-secondary text-sky-400 animate-fade-up">{t}</span>
            ))}
            {loading && <span className="chip bg-secondary text-amber-400 animate-pulse-glow">thinking…</span>}
          </div>
        </div>
      )}

      <StaggerContainer className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <StaggerItem key={j.id}>
          <div className="panel animate-fade-up p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  onClick={() => setDetail(j)}
                  className="text-left font-display text-lg font-bold leading-tight hover:text-primary"
                >
                  {j.role}
                </button>
                <p className="text-sm text-muted-foreground">{j.company} · {j.location}</p>
                {j.salary && <p className="mt-1 text-xs text-muted-foreground">{j.salary}</p>}
              </div>
              <div className="text-right">
                <p className={`font-display text-3xl font-bold ${fitScoreTextColor(j.fit.score)}`}>{j.fit.score}</p>
                <p className="label">fit</p>
              </div>
            </div>

            <div className="mt-4">
              <FactorBars fit={j.fit} />
            </div>

            {j.fit.matchedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {j.fit.matchedSkills.slice(0, 5).map((s) => (
                  <span key={s} className="chip bg-emerald-400/10 text-emerald-400">✓ {s}</span>
                ))}
                {j.fit.missingSkills.slice(0, 3).map((s) => (
                  <span key={s} className="chip bg-rose-400/10 text-rose-400">✗ {s}</span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => track(j)}
                disabled={saved.has(j.id)}
                className="btn-ghost text-xs disabled:opacity-50"
              >
                {saved.has(j.id) ? "✓ Tracked" : "+ Track"}
              </button>
              <button onClick={() => setDetail(j)} className="btn-ghost text-xs">Details →</button>
              {j.link && (
                <a href={j.link} target="_blank" className="btn-ghost text-xs">Open ↗</a>
              )}
            </div>
          </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* job detail modal — full description + full fit breakdown */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div
            className="panel animate-fade-up my-8 w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">{detail.role}</h2>
                <p className="text-sm text-muted-foreground">{detail.company} · {detail.location}</p>
                {detail.salary && <p className="mt-1 text-xs text-muted-foreground">{detail.salary}</p>}
              </div>
              <div className="text-right">
                <p className={`font-display text-4xl font-bold ${fitScoreTextColor(detail.fit.score)}`}>
                  {detail.fit.score}
                </p>
                <p className="label">fit</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="label mb-2">Fit breakdown (computed, not stated)</p>
              <FactorBars fit={detail.fit} />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail.fit.explanation}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
              {detail.fit.matchedSkills.map((s) => (
                <span key={s} className="chip bg-emerald-400/10 text-emerald-400">✓ {s}</span>
              ))}
              {detail.fit.missingSkills.map((s) => (
                <span key={s} className="chip bg-rose-400/10 text-rose-400">✗ {s}</span>
              ))}
            </div>

            {detail.description && (
              <div className="mt-5">
                <p className="label mb-2">Full description</p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => track(detail)}
                disabled={saved.has(detail.id)}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {saved.has(detail.id) ? "✓ Tracked" : "+ Track this"}
              </button>
              {detail.link && (
                <a href={detail.link} target="_blank" className="btn-ghost text-xs">Open posting ↗</a>
              )}
              <button onClick={() => setDetail(null)} className="btn-ghost ml-auto text-xs">Close ✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FadeIn>
  );
}
