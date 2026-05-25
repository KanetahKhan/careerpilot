"use client";
import { useState } from "react";
import { FadeIn } from "@/components/FadeIn";

type Week = { week: number; focus: string; actions: string[]; milestone: string };
type Roadmap = {
  goal: string;
  summary: string;
  weeks: Week[];
  citedSections: string[];
};

const SUGGESTIONS = [
  "Become job-ready for a React frontend role",
  "Prepare for a backend (Node + Postgres) internship",
  "Get ready for an ML/RAG engineer position",
];

export default function RoadmapPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState("");

  async function generate(g?: string) {
    const target = (g ?? goal).trim();
    setLoading(true);
    setError("");
    setRoadmap(null);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate roadmap");
      setRoadmap(json.roadmap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Pillar 3 · Roadmap</p>
        <h1 className="font-display text-3xl font-bold">A week-by-week plan, grounded in your CV.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          The plan targets your <span className="text-primary">real gaps</span> and builds on your
          real strengths — retrieved from your uploaded CV, not a generic template.
        </p>
      </div>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder='Your goal, e.g. "land a React frontend internship"'
          className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
        />
        <button onClick={() => generate()} disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Planning…" : "Build roadmap →"}
        </button>
      </div>

      {!roadmap && !loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setGoal(s);
                generate(s);
              }}
              className="chip bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-sm text-amber-400 animate-pulse-glow">
          Retrieving CV context → drafting a grounded plan…
        </p>
      )}
      {error && <p className="text-sm text-primary">⚠ {error}</p>}

      {roadmap && (
        <div className="space-y-5">
          <div className="panel animate-fade-up p-5">
            <p className="label mb-1">Goal</p>
            <p className="font-display text-lg font-bold">{roadmap.goal}</p>
            <p className="mt-2 text-sm text-muted-foreground">{roadmap.summary}</p>
            {roadmap.citedSections?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <span className="label mr-1">grounded in</span>
                {roadmap.citedSections.map((s) => (
                  <span key={s} className="chip bg-emerald-400/10 text-emerald-400">{s}</span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roadmap.weeks.map((w) => (
              <div key={w.week} className="panel animate-fade-up p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-bold">Week {w.week}</p>
                  <span className="label">{`${roadmap.weeks.length} wks`}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-primary">{w.focus}</p>
                <ul className="mt-3 space-y-1.5">
                  {w.actions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-sky-400">›</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-2.5">
                  <span className="label text-emerald-400">milestone</span>
                  <p className="mt-0.5 text-sm text-foreground">{w.milestone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </FadeIn>
  );
}
