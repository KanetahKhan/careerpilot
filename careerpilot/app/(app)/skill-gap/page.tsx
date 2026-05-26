"use client";

import { useState } from "react";
import Link from "next/link";
import { Route } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { fitScoreTextColor } from "@/components/FitBreakdown";

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
    } catch (e: any) {
      setError(e.message);
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
      <div className="space-y-6 py-4">
        <div>
          <p className="label mb-2">Pillar 3 · Skill Gap</p>
          <h1 className="font-display text-3xl font-bold">
            How does your CV stack up against a role?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick a role and we&apos;ll compare your CV&apos;s skills against a
            benchmark profile — showing exactly what you have and what you&apos;re
            missing, prioritized by importance.
          </p>
        </div>

        <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder='e.g. "swe intern"'
            className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
          <button
            onClick={() => analyze()}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  analyze(r);
                }}
                className="chip bg-secondary text-muted-foreground transition-colors hover:text-foreground"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-sm text-amber-400 animate-pulse-glow">
            Loading CV context → retrieving benchmark → comparing skills…
          </p>
        )}

        {error && <p className="text-sm text-primary">⚠ {error}</p>}

        {result && (
          <div className="space-y-5">
            <div className="panel animate-fade-up p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label">benchmark role</p>
                  <p className="font-display text-lg font-bold">{result.role}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-5xl font-bold ${fitScoreTextColor(result.coverage)}`}
                  >
                    {result.coverage}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    skill coverage
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {result.have.length > 0 && (
                <div className="panel animate-fade-up p-5">
                  <p className="label mb-2 flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    Have ({result.have.length}/{result.benchmarkSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.have.map((s) => (
                      <span
                        key={`have-${s}`}
                        className="chip bg-emerald-400/10 text-emerald-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.missing.length > 0 && (
                <div className="panel animate-fade-up p-5">
                  <p className="label mb-2 flex items-center gap-1.5">
                    <span className="text-rose-400">✗</span>
                    Missing — focus here ({result.missing.length}/{result.benchmarkSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.missing.map((s) => (
                      <span
                        key={`missing-${s}`}
                        className="chip bg-rose-400/10 text-rose-400"
                      >
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
                  Want a plan to learn these skills? Build a structured
                  week-by-week roadmap.
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
