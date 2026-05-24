"use client";
import { useState } from "react";

type Fit = {
  score: number; semantic: number; skills: number; seniority: number;
  education: number; location: number;
  matchedSkills: string[]; missingSkills: string[]; explanation: string;
};
type Job = {
  id: string; role: string; company: string; location: string;
  salary: string | null; link: string | null; description?: string;
  deadline?: string | null; fit: Fit;
};

function scoreColor(s: number) {
  if (s >= 75) return "text-mint";
  if (s >= 55) return "text-amber";
  return "text-signal";
}

const FACTORS = ["semantic", "skills", "seniority", "education", "location"] as const;

function FactorBars({ fit }: { fit: Fit }) {
  return (
    <div className="space-y-1.5">
      {FACTORS.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-20 font-mono text-[10px] uppercase text-chalk-faint">{k}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full bg-signal/70" style={{ width: `${fit[k]}%` }} />
          </div>
          <span className="w-7 text-right font-mono text-[10px] text-chalk-dim">{fit[k]}</span>
        </div>
      ))}
    </div>
  );
}

export default function HunterPage() {
  const [query, setQuery] = useState("remote react frontend internship");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trace, setTrace] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Job | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setJobs([]);
    setTrace([]);
    setNotice(null);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      setJobs(json.jobs ?? []);
      setTrace(json.trace ?? []);
      setNotice(json.error ?? null);
    } catch {
      setNotice("Couldn't reach the server — please try again.");
    } finally {
      setLoading(false);
    }
  }

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
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Pillar 1 · Job Hunter Agent</p>
        <h1 className="font-display text-3xl font-bold">Hunt jobs in plain English.</h1>
      </div>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder='e.g. "ML internships in Dhaka open this month"'
          className="flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 text-chalk outline-none placeholder:text-chalk-faint focus:border-signal/60"
        />
        <button onClick={run} disabled={loading} className="btn-signal disabled:opacity-50">
          {loading ? "Agent working…" : "Hunt jobs →"}
        </button>
      </div>

      {/* agent trace — makes "agentic" visible */}
      {(loading || trace.length > 0) && (
        <div className="panel p-4">
          <p className="label mb-2">Agent trace</p>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            {trace.map((t, i) => (
              <span key={i} className="chip bg-ink-700 text-sky animate-fade-up">{t}</span>
            ))}
            {loading && <span className="chip bg-ink-700 text-amber animate-pulse-glow">thinking…</span>}
          </div>
        </div>
      )}

      {notice && (
        <div className="panel flex items-center gap-2 border-l-2 border-amber/60 p-4 text-sm text-amber">
          <span aria-hidden>⏳</span>
          <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.id} className="panel animate-fade-up p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  onClick={() => setDetail(j)}
                  className="text-left font-display text-lg font-bold leading-tight hover:text-signal"
                >
                  {j.role}
                </button>
                <p className="text-sm text-chalk-dim">{j.company} · {j.location}</p>
                {j.salary && <p className="mt-1 text-xs text-chalk-faint">{j.salary}</p>}
              </div>
              <div className="text-right">
                <p className={`font-display text-3xl font-bold ${scoreColor(j.fit.score)}`}>{j.fit.score}</p>
                <p className="label">fit</p>
              </div>
            </div>

            <div className="mt-4">
              <FactorBars fit={j.fit} />
            </div>

            {j.fit.matchedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {j.fit.matchedSkills.slice(0, 5).map((s) => (
                  <span key={s} className="chip bg-mint/10 text-mint">✓ {s}</span>
                ))}
                {j.fit.missingSkills.slice(0, 3).map((s) => (
                  <span key={s} className="chip bg-signal/10 text-signal">✗ {s}</span>
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
        ))}
      </div>

      {/* job detail modal — full description + full fit breakdown */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/80 p-4 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div
            className="panel animate-fade-up my-8 w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">{detail.role}</h2>
                <p className="text-sm text-chalk-dim">{detail.company} · {detail.location}</p>
                {detail.salary && <p className="mt-1 text-xs text-chalk-faint">{detail.salary}</p>}
              </div>
              <div className="text-right">
                <p className={`font-display text-4xl font-bold ${scoreColor(detail.fit.score)}`}>
                  {detail.fit.score}
                </p>
                <p className="label">fit</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="label mb-2">Fit breakdown (computed, not stated)</p>
              <FactorBars fit={detail.fit} />
              <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{detail.fit.explanation}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
              {detail.fit.matchedSkills.map((s) => (
                <span key={s} className="chip bg-mint/10 text-mint">✓ {s}</span>
              ))}
              {detail.fit.missingSkills.map((s) => (
                <span key={s} className="chip bg-signal/10 text-signal">✗ {s}</span>
              ))}
            </div>

            {detail.description && (
              <div className="mt-5">
                <p className="label mb-2">Full description</p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-chalk-dim">
                  {detail.description}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => track(detail)}
                disabled={saved.has(detail.id)}
                className="btn-signal text-xs disabled:opacity-50"
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
  );
}
