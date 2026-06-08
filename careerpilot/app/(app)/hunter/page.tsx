"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Brain, Search, ListChecks, Gauge, Globe, Info, Zap, Download, Printer,
  CalendarClock, CheckCircle2, Clock as HistoryIcon,
  type LucideIcon,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/StaggerContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FactorBars, fitScoreTextColor, type Fit } from "@/components/FitBreakdown";
import { downloadCoverLetterDocx, printCoverLetter } from "@/lib/export/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { JobCard } from "@/components/jobs/JobCard";

type Job = {
  id: string; role: string; company: string; location: string;
  salary: string | null; link: string | null; description?: string;
  deadline?: string | null; employerLogo?: string; isMock?: boolean; fit: Fit;
};

type ApplyResult = {
  jobId: string;
  coverLetter: string | null;
  warning: string | null;
  event: { title: string; event_date: string; type: string } | null;
};

type TraceKind = "plan" | "search" | "found" | "score" | "web" | "note";
type TraceEvent = { kind: TraceKind; text: string };

const TRACE_STYLE: Record<TraceKind, { icon: LucideIcon; color: string }> = {
  plan: { icon: Brain, color: "text-primary" },
  search: { icon: Search, color: "text-primary" },
  found: { icon: ListChecks, color: "text-primary" },
  score: { icon: Gauge, color: "text-muted-foreground" },
  web: { icon: Globe, color: "text-primary" },
  note: { icon: Info, color: "text-muted-foreground" },
};

