"use client";
import { useState } from "react";

type Fit = {
  score: number; semantic: number; skills: number; seniority: number;
  education: number; location: number;
  matchedSkills: string[]; missingSkills: string[]; explanation: string;
};
type Job = {
  id: string; role: string; company: string; location: string;
  salary: string | null; link: string | null; fit: Fit;
};

function scoreColor(s: number) {
  if (s >= 75) return "text-mint";
  if (s >= 55) return "text-amber";
  return "text-signal";
}

export default function HunterPage() {
  const [query, setQuery] = useState("remote react frontend internship");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trace, setTrace] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function run() {
    setLoading(true);
    setJobs([]);
    setTrace([]);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      setJobs(json.jobs ?? []);
      setTrace(json.trace ?? []);
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

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.id} className="panel animate-fade-up p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold leading-tight">{j.role}</p>
                <p className="text-sm text-chalk-dim">{j.company} · {j.location}</p>
                {j.salary && <p className="mt-1 text-xs text-chalk-faint">{j.salary}</p>}
              </div>
              <div className="text-right">
                <p className={`font-display text-3xl font-bold ${scoreColor(j.fit.score)}`}>{j.fit.score}</p>
                <p className="label">fit</p>
              </div>
            </div>

            {/* breakdown bars */}
            <div className="mt-4 space-y-1.5">
              {([
                ["semantic", j.fit.semantic],
                ["skills", j.fit.skills],
                ["seniority", j.fit.seniority],
                ["education", j.fit.education],
                ["location", j.fit.location],
              ] as const).map(
                ([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-20 font-mono text-[10px] uppercase text-chalk-faint">{k}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full rounded-full bg-signal/70" style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-7 text-right font-mono text-[10px] text-chalk-dim">{v}</span>
                  </div>
                )
              )}
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
              {j.link && (
                <a href={j.link} target="_blank" className="btn-ghost text-xs">Open ↗</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
