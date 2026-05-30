"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { cn } from "@/lib/utils";

type RoadmapItem = { key: string; text: string };
type Week = {
  week: number;
  focus: string;
  actions: RoadmapItem[];
  milestone: RoadmapItem;
};
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

type ApplyResult = { goalsCreated: number; eventsCreated: number };

function weekProgress(w: Week, completed: Record<string, boolean>) {
  const total = w.actions.length;
  const done = w.actions.filter((a) => completed[a.key]).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function overallProgress(plan: Roadmap | null, completed: Record<string, boolean>) {
  if (!plan) return { done: 0, total: 0, percent: 0 };
  let done = 0;
  let total = 0;
  for (const w of plan.weeks) {
    total += w.actions.length;
    for (const a of w.actions) if (completed[a.key]) done++;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export default function RoadmapPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const [hydrating, setHydrating] = useState(true);

  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [applyError, setApplyError] = useState("");

  // Rehydrate on mount: load any active roadmap so a refresh keeps progress.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/roadmap/progress", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.roadmap) {
          setRoadmap(json.roadmap as Roadmap);
          setCompleted((json.completed ?? {}) as Record<string, boolean>);
          if (!goal) setGoal(json.roadmap.goal ?? "");
        }
      } catch {
        // best-effort — page still works without rehydration
      } finally {
        if (!cancelled) setHydrating(false);
      }

      // URL prefill: /roadmap?goal=… auto-generates a plan
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const prefilled = params.get("goal");
      if (prefilled) {
        setGoal(prefilled);
        generate(prefilled);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate(g?: string) {
    const target = (g ?? goal).trim();
    setLoading(true);
    setError("");
    setApplyResult(null);
    setApplyError("");
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate roadmap");
      setRoadmap(json.roadmap as Roadmap);
      setCompleted({});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function patchProgress(
    body: { itemKey: string; done: boolean } | { itemKeys: string[]; done: boolean }
  ) {
    const res = await fetch("/api/roadmap/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to save progress");
    return json as { completed: Record<string, boolean> };
  }

  async function toggleItem(key: string) {
    const next = !completed[key];
    // Optimistic update; reconcile with server response.
    setCompleted((prev) => ({ ...prev, [key]: next }));
    try {
      const json = await patchProgress({ itemKey: key, done: next });
      setCompleted(json.completed);
    } catch (e: any) {
      // Roll back on failure.
      setCompleted((prev) => {
        const copy = { ...prev };
        if (next) delete copy[key];
        else copy[key] = true;
        return copy;
      });
      setError(e.message);
    }
  }

  async function markWeekComplete(w: Week) {
    const keys = w.actions.map((a) => a.key);
    if (keys.length === 0) return;
    const prev = completed;
    const optimistic = { ...prev };
    for (const k of keys) optimistic[k] = true;
    setCompleted(optimistic);
    try {
      const json = await patchProgress({ itemKeys: keys, done: true });
      setCompleted(json.completed);
    } catch (e: any) {
      setCompleted(prev);
      setError(e.message);
    }
  }

  async function applyToTracker() {
    if (!roadmap || applying) return;
    setApplying(true);
    setApplyError("");
    setApplyResult(null);
    try {
      const res = await fetch("/api/roadmap/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add to tracker");
      setApplyResult({
        goalsCreated: json.goalsCreated ?? 0,
        eventsCreated: json.eventsCreated ?? 0,
      });
    } catch (e: any) {
      setApplyError(e.message);
    } finally {
      setApplying(false);
    }
  }

  const overall = useMemo(() => overallProgress(roadmap, completed), [roadmap, completed]);

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
        <button
          onClick={() => generate()}
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Planning…" : roadmap ? "Replace roadmap →" : "Build roadmap →"}
        </button>
      </div>

      {!roadmap && !loading && !hydrating && (
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

      {hydrating && !roadmap && (
        <p className="text-sm text-muted-foreground animate-pulse-glow">Restoring your roadmap…</p>
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
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
              <button
                type="button"
                onClick={applyToTracker}
                disabled={applying}
                aria-busy={applying || undefined}
                className="btn-primary shrink-0 px-3 py-2 text-xs disabled:opacity-50"
                title="Create to-dos and deadlines from this plan"
              >
                <CalendarPlus size={14} />
                {applying ? "Adding…" : "Add to my plan"}
              </button>
            </div>

            <ProgressBar percent={overall.percent} done={overall.done} total={overall.total} />

            {applyResult && (
              <p className="mt-3 text-sm text-emerald-400">
                ✓ Added {applyResult.goalsCreated} to-do{applyResult.goalsCreated === 1 ? "" : "s"} and{" "}
                {applyResult.eventsCreated} deadline{applyResult.eventsCreated === 1 ? "" : "s"} to your tracker.{" "}
                <Link href="/tracker" className="underline underline-offset-4 hover:text-emerald-300">
                  Open tracker →
                </Link>
              </p>
            )}
            {applyError && (
              <p className="mt-3 text-sm text-primary">⚠ {applyError}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roadmap.weeks.map((w) => {
              const wp = weekProgress(w, completed);
              const allDone = wp.total > 0 && wp.done === wp.total;
              return (
                <div key={w.week} className="panel animate-fade-up p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-lg font-bold">Week {w.week}</p>
                    <span className="label">
                      {wp.done}/{wp.total} done
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">{w.focus}</p>

                  <ProgressBar percent={wp.percent} compact />

                  <ul className="mt-3 space-y-1.5">
                    {w.actions.map((a) => {
                      const done = !!completed[a.key];
                      return (
                        <li key={a.key}>
                          <button
                            type="button"
                            onClick={() => toggleItem(a.key)}
                            className={cn(
                              "flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors",
                              done
                                ? "text-muted-foreground"
                                : "text-foreground hover:bg-secondary/40"
                            )}
                            aria-pressed={done}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                                done
                                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                                  : "border-border"
                              )}
                            >
                              {done && <Check size={10} />}
                            </span>
                            <span className={cn(done && "line-through")}>{a.text}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-2.5">
                    <span className="label text-emerald-400">milestone</span>
                    <p className="mt-0.5 text-sm text-foreground">{w.milestone.text}</p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => markWeekComplete(w)}
                      disabled={allDone || w.actions.length === 0}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-emerald-400/50 hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 size={11} />
                      {allDone ? "All done" : "Mark week complete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </FadeIn>
  );
}

function ProgressBar({
  percent,
  done,
  total,
  compact,
}: {
  percent: number;
  done?: number;
  total?: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      {!compact && (
        <div className="mb-1 flex items-baseline justify-between">
          <span className="label">overall progress</span>
          <span className="text-xs text-muted-foreground">
            {done ?? 0}/{total ?? 0} actions · <span className="font-mono text-foreground">{percent}%</span>
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
