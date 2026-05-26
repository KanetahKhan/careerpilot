export type Fit = {
  score: number;
  semantic: number;
  skills: number;
  seniority: number;
  education: number;
  location: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation?: string;
};

const FACTORS = ["semantic", "skills", "seniority", "education", "location"] as const;

export function fitScoreColor(s: number): string {
  if (s >= 75) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (s >= 55) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-rose-400 bg-rose-400/10 border-rose-400/20";
}

export function fitScoreTextColor(s: number): string {
  return fitScoreColor(s).split(" ")[0];
}

export function FactorBars({ fit }: { fit: Fit }) {
  return (
    <div className="space-y-1.5">
      {FACTORS.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-20 font-mono text-[10px] uppercase text-muted-foreground">{k}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${fit[k]}%` }} />
          </div>
          <span className="w-7 text-right font-mono text-[10px] text-muted-foreground">{fit[k]}</span>
        </div>
      ))}
    </div>
  );
}

export function SkillChips({
  matched,
  missing,
  matchedLimit,
  missingLimit,
}: {
  matched: string[];
  missing: string[];
  matchedLimit?: number;
  missingLimit?: number;
}) {
  if (matched.length === 0 && missing.length === 0) return null;
  const m = typeof matchedLimit === "number" ? matched.slice(0, matchedLimit) : matched;
  const x = typeof missingLimit === "number" ? missing.slice(0, missingLimit) : missing;
  return (
    <div className="flex flex-wrap gap-1">
      {m.map((s) => (
        <span key={`m-${s}`} className="chip bg-emerald-400/10 text-emerald-400">
          ✓ {s}
        </span>
      ))}
      {x.map((s) => (
        <span key={`x-${s}`} className="chip bg-rose-400/10 text-rose-400">
          ✗ {s}
        </span>
      ))}
    </div>
  );
}