const HISTORY_KEY = "hunt:history";

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(query: string) {
  try {
    const h = loadHistory().filter((q) => q !== query);
    h.unshift(query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
  } catch { /* ignore */ }
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch { /* ignore */ }
}

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
  const [query, setQuery] = useState(initialQ || "");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const autoRanRef = useRef(false);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const run = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runIdRef.current;

    setLoading(true);
    setTrace([]);
    setSummary(null);
    setRunError(null);
    setJobs([]);
    setShowHistory(false);
    saveHistory(q.trim());
    setHistory(loadHistory());

    const cacheKey = `hunt:${q}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached && !controller.signal.aborted) setJobs(JSON.parse(cached));
    } catch { /* ignore */ }

    try {
      const res = await fetch("/api/jobs/search", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.body) {
        const json = await res.json();
        if (!controller.signal.aborted) {
          setJobs(json.jobs ?? []);
          setTrace((json.trace ?? []).map((text: string) => ({ kind: "note" as const, text })));
          if (json.error) setRunError(json.error);
        }
        if (json.jobs && !controller.signal.aborted) try { sessionStorage.setItem(cacheKey, JSON.stringify(json.jobs)); } catch { /* ignore */ }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) { reader.cancel(); break; }
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: any;
          try { evt = JSON.parse(line); } catch { continue; }
          if (controller.signal.aborted) break;
          if (evt.t === "trace") {
            setTrace((prev) => [...prev, { kind: evt.kind, text: evt.text }]);
          } else if (evt.t === "result") {
            setJobs(evt.jobs ?? []);
            if (evt.jobs) try { sessionStorage.setItem(cacheKey, JSON.stringify(evt.jobs)); } catch { /* ignore */ }
            if (evt.summary) setSummary(evt.summary);
          } else if (evt.t === "error") {
            setRunError(evt.error ?? "Search failed.");
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setRunError("Search failed.");
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, []);

  const debouncedQuery = useDebounce(query, 300);
  const hasChanged = useRef(false);

  useEffect(() => {
    if (!initialQ) return;
    try {
      const cached = sessionStorage.getItem(`hunt:${initialQ}`);
      if (cached) setJobs(JSON.parse(cached));
    } catch { /* ignore */ }
  }, [initialQ]);

  useEffect(() => {
    if (!hasChanged.current) {
      hasChanged.current = true;
      return;
    }
    if (debouncedQuery.length < 2) return;
    run(debouncedQuery);
  }, [debouncedQuery, run]);

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

  async function apply(j: Job) {
    if (applying || applied.has(j.id)) return;
    setApplying(j.id);
    setApplyResult(null);
    setDetail(j);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: j.role, company: j.company, location: j.location,
          description: j.description ?? "", link: j.link ?? undefined,
          fit_score: j.fit.score, deadline: j.deadline ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyResult({ jobId: j.id, coverLetter: null, warning: data.error ?? "Apply failed", event: null });
        return;
      }
      setApplied((s) => new Set(s).add(j.id));
      setSaved((s) => new Set(s).add(j.id));
      setApplyResult({
        jobId: j.id,
        coverLetter: data.coverLetter ?? null,
        warning: data.warning ?? null,
        event: data.event ?? null,
      });
    } catch {
      setApplyResult({ jobId: j.id, coverLetter: null, warning: "Apply failed.", event: null });
    } finally {
      setApplying(null);
    }
  }

  function snippet(text?: string, maxLen = 180): string {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Job Hunter"
        title="Search jobs like Google."
        subtitle="Describe what you want and the AI finds & ranks matches against your CV."
        icon={Search}
        gradient="from-primary via-primary to-primary/70"
      />

      <div className="panel p-4">
        <div className="relative flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              id="hunter-query"
              aria-label="Job search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => !loading && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && run(query)}
              placeholder='e.g. "React developer remote"'
              className="w-full rounded-xl border border-border bg-background/60 pl-9 pr-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            {showHistory && history.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-border bg-background shadow-lg">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Recent searches</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearHistory(); setHistory([]); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                {history.map((q, i) => (
                  <button
                    key={i}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50 last:rounded-b-xl"
                    onMouseDown={(e) => { e.preventDefault(); setQuery(q); run(q); }}
                  >
                    <HistoryIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => query.trim() && run(query)}
            disabled={loading || !query.trim()}
            aria-busy={loading || undefined}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {runError && (
        <div className="panel border-destructive/30 p-4 text-sm text-destructive">⚠ {runError}</div>
      )}

      {(loading || trace.length > 0) && (
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="label">Agent reasoning</span>
            {loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
                live
              </span>
            )}
          </div>
          <ol className="space-y-1.5">
            {trace.map((t, i) => {
              const { icon: Icon, color } = TRACE_STYLE[t.kind] ?? TRACE_STYLE.note;
              return (
                <li key={i} className="flex animate-fade-up items-start gap-2 text-xs leading-relaxed">
                  <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                  <span className="text-foreground/90">{t.text}</span>
                </li>
              );
            })}
            {loading && (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-muted-foreground" />
                <span className="animate-pulse-glow">working…</span>
              </li>
            )}
          </ol>
          {summary && (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm italic leading-relaxed text-muted-foreground">
              "{summary}"
            </p>
          )}
        </div>
      )}

      {!loading && jobs.length === 0 && trace.length === 0 && !runError && (
        <EmptyState
          icon={Search}
          title="Search for a job."
          description='Type your query above — the AI agent will search and score matches against your CV.'
          accent="text-primary"
          iconBg="bg-primary/10"
        />
      )}

      {loading && jobs.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
              </div>
              <div className="mt-auto pt-4 flex justify-between">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-7 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((j) => (
            <StaggerItem key={j.id} className="h-full">
              <div className="animate-fade-up h-full">
                <JobCard job={j} onDetail={(job) => setDetail(job)} />
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Detail modal */}
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
              <p className="label mb-2">Fit breakdown</p>
              <FactorBars fit={detail.fit} />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail.fit.explanation}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
              {detail.fit.matchedSkills.map((s) => (
                <span key={s} className="chip bg-primary/10 text-primary">✓ {s}</span>
              ))}
              {detail.fit.missingSkills.map((s) => (
                <span key={s} className="chip bg-destructive/10 text-destructive">✗ {s}</span>
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

            {applying === detail.id && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Zap size={15} className="animate-pulse-glow" /> Applying…
                </p>
              </div>
            )}

            {applyResult?.jobId === detail.id && applying !== detail.id && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <CheckCircle2 size={16} /> Applied
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-primary" /> Added to tracker
                  </li>
                  {applyResult.event && (
                    <li className="flex items-center gap-2">
                      <CalendarClock size={13} className="text-primary" />
                      {applyResult.event.type === "deadline" ? "Deadline" : "Follow-up"} on{" "}
                      <span className="text-foreground">{applyResult.event.event_date}</span>
                    </li>
                  )}
                </ul>
                {applyResult.coverLetter && (
                  <div className="mt-3">
                    <p className="label mb-1">Cover letter</p>
                    <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-3 font-sans text-xs leading-relaxed text-foreground/90">
{applyResult.coverLetter}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadCoverLetterDocx(applyResult.coverLetter!, { title: `Cover Letter — ${detail.role}`, filename: `cover-letter-${detail.company}.docx` })}
                        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                      >
                        <Download size={13} /> .docx
                      </button>
                      <button
                        onClick={() => printCoverLetter(applyResult.coverLetter!, { title: `Cover Letter — ${detail.role}` })}
                        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                      >
                        <Printer size={13} /> PDF
                      </button>
                    </div>
                  </div>
                )}
                {applyResult.warning && (
                  <p className="mt-2 text-xs text-destructive">⚠ {applyResult.warning}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => apply(detail)}
                disabled={applying === detail.id || applied.has(detail.id)}
                className="btn-primary inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
              >
                {applied.has(detail.id) ? (
                  <><CheckCircle2 size={14} /> Applied</>
                ) : applying === detail.id ? (
                  <><Zap size={14} className="animate-pulse-glow" /> Applying…</>
                ) : (
                  <><Zap size={14} /> Apply</>
                )}
              </button>
              <button
                onClick={() => track(detail)}
                disabled={saved.has(detail.id)}
                className="btn-ghost text-xs disabled:opacity-50"
              >
                {saved.has(detail.id) ? "Tracked" : "Track"}
              </button>
              {detail.link && (
                <a href={detail.link} target="_blank" className="btn-ghost text-xs">Open posting ↗</a>
              )}
              <button onClick={() => setDetail(null)} className="btn-ghost ml-auto text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FadeIn>
  );
}
