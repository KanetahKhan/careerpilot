"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Route,
  Search,
  TrendingUp,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
  BadgeCheck,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { fitScoreTextColor } from "@/components/FitBreakdown";
import { getErrorMessage } from "@/lib/errors";

type SkillGapResult = {
  role: string;
  coverage: number;
  benchmarkSkills: string[];
  have: string[];
  missing: string[];
};

const SUGGESTED_ROLES = [
  "frontend engineer",
  "backend engineer",
  "full stack engineer",
  "data scientist",
  "devops engineer",
  "mobile engineer",
  "machine learning engineer",
  "swe intern",
];

const TEASERS = [
  { label: "React.js", icon: CheckCircle2, color: "text-primary" },
  { label: "TypeScript", icon: AlertTriangle, color: "text-muted-foreground" },
  { label: "AWS", icon: XCircle, color: "text-destructive" },
];

export default function SkillGapPage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [lastRole, setLastRole] = useState("");

  async function analyze(given?: string) {
    const target = (given ?? role).trim();
    if (!target) {
      setError("Enter a role title.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLastRole(target);
    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const missingSkills = result?.missing ?? [];
  const roadmapGoal = missingSkills.length > 0
    ? `Learn ${missingSkills.slice(0, 5).join(", ")}${missingSkills.length > 5 ? ` +${missingSkills.length - 5} more` : ""} for a ${lastRole} role`
    : "";

  return (
    <FadeIn>
      <div className="space-y-8 py-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Skill Gap
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              How does your CV stack up against a role? Pick a role and we compare your CV&apos;s
              skills against a benchmark profile — showing what you have and what you&apos;re
              missing, prioritized by importance.
            </p>
          </div>
          <TrendingUp size={56} strokeWidth={1.5} className="hidden shrink-0 text-primary/20 md:block" />
        </header>

        {/* Glass pill search */}
        <div className="glass-card flex items-center gap-2 rounded-full p-2 pl-6 transition-all focus-within:ring-4 focus-within:ring-primary/15">
          <Search size={20} className="shrink-0 text-primary" />
          <input
            id="skill-gap-role"
            aria-label="Role title"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder='e.g. "swe intern"'
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-lg text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <button
            onClick={() => analyze()}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-8 py-3 font-display font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Analyzing…" : "Analyze"}
            <TrendingUp size={18} />
          </button>
        </div>

        {/* Quick pick */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary-foreground/70">
            Quick pick:
          </span>
          {SUGGESTED_ROLES.map((r) => {
            const active = r === lastRole;
            return (
              <button
                key={r}
                onClick={() => { setRole(r); analyze(r); }}
                className={
                  active
                    ? "rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary transition-transform hover:scale-[1.03]"
                    : "rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-primary transition-all hover:scale-[1.03] hover:bg-accent"
                }
              >
                {r}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">⚠ {error}</p>}

        {loading && (
          <p className="animate-pulse-glow text-sm text-primary">
            Loading CV context → retrieving benchmark → comparing skills…
          </p>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <>
            <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-primary/20 bg-card/40 p-12 text-center shadow-[0_20px_40px_-18px_rgba(125,211,252,0.2)] backdrop-blur-md">
              <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative grid h-28 w-28 place-items-center">
                  <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-card shadow-xl">
                    <ArrowLeftRight size={36} className="text-primary" />
                  </div>
                </div>
                <div className="max-w-lg">
                  <h3 className="mb-2 font-display text-2xl font-bold text-foreground">
                    Compare your CV to any role.
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    Pick a role above or type your own — we&apos;ll score your skill coverage and
                    show exactly what to learn next.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {TEASERS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <span
                        key={t.label}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-4 py-2 text-sm font-bold text-secondary-foreground"
                      >
                        <Icon size={16} className={t.color} />
                        {t.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bento row */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card relative overflow-hidden rounded-3xl p-8 md:col-span-2">
                <div className="relative z-10">
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-primary">
                    Hot trend
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
                    Machine Learning Engineer
                  </h3>
                  <p className="mt-3 max-w-md text-muted-foreground">
                    PyTorch, NLP, and cloud architecture are in high demand — one of the most
                    sought-after paths right now. See how your CV measures up.
                  </p>
                  <button
                    onClick={() => { setRole("machine learning engineer"); analyze("machine learning engineer"); }}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-2 text-sm font-bold text-primary transition-transform hover:scale-[1.03]"
                  >
                    Explore gap analysis →
                  </button>
                </div>
                <Brain
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-8 -right-8 text-primary/5"
                  size={220}
                  strokeWidth={1.25}
                />
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-primary-foreground shadow-[0_24px_44px_-22px_rgba(0,102,134,0.5)]">
                <BadgeCheck size={36} className="mb-4" />
                <h3 className="font-display text-xl font-bold leading-tight">Pro Benchmark Data</h3>
                <p className="mt-2 text-sm text-white/85">
                  Role benchmarks are built from real hiring signals across top tech roles.
                </p>
                <Link
                  href="/profile"
                  className="mt-6 inline-flex rounded-full bg-background/20 px-5 py-2 text-xs font-bold backdrop-blur-md transition-colors hover:bg-background/30"
                >
                  How it works
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            <div className="panel animate-fade-up p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label">benchmark role</p>
                  <p className="font-display text-lg font-bold">{result.role}</p>
                </div>
                <div className="text-right">
                  <p className={`font-display text-5xl font-bold ${fitScoreTextColor(result.coverage)}`}>
                    {result.coverage}
                  </p>
                  <p className="text-xs text-muted-foreground">skill coverage</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {result.have.length > 0 && (
                <div className="panel animate-fade-up p-5">
                  <p className="label mb-2 flex items-center gap-1.5">
                    <span className="text-primary">✓</span>
                    Have ({result.have.length}/{result.benchmarkSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.have.map((s) => (
                      <span key={`have-${s}`} className="chip bg-primary/10 text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.missing.length > 0 && (
                <div className="panel animate-fade-up p-5">
                  <p className="label mb-2 flex items-center gap-1.5">
                    <span className="text-destructive">✗</span>
                    Missing — focus here ({result.missing.length}/{result.benchmarkSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.missing.map((s) => (
                      <span key={`missing-${s}`} className="chip bg-destructive/10 text-destructive">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {missingSkills.length > 0 && (
              <div className="panel animate-fade-up p-5">
                <p className="label mb-2">Close the gap</p>
                <p className="text-sm text-muted-foreground">
                  Want a plan to learn these skills? Build a structured week-by-week roadmap.
                </p>
                <Link
                  href={`/roadmap?goal=${encodeURIComponent(roadmapGoal)}`}
                  className="btn-primary mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Route size={14} />
                  Build roadmap →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
