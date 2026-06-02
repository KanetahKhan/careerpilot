"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Search, ListChecks, Gauge, Globe, Info, Zap, Download, Printer, CalendarClock, CheckCircle2, type LucideIcon } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/StaggerContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FactorBars, fitScoreTextColor, type Fit } from "@/components/FitBreakdown";
import { downloadCoverLetterDocx, printCoverLetter } from "@/lib/export/client";
import { SearchHistory, type SearchHistoryHandle } from "@/components/SearchHistory";

type Job = {
  id: string; role: string; company: string; location: string;
  salary: string | null; link: string | null; description?: string;
  deadline?: string | null; fit: Fit;
};

type ApplyResult = {
  jobId: string;
  coverLetter: string | null;
  warning: string | null;
  event: { title: string; event_date: string; type: string } | null;
};

type TraceKind = "plan" | "search" | "found" | "score" | "web" | "note";
type TraceEvent = { kind: TraceKind; text: string };

// Icon + color per reasoning step, so the live narrative is scannable at a glance.
const TRACE_STYLE: Record<TraceKind, { icon: LucideIcon; color: string }> = {
  plan: { icon: Brain, color: "text-sky-400" },
  search: { icon: Search, color: "text-blue-400" },
  found: { icon: ListChecks, color: "text-emerald-400" },
  score: { icon: Gauge, color: "text-amber-400" },
  web: { icon: Globe, color: "text-violet-400" },
  note: { icon: Info, color: "text-muted-foreground" },
};

type SavedSearch = {
  id: number;
  label: string;
  query: string;
  location: string;
  last_run_at: string | null;
  created_at: string;
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
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const autoRanRef = useRef(false);
  const traceRef = useRef<HTMLOListElement | null>(null);
  const searchRef = useRef<SearchHistoryHandle>(null);

  // Keep the newest trace line in view while the agent is streaming.
  useEffect(() => {
    const el = traceRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trace.length]);

  const run = useCallback(async (q: string) => {
    setLoading(true);
    setJobs([]);
    setTrace([]);
    setSummary(null);
    setRunError(null);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ query: q }),
      });

      // Non-streaming fallback (shouldn't normally happen, but stay robust).
      if (!res.body) {
        const json = await res.json();
        setJobs(json.jobs ?? []);
        setTrace((json.trace ?? []).map((text: string) => ({ kind: "note" as const, text })));
        if (json.error) setRunError(json.error);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.t === "trace") {
            setTrace((prev) => [...prev, { kind: evt.kind, text: evt.text }]);
          } else if (evt.t === "result") {
            setJobs(evt.jobs ?? []);
            if (evt.summary) setSummary(evt.summary);
          } else if (evt.t === "error") {
            setRunError(evt.error ?? "Search failed — please try again.");
          }
        }
      }
    } catch {
      setRunError("Search failed — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run once on first mount when ?q= is supplied (e.g. arriving from a nudge).
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!initialQ) return;
    autoRanRef.current = true;
    searchRef.current?.addToHistory(initialQ);
    run(initialQ);
  }, [initialQ, run]);

  // Load saved searches on mount.
  useEffect(() => {
    fetch("/api/saved-searches")
      .then((r) => r.json())
      .then((d) => setSavedSearches(d.searches ?? []))
      .catch(() => {});
  }, []);

  async function saveSearch() {
    if (!query.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = await res.json();
      if (json.search) {
        setSavedSearches((prev) => [json.search, ...prev]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSearch(id: number) {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  async function runSaved(s: SavedSearch) {
    setRunningId(s.id);
    setCheckError(null);
    try {
      const res = await fetch(`/api/saved-searches/check?id=${s.id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check failed");
      // Refresh the saved search list so last_run_at updates
      const refresh = await fetch("/api/saved-searches").then((r) => r.json());
      setSavedSearches(refresh.searches ?? []);
      // Also run the search in the main UI so the user sees results
      run(s.query);
    } catch (e: any) {
      setCheckError(e.message);
    } finally {
      setRunningId(null);
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

  // One-click Apply: cover letter + tracker entry + calendar event in one call.
  async function apply(j: Job) {
    if (applying || applied.has(j.id)) return;
    setApplying(j.id);
    setApplyResult(null);
    setDetail(j); // surface the result in the detail modal
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
      setApplyResult({ jobId: j.id, coverLetter: null, warning: "Apply failed — please try again.", event: null });
    } finally {
      setApplying(null);
    }
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Pillar 1 · Job Hunter Agent"
        title="Hunt jobs in plain English."
        subtitle="Describe the role you want — the agent searches, scores, and ranks each match against your CV."
        icon={Search}
        gradient="from-sky-500 via-sky-500 to-cyan-500"
      />

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <SearchHistory
          ref={searchRef}
          value={query}
          onChange={setQuery}
          onSearch={run}
          placeholder='e.g. "ML internships in Dhaka open this month"'
        />
        <button
          onClick={() => {
            searchRef.current?.addToHistory(query);
            run(query);
          }}
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Agent working…" : "Hunt jobs →"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={saveSearch}
          disabled={saving || !query.trim()}
          className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save this search"}
        </button>
        {checkError && <p className="text-xs text-primary">⚠ {checkError}</p>}
      </div>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <div className="panel p-4">
          <p className="label mb-2">Saved searches</p>
          <div className="space-y-2">
            {savedSearches.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
                <span className="flex-1 truncate text-sm text-foreground">{s.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {s.last_run_at
                    ? new Date(s.last_run_at).toLocaleDateString()
                    : "never"}
                </span>
                <button
                  onClick={() => runSaved(s)}
                  disabled={runningId === s.id}
                  className="btn-ghost px-2 py-1 text-[10px] disabled:opacity-50"
                >
                  {runningId === s.id ? "Running…" : "Run now"}
                </button>
                <button
                  onClick={() => deleteSearch(s.id)}
                  className="btn-ghost px-2 py-1 text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {runError && (
        <div className="panel border-rose-400/30 p-4 text-sm text-rose-300">⚠ {runError}</div>
      )}

      {/* live agent reasoning — streams in step-by-step so the tool-loop is visible */}
      {(loading || trace.length > 0) && (
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="label">Agent reasoning</span>
            {loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
                live
              </span>
            )}
          </div>
          <ol ref={traceRef} className="max-h-72 space-y-1.5 overflow-y-auto pr-2">
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
              <li className="flex items-center gap-2 text-xs text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-amber-400" />
                <span className="animate-pulse-glow">working…</span>
              </li>
            )}
          </ol>
          {summary && (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm italic leading-relaxed text-muted-foreground">
              “{summary}”
            </p>
          )}
        </div>
      )}

      {!loading && jobs.length === 0 && trace.length === 0 && !runError && (
        <EmptyState
          icon={Search}
          title="Let's find your next role."
          description="Describe what you're looking for above — try “remote React internship” or “ML roles in Dhaka” — and the agent will search and score matches against your CV."
          accent="text-sky-500"
          iconBg="bg-sky-500/10"
        />
      )}

      {!loading && trace.length > 0 && jobs.length === 0 && !runError && (
        <div className="panel p-6 text-center">
          <p className="text-sm text-muted-foreground">
            The agent finished but no postings made it through — try a different or broader query.
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
          <h2 className="font-display text-xl font-bold text-foreground">
            {jobs.length} {jobs.length === 1 ? "match" : "matches"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Click a title to open the posting ↗
          </p>
        </div>
      )}

      <StaggerContainer className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <StaggerItem key={j.id}>
          <div className="panel card-hover animate-fade-up p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                {j.link ? (
                  <a
                    href={j.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline gap-1.5 text-left font-display text-lg font-bold leading-tight hover:text-primary"
                  >
                    {j.role}
                    <span aria-hidden="true" className="text-sm opacity-60">↗</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setDetail(j)}
                    className="text-left font-display text-lg font-bold leading-tight hover:text-primary"
                  >
                    {j.role}
                  </button>
                )}
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => apply(j)}
                disabled={applying === j.id || applied.has(j.id)}
                className="btn-primary inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
              >
                {applied.has(j.id) ? (
                  <><CheckCircle2 size={14} /> Applied</>
                ) : applying === j.id ? (
                  <><Zap size={14} className="animate-pulse-glow" /> Applying…</>
                ) : (
                  <><Zap size={14} /> 1-click apply</>
                )}
              </button>
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

            {/* One-click Apply — in-progress narrative */}
            {applying === detail.id && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Zap size={15} className="animate-pulse-glow" /> Applying…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drafting your CV-grounded cover letter, adding the role to your tracker, and dropping a date on your calendar.
                </p>
              </div>
            )}

            {/* One-click Apply — result */}
            {applyResult?.jobId === detail.id && applying !== detail.id && (
              <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 size={16} /> Applied — chained in one click
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" /> Added to your tracker as <span className="text-foreground">Applied</span>
                  </li>
                  {applyResult.event && (
                    <li className="flex items-center gap-2">
                      <CalendarClock size={13} className="text-sky-400" />
                      {applyResult.event.type === "deadline" ? "Deadline" : "Follow-up"} on{" "}
                      <span className="text-foreground">{applyResult.event.event_date}</span>
                    </li>
                  )}
                </ul>

                {applyResult.coverLetter && (
                  <div className="mt-3">
                    <p className="label mb-1">Tailored cover letter</p>
                    <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-3 font-sans text-xs leading-relaxed text-foreground/90">
{applyResult.coverLetter}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadCoverLetterDocx(applyResult.coverLetter!, { title: `Cover Letter — ${detail.role}`, filename: `cover-letter-${detail.company}.docx` })}
                        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                      >
                        <Download size={13} /> Download .docx
                      </button>
                      <button
                        onClick={() => printCoverLetter(applyResult.coverLetter!, { title: `Cover Letter — ${detail.role}` })}
                        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                      >
                        <Printer size={13} /> Save as PDF
                      </button>
                      <a href="/tracker" className="btn-ghost inline-flex items-center gap-1.5 text-xs">
                        View in tracker →
                      </a>
                    </div>
                  </div>
                )}

                {applyResult.warning && (
                  <p className="mt-2 text-xs text-amber-400">⚠ {applyResult.warning}</p>
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
                  <><Zap size={14} /> 1-click apply</>
                )}
              </button>
              <button
                onClick={() => track(detail)}
                disabled={saved.has(detail.id)}
                className="btn-ghost text-xs disabled:opacity-50"
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
